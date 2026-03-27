import 'dotenv/config';
import admin from 'firebase-admin';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') return value.toDate();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toInt(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function toFloat(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
}

function toJsonSafe(value) {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value?.toDate === 'function') {
    const d = value.toDate();
    return d instanceof Date ? d.toISOString() : null;
  }
  if (Array.isArray(value)) return value.map(toJsonSafe);
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      const mapped = toJsonSafe(v);
      if (mapped !== undefined) out[k] = mapped;
    }
    return out;
  }
  return value;
}

function getServiceAccountFromEnv() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (parsed.private_key) {
      parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    }
    return parsed;
  }

  const project_id = process.env.FIREBASE_PROJECT_ID;
  const private_key = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const client_email = process.env.FIREBASE_CLIENT_EMAIL;

  if (!project_id || !private_key || !client_email) {
    throw new Error('Missing Firebase credentials. Set FIREBASE_SERVICE_ACCOUNT or FIREBASE_PROJECT_ID/FIREBASE_PRIVATE_KEY/FIREBASE_CLIENT_EMAIL.');
  }

  return {
    project_id,
    private_key,
    client_email,
  };
}

function initFirestore() {
  if (admin.apps.length === 0) {
    const serviceAccount = getServiceAccountFromEnv();
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
  return admin.firestore();
}

function createSummaryRow() {
  return { sourceCollection: '', target: '', scanned: 0, upserted: 0, skipped: 0, errors: 0 };
}

async function ensureLegacyTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS legacy_firestore_documents (
      collection_name TEXT NOT NULL,
      document_id TEXT NOT NULL,
      payload JSONB NOT NULL,
      migrated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (collection_name, document_id)
    )
  `);
}

async function getCollectionMap(firestore) {
  const collections = await firestore.listCollections();
  const names = new Set(collections.map((c) => c.id));
  const map = new Map(collections.map((c) => [c.id, c]));
  return { names, map };
}

function pickCollection(candidates, names) {
  for (const c of candidates) {
    if (names.has(c)) return c;
  }
  return null;
}

async function migrateDocs({ firestore, collectionName, target, transformAndUpsert, summary }) {
  const row = createSummaryRow();
  row.sourceCollection = collectionName;
  row.target = target;

  const snap = await firestore.collection(collectionName).get();
  row.scanned = snap.size;

  for (const doc of snap.docs) {
    try {
      const data = doc.data() || {};
      const res = await transformAndUpsert(doc.id, data, doc);
      if (res === 'skip') row.skipped += 1;
      else row.upserted += 1;
    } catch (e) {
      row.errors += 1;
      console.error(`[${collectionName}] Failed doc ${doc.id}:`, e?.message || e);
    }
  }

  summary.push(row);
}

async function main() {
  const firestore = initFirestore();
  await ensureLegacyTable();

  const summary = [];
  const usedCollections = new Set();

  const { names } = await getCollectionMap(firestore);

  function choose(candidates) {
    const chosen = pickCollection(candidates, names);
    if (chosen) usedCollections.add(chosen);
    return chosen;
  }

  const accountsCollection = choose(['accounts']);
  if (accountsCollection) {
    await migrateDocs({
      firestore,
      collectionName: accountsCollection,
      target: 'accounts',
      summary,
      transformAndUpsert: async (id, data) => {
        const payload = {
          createdOn: toDate(data.createdOn ?? data.created_on),
          accessedOn: toDate(data.accessedOn ?? data.accessed_on),
          createdFromIp: data.createdFromIp ?? data.created_from_ip ?? null,
          lastAccessedFromIp: data.lastAccessedFromIp ?? data.last_accessed_from_ip ?? null,
          registered: Boolean(data.registered ?? false),
          accountType: String(data.accountType ?? data.account_type ?? 'guest'),
          name: data.name ?? null,
          location: data.location ?? null,
        };

        await prisma.account.upsert({
          where: { id },
          update: payload,
          create: { id, ...payload },
        });
      },
    });
  }

  const propertiesCollection = choose(['properties']);
  if (propertiesCollection) {
    await migrateDocs({
      firestore,
      collectionName: propertiesCollection,
      target: 'properties',
      summary,
      transformAndUpsert: async (id, data) => {
        const status = data.status ?? (data.isApproved === true ? 'approved' : data.isApproved === false ? 'pending' : null);
        const payload = {
          title: data.title ?? null,
          description: data.description ?? null,
          price: toInt(data.price),
          status: status ?? null,
          isFeatured: Boolean(data.isFeatured ?? false),
          createdAt: toDate(data.createdAt) ?? new Date(),
          updatedAt: toDate(data.updatedAt) ?? new Date(),
        };

        await prisma.property.upsert({
          where: { id },
          update: payload,
          create: { id, ...payload },
        });
      },
    });
  }

  const agenciesCollection = choose(['agencies']);
  if (agenciesCollection) {
    await migrateDocs({
      firestore,
      collectionName: agenciesCollection,
      target: 'agencies',
      summary,
      transformAndUpsert: async (id, data) => {
        const payload = {
          name: data.name ?? 'Unnamed Agency',
          description: data.description ?? null,
          contactEmail: data.contactEmail ?? data.contact?.email ?? null,
          contactPhone: data.contactPhone ?? data.contact?.phone ?? null,
          website: data.website ?? null,
          logoUrl: data.logoUrl ?? null,
          createdAt: toDate(data.createdAt) ?? new Date(),
          updatedAt: toDate(data.updatedAt) ?? new Date(),
        };

        await prisma.agency.upsert({
          where: { id },
          update: payload,
          create: { id, ...payload },
        });
      },
    });
  }

  const agentsCollection = choose(['agents']);
  if (agentsCollection) {
    await migrateDocs({
      firestore,
      collectionName: agentsCollection,
      target: 'agents',
      summary,
      transformAndUpsert: async (id, data) => {
        const payload = {
          name: data.name ?? 'Unnamed Agent',
          email: data.email ?? data.contact?.email ?? null,
          phone: data.phone ?? data.contact?.phone ?? null,
          agencyId: data.agencyId ?? data.agency?.id ?? null,
          bio: data.bio ?? data.about ?? null,
          avatarUrl: data.avatarUrl ?? data.photoUrl ?? null,
          createdAt: toDate(data.createdAt) ?? new Date(),
          updatedAt: toDate(data.updatedAt) ?? new Date(),
        };

        await prisma.agent.upsert({
          where: { id },
          update: payload,
          create: { id, ...payload },
        });
      },
    });
  }

  const teamCollection = choose(['team', 'teams']);
  if (teamCollection) {
    await migrateDocs({
      firestore,
      collectionName: teamCollection,
      target: 'teams',
      summary,
      transformAndUpsert: async (id, data) => {
        const payload = {
          name: data.name ?? 'Unnamed Team Member',
          description: data.description ?? data.about ?? null,
          imageUrl: data.imageUrl ?? data.photoUrl ?? null,
          position: toInt(data.position ?? data.order),
          createdAt: toDate(data.createdAt) ?? new Date(),
          updatedAt: toDate(data.updatedAt) ?? new Date(),
        };

        await prisma.team.upsert({
          where: { id },
          update: payload,
          create: { id, ...payload },
        });
      },
    });
  }

  const requirementsCollection = choose(['requirements']);
  if (requirementsCollection) {
    await migrateDocs({
      firestore,
      collectionName: requirementsCollection,
      target: 'requirements',
      summary,
      transformAndUpsert: async (id, data) => {
        const payload = {
          userId: data.userId ?? data.accountId ?? 'unknown',
          minBudget: toInt(data.minBudget),
          maxBudget: toInt(data.maxBudget),
          location: data.location ?? null,
          propertyType: toArray(data.propertyType),
          purpose: data.purpose ?? null,
          urgency: data.urgency ?? null,
          requiredTime: data.requiredTime ?? null,
          paymentMethod: toArray(data.paymentMethod),
          loan: Boolean(data.loan ?? false),
          createdAt: toDate(data.createdAt) ?? new Date(),
          updatedAt: toDate(data.updatedAt) ?? new Date(),
        };

        if (payload.userId === 'unknown') return 'skip';

        await prisma.requirement.upsert({
          where: { id },
          update: payload,
          create: { id, ...payload },
        });
      },
    });
  }

  const faqCollection = choose(['faqs', 'faq']);
  if (faqCollection) {
    await migrateDocs({
      firestore,
      collectionName: faqCollection,
      target: 'faqs',
      summary,
      transformAndUpsert: async (id, data) => {
        const payload = {
          question: data.question ?? '',
          answer: data.answer ?? '',
          category: data.category ?? 'General',
          createdAt: toDate(data.createdAt) ?? new Date(),
          updatedAt: toDate(data.updatedAt) ?? new Date(),
        };

        if (!payload.question || !payload.answer) return 'skip';

        await prisma.fAQ.upsert({
          where: { id },
          update: payload,
          create: { id, ...payload },
        });
      },
    });
  }

  const blogsCollection = choose(['blogs']);
  if (blogsCollection) {
    await migrateDocs({
      firestore,
      collectionName: blogsCollection,
      target: 'blogs',
      summary,
      transformAndUpsert: async (id, data) => {
        const authorId = data.authorId ?? null;
        if (!authorId) return 'skip';

        const authorExists = await prisma.account.findUnique({ where: { id: authorId }, select: { id: true } });
        if (!authorExists) return 'skip';

        const payload = {
          title: data.title ?? 'Untitled',
          slug: data.slug ?? `blog-${id}`,
          content: data.content ?? '',
          excerpt: data.excerpt ?? null,
          featuredImageUrl: data.featuredImageUrl ?? null,
          authorId,
          authorName: data.authorName ?? 'Unknown Author',
          authorAvatarUrl: data.authorAvatarUrl ?? null,
          tags: toArray(data.tags),
          status: data.status ?? 'draft',
          publishedAt: toDate(data.publishedAt),
          createdAt: toDate(data.createdAt) ?? new Date(),
          updatedAt: toDate(data.updatedAt) ?? new Date(),
        };

        await prisma.blog.upsert({
          where: { id },
          update: payload,
          create: { id, ...payload },
        });
      },
    });
  }

  const siteContentCollection = choose(['site_content', 'siteContent']);
  if (siteContentCollection) {
    await migrateDocs({
      firestore,
      collectionName: siteContentCollection,
      target: 'site_content',
      summary,
      transformAndUpsert: async (id, data) => {
        const key = data.key ?? id;
        let value;
        if (typeof data.value === 'string') {
          value = data.value;
        } else {
          value = JSON.stringify(data.value ?? data.content ?? data);
        }

        const payload = {
          key,
          value,
          section: data.section ?? null,
          createdAt: toDate(data.createdAt) ?? new Date(),
          updatedAt: toDate(data.updatedAt) ?? new Date(),
        };

        await prisma.siteContent.upsert({
          where: { key },
          update: payload,
          create: payload,
        });
      },
    });
  }

  const activitiesCollection = choose(['activities']);
  if (activitiesCollection) {
    await migrateDocs({
      firestore,
      collectionName: activitiesCollection,
      target: 'activities',
      summary,
      transformAndUpsert: async (id, data) => {
        const accountId = data.accountId ?? data.userId ?? data.tempAccountId ?? null;
        if (!accountId) return 'skip';

        const accountExists = await prisma.account.findUnique({ where: { id: accountId }, select: { id: true } });
        if (!accountExists) return 'skip';

        const payload = {
          accountId,
          activity: data.activity ?? data.type ?? 'page_view',
          page: data.page ?? data.path ?? null,
          propertyId: data.propertyId ?? null,
          activityOn: toDate(data.activityOn ?? data.createdAt ?? data.timestamp) ?? new Date(),
          duration: toInt(data.duration),
        };

        await prisma.activity.upsert({
          where: { id },
          update: payload,
          create: { id, ...payload },
        });
      },
    });
  }

  const preferencesCollection = choose(['user_preferences', 'userPreferences']);
  if (preferencesCollection) {
    await migrateDocs({
      firestore,
      collectionName: preferencesCollection,
      target: 'user_preferences',
      summary,
      transformAndUpsert: async (_id, data) => {
        const accountId = data.accountId ?? data.userId ?? null;
        if (!accountId) return 'skip';

        const accountExists = await prisma.account.findUnique({ where: { id: accountId }, select: { id: true } });
        if (!accountExists) return 'skip';

        const payload = {
          accountId,
          preferences: data.preferences ?? {},
          totalViews: toInt(data.totalViews) ?? 0,
          totalSaves: toInt(data.totalSaves) ?? 0,
          totalCalls: toInt(data.totalCalls) ?? 0,
          totalInquiries: toInt(data.totalInquiries) ?? 0,
          totalVisitRequests: toInt(data.totalVisitRequests) ?? 0,
          totalMortgageRequests: toInt(data.totalMortgageRequests) ?? 0,
          totalShares: toInt(data.totalShares) ?? 0,
          totalTimeSpentInSeconds: toInt(data.totalTimeSpentInSeconds) ?? 0,
          updatedAt: toDate(data.updatedAt) ?? new Date(),
        };

        await prisma.userPreference.upsert({
          where: { accountId },
          update: payload,
          create: payload,
        });
      },
    });
  }

  const propertyRequestsCollection = choose(['property_requests', 'propertyRequests']);
  if (propertyRequestsCollection) {
    await migrateDocs({
      firestore,
      collectionName: propertyRequestsCollection,
      target: 'property_requests',
      summary,
      transformAndUpsert: async (id, data) => {
        const payload = {
          name: data.name ?? 'Unknown',
          email: data.email ?? 'unknown@example.com',
          phone: data.phone ?? null,
          location: data.location ?? null,
          propertyType: data.propertyType ?? null,
          bedrooms: toInt(data.bedrooms),
          bathrooms: toInt(data.bathrooms),
          budget: toInt(data.budget),
          remarks: data.remarks ?? null,
          status: data.status ?? 'new',
          createdAt: toDate(data.createdAt) ?? new Date(),
          updatedAt: toDate(data.updatedAt) ?? new Date(),
        };

        await prisma.propertyRequest.upsert({
          where: { id },
          update: payload,
          create: { id, ...payload },
        });
      },
    });
  }

  const mortgageCollection = choose(['mortgage_requests', 'mortgageRequests']);
  if (mortgageCollection) {
    await migrateDocs({
      firestore,
      collectionName: mortgageCollection,
      target: 'mortgage_requests',
      summary,
      transformAndUpsert: async (id, data) => {
        const payload = {
          name: data.name ?? 'Unknown',
          email: data.email ?? 'unknown@example.com',
          phone: data.phone ?? '',
          address: data.address ?? '',
          age: toInt(data.age) ?? 0,
          income: toInt(data.income) ?? 0,
          moreDetails: data.moreDetails ?? null,
          contactMethods: toArray(data.contactMethods),
          status: data.status ?? 'new',
          createdAt: toDate(data.createdAt) ?? new Date(),
          updatedAt: toDate(data.updatedAt) ?? new Date(),
        };

        await prisma.mortgageRequest.upsert({
          where: { id },
          update: payload,
          create: { id, ...payload },
        });
      },
    });
  }

  const salesCollection = choose(['sales_requests', 'salesRequests']);
  if (salesCollection) {
    await migrateDocs({
      firestore,
      collectionName: salesCollection,
      target: 'sales_requests',
      summary,
      transformAndUpsert: async (id, data) => {
        const payload = {
          name: data.name ?? 'Unknown',
          email: data.email ?? 'unknown@example.com',
          phone: data.phone ?? '',
          propertyLocation: data.propertyLocation ?? data.location ?? '',
          propertyType: data.propertyType ?? '',
          remarks: data.remarks ?? null,
          status: data.status ?? 'new',
          createdAt: toDate(data.createdAt) ?? new Date(),
          updatedAt: toDate(data.updatedAt) ?? new Date(),
        };

        await prisma.salesRequest.upsert({
          where: { id },
          update: payload,
          create: { id, ...payload },
        });
      },
    });
  }

  const visitCollection = choose(['visit_requests', 'visitRequests']);
  if (visitCollection) {
    await migrateDocs({
      firestore,
      collectionName: visitCollection,
      target: 'visit_requests',
      summary,
      transformAndUpsert: async (id, data) => {
        const payload = {
          propertyId: data.propertyId ?? '',
          propertyTitle: data.propertyTitle ?? '',
          agentId: data.agentId ?? '',
          agentName: data.agentName ?? '',
          name: data.name ?? 'Unknown',
          email: data.email ?? 'unknown@example.com',
          phone: data.phone ?? null,
          preferredDate: data.preferredDate ?? '',
          preferredTime: data.preferredTime ?? null,
          status: data.status ?? 'new',
          createdAt: toDate(data.createdAt) ?? new Date(),
          updatedAt: toDate(data.updatedAt) ?? new Date(),
        };

        if (!payload.propertyId || !payload.agentId || !payload.preferredDate) return 'skip';

        await prisma.visitRequest.upsert({
          where: { id },
          update: payload,
          create: { id, ...payload },
        });
      },
    });
  }

  const problemsCollection = choose(['problems']);
  if (problemsCollection) {
    await migrateDocs({
      firestore,
      collectionName: problemsCollection,
      target: 'problems',
      summary,
      transformAndUpsert: async (id, data) => {
        const payload = {
          context: data.context ?? 'unknown',
          message: data.message ?? '',
          stack: data.stack ?? null,
          details: data.details ?? null,
          createdAt: toDate(data.createdAt) ?? new Date(),
        };

        if (!payload.message) return 'skip';

        await prisma.problem.upsert({
          where: { id },
          update: payload,
          create: { id, ...payload },
        });
      },
    });
  }

  const newsletterCollection = choose(['newsletter_subscriptions', 'newsletterSubscriptions']);
  if (newsletterCollection) {
    await migrateDocs({
      firestore,
      collectionName: newsletterCollection,
      target: 'newsletter_subscriptions',
      summary,
      transformAndUpsert: async (_id, data) => {
        const email = data.email ?? null;
        if (!email) return 'skip';

        const payload = {
          email,
          createdAt: toDate(data.createdAt) ?? new Date(),
        };

        await prisma.newsletterSubscription.upsert({
          where: { email },
          update: payload,
          create: payload,
        });
      },
    });
  }

  const sitemapCollection = choose(['sitemaps']);
  if (sitemapCollection) {
    await migrateDocs({
      firestore,
      collectionName: sitemapCollection,
      target: 'sitemaps',
      summary,
      transformAndUpsert: async (_id, data) => {
        const url = data.url ?? null;
        if (!url) return 'skip';

        const payload = {
          url,
          priority: toFloat(data.priority) ?? 0.5,
          frequency: data.frequency ?? 'weekly',
          lastmod: toDate(data.lastmod ?? data.lastChecked),
          updatedAt: new Date(),
        };

        await prisma.sitemapEntry.upsert({
          where: { url },
          update: payload,
          create: {
            ...payload,
            createdAt: toDate(data.createdAt) ?? new Date(),
          },
        });
      },
    });
  }

  const conversationsCollection = choose(['conversations']);
  if (conversationsCollection) {
    const convoRow = createSummaryRow();
    convoRow.sourceCollection = conversationsCollection;
    convoRow.target = 'conversations';

    const messageRow = createSummaryRow();
    messageRow.sourceCollection = `${conversationsCollection}/messages`;
    messageRow.target = 'messages';

    const convoSnap = await firestore.collection(conversationsCollection).get();
    convoRow.scanned = convoSnap.size;

    for (const convoDoc of convoSnap.docs) {
      const data = convoDoc.data() || {};
      try {
        const accountId = data.accountId ?? data.userId ?? null;
        const accountExists = accountId
          ? await prisma.account.findUnique({ where: { id: accountId }, select: { id: true } })
          : null;

        const payload = {
          accountId: accountExists ? accountId : null,
          customerName: data.customerName ?? 'Unknown',
          customerPhone: data.customerPhone ?? '',
          customerEmail: data.customerEmail ?? null,
          customerAvatarUrl: data.customerAvatarUrl ?? null,
          notes: data.notes ?? null,
          assignedTo: data.assignedTo ?? 'AI Assistant',
          subject: data.subject ?? 'General Inquiry',
          lastMessageAt: toDate(data.lastMessageAt) ?? new Date(),
          lastMessageSnippet: data.lastMessageSnippet ?? null,
          lastMessageSender: data.lastMessageSender ?? 'agent',
          isRead: data.isRead === undefined ? true : Boolean(data.isRead),
          leadCategory: data.leadCategory ?? 'New Inquiry',
          leadScore: toInt(data.leadScore) ?? 5,
          aiInterventionActive: data.aiInterventionActive === undefined ? true : Boolean(data.aiInterventionActive),
          createdAt: toDate(data.createdAt) ?? new Date(),
          updatedAt: toDate(data.updatedAt) ?? new Date(),
        };

        await prisma.conversation.upsert({
          where: { id: convoDoc.id },
          update: payload,
          create: { id: convoDoc.id, ...payload },
        });
        convoRow.upserted += 1;

        const msgSnap = await firestore
          .collection(conversationsCollection)
          .doc(convoDoc.id)
          .collection('messages')
          .get();

        messageRow.scanned += msgSnap.size;

        for (const msgDoc of msgSnap.docs) {
          const m = msgDoc.data() || {};
          try {
            await prisma.message.upsert({
              where: { id: msgDoc.id },
              update: {
                conversationId: convoDoc.id,
                sender: m.sender ?? 'customer',
                text: m.text ?? '',
                timestamp: toDate(m.timestamp ?? m.createdAt) ?? new Date(),
              },
              create: {
                id: msgDoc.id,
                conversationId: convoDoc.id,
                sender: m.sender ?? 'customer',
                text: m.text ?? '',
                timestamp: toDate(m.timestamp ?? m.createdAt) ?? new Date(),
              },
            });
            messageRow.upserted += 1;
          } catch (e) {
            messageRow.errors += 1;
            console.error(`[messages] Failed doc ${msgDoc.id}:`, e?.message || e);
          }
        }
      } catch (e) {
        convoRow.errors += 1;
        console.error(`[conversations] Failed doc ${convoDoc.id}:`, e?.message || e);
      }
    }

    summary.push(convoRow, messageRow);
  }

  const unmappedCollections = [...names].filter((name) => !usedCollections.has(name));

  const legacyRow = createSummaryRow();
  legacyRow.sourceCollection = unmappedCollections.join(',') || '(none)';
  legacyRow.target = 'legacy_firestore_documents';

  for (const collectionName of unmappedCollections) {
    const snap = await firestore.collection(collectionName).get();
    legacyRow.scanned += snap.size;

    for (const doc of snap.docs) {
      try {
        const payload = toJsonSafe(doc.data() || {});
        await prisma.$executeRawUnsafe(
          `
            INSERT INTO legacy_firestore_documents (collection_name, document_id, payload, migrated_at)
            VALUES ($1, $2, $3::jsonb, NOW())
            ON CONFLICT (collection_name, document_id)
            DO UPDATE SET payload = EXCLUDED.payload, migrated_at = NOW()
          `,
          collectionName,
          doc.id,
          JSON.stringify(payload ?? {})
        );
        legacyRow.upserted += 1;
      } catch (e) {
        legacyRow.errors += 1;
        console.error(`[legacy:${collectionName}] Failed doc ${doc.id}:`, e?.message || e);
      }
    }
  }

  summary.push(legacyRow);

  console.log('\nMigration summary:');
  console.table(summary);

  const totals = summary.reduce(
    (acc, r) => {
      acc.scanned += r.scanned;
      acc.upserted += r.upserted;
      acc.skipped += r.skipped;
      acc.errors += r.errors;
      return acc;
    },
    { scanned: 0, upserted: 0, skipped: 0, errors: 0 }
  );

  console.log('\nTotals:', totals);

  if (totals.errors > 0) {
    process.exitCode = 2;
  }
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
