import type {
  Property,
  CreatePropertyInput,
  PropertyFilters,
  ExtractedPropertyData,
  UpdatePropertyInput,
  User,
  Agency,
  CreateAgencyInput,
  UpdateAgencyInput,
  TeamMember,
  CreateTeamMemberFormValues,
  UpdateTeamMemberFormValues,
  Requirement,
  CreateRequirementFormValues,
  Account,
  Agent,
  UpdateUserFormValues,
  CreateAgentFormValues,
} from "@/types";
import type { DatabaseAdapter } from "@/lib/database";
import type { SavedPropertyEntry } from "@/services/property-service";
import { prisma } from "@/lib/prisma";

function normalizeStringArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function fallbackPurpose(textBlob: string): Property["purpose"] {
  return textBlob.includes("rent") ? "Rent" : "Sale";
}

function fallbackCategory(textBlob: string): Property["category"] {
  if (textBlob.includes("land") || textBlob.includes("plot")) return "Land";
  if (textBlob.includes("apartment")) return "Apartment";
  if (textBlob.includes("flat")) return "Flat";
  return "House";
}

function mapPropertyRecord(record: any): Property {
  const textBlob = `${record?.title || ""} ${record?.description || ""}`.toLowerCase();
  const purpose = (record?.purpose as Property["purpose"]) || fallbackPurpose(textBlob);
  const category = (record?.category as Property["category"]) || fallbackCategory(textBlob);
  const agency = (record?.agency as any) || {
    id: "postgres",
    name: "NeupEstate",
    logoUrl: "https://placehold.co/200x80.png",
  };

  return {
    id: record.id,
    title: record.title || "Untitled Property",
    description: record.description || "",
    price: Number(record.price || 0),
    location: record.location || "Nepal",
    bedrooms: Number(record.bedrooms || 0),
    bathrooms: Number(record.bathrooms || 0),
    area: Number(record.area || 0),
    areaUnit: record.areaUnit || undefined,
    facing: record.facing || undefined,
    buildStart: record.buildStart ?? undefined,
    buildCompleted: record.buildCompleted ?? undefined,
    purpose,
    purposes: normalizeStringArray(record.purposes || [purpose]),
    category,
    type: record.type || "Residential",
    images: normalizeStringArray(record.images),
    amenities: normalizeStringArray(record.amenities),
    agency,
    listingAgent: record.listingAgent || undefined,
    isOwnerListing: record.isOwnerListing ?? undefined,
    isFeatured: Boolean(record.isFeatured),
    isApproved: typeof record.isApproved === "boolean" ? record.isApproved : record.status === "approved",
    sourceUrl: record.sourceUrl || undefined,
    createdAt: record.createdAt ? record.createdAt.toISOString?.() || String(record.createdAt) : undefined,
    updatedAt: record.updatedAt ? record.updatedAt.toISOString?.() || String(record.updatedAt) : undefined,
    floors: record.floors ?? undefined,
    onFloor: record.onFloor ?? undefined,
    roadAccess: record.roadAccess ?? undefined,
    latitude: record.latitude ?? undefined,
    longitude: record.longitude ?? undefined,
    fetchHistory: record.fetchHistory || [],
    imageFetchHistory: record.imageFetchHistory || [],
    kitchens: record.kitchens ?? undefined,
    diningRooms: record.diningRooms ?? undefined,
    livingRooms: record.livingRooms ?? undefined,
    carParkingSpots: record.carParkingSpots ?? undefined,
    bikeParkingSpots: record.bikeParkingSpots ?? undefined,
    metaTitle: record.metaTitle || undefined,
    metaDescription: record.metaDescription || undefined,
    metaTags: normalizeStringArray(record.metaTags),
    slug: record.slug || record.id,
    landDetails: record.landDetails || undefined,
    plots: record.plots || undefined,
    apartmentDetails: record.apartmentDetails || undefined,
    apartmentUnits: record.apartmentUnits || undefined,
    structuredLocation: record.structuredLocation || undefined,
    pricing: record.pricing || undefined,
    roadAccessDetails: record.roadAccessDetails || undefined,
    distancing: record.distancing || undefined,
    earnings: record.earnings || undefined,
    owner: record.owner || undefined,
    owners: record.owners || undefined,
    documents: record.documents || undefined,
  } as Property;
}

function buildPropertyData(propertyData: Partial<CreatePropertyInput> & Record<string, unknown>) {
  return {
    title: propertyData.title ?? null,
    description: propertyData.description ?? null,
    price: propertyData.price ?? null,
    location: propertyData.location ?? null,
    bedrooms: propertyData.bedrooms ?? null,
    bathrooms: propertyData.bathrooms ?? null,
    area: propertyData.area ?? null,
    areaUnit: propertyData.areaUnit ?? null,
    facing: propertyData.facing ?? null,
    buildStart: propertyData.buildStart ?? null,
    buildCompleted: propertyData.buildCompleted ?? null,
    purpose: propertyData.purpose ?? null,
    purposes: normalizeStringArray(propertyData.purposes),
    category: propertyData.category ?? null,
    type: propertyData.type ?? null,
    images: normalizeStringArray(propertyData.images),
    amenities: normalizeStringArray(propertyData.amenities),
    agency: propertyData.agency ?? null,
    listingAgent: propertyData.listingAgent ?? null,
    isOwnerListing: propertyData.isOwnerListing ?? false,
    isFeatured: propertyData.isFeatured ?? false,
    isApproved: propertyData.isApproved ?? null,
    status: propertyData.status ?? null,
    sourceUrl: propertyData.sourceUrl ?? null,
    slug: propertyData.slug ?? null,
    floors: propertyData.floors ?? null,
    onFloor: propertyData.onFloor ?? null,
    roadAccess: propertyData.roadAccess ?? null,
    latitude: propertyData.latitude ?? null,
    longitude: propertyData.longitude ?? null,
    fetchHistory: propertyData.fetchHistory ?? null,
    imageFetchHistory: propertyData.imageFetchHistory ?? null,
    kitchens: propertyData.kitchens ?? null,
    diningRooms: propertyData.diningRooms ?? null,
    livingRooms: propertyData.livingRooms ?? null,
    carParkingSpots: propertyData.carParkingSpots ?? null,
    bikeParkingSpots: propertyData.bikeParkingSpots ?? null,
    metaTitle: propertyData.metaTitle ?? null,
    metaDescription: propertyData.metaDescription ?? null,
    metaTags: normalizeStringArray(propertyData.metaTags),
    landDetails: propertyData.landDetails ?? null,
    plots: propertyData.plots ?? null,
    apartmentDetails: propertyData.apartmentDetails ?? null,
    apartmentUnits: propertyData.apartmentUnits ?? null,
    structuredLocation: propertyData.structuredLocation ?? null,
    pricing: propertyData.pricing ?? null,
    roadAccessDetails: propertyData.roadAccessDetails ?? null,
    distancing: propertyData.distancing ?? null,
    earnings: propertyData.earnings ?? null,
    owner: propertyData.owner ?? null,
    owners: propertyData.owners ?? null,
    documents: propertyData.documents ?? null,
  };
}

function mapAccountToUser(record: any): User {
  const name = typeof record.name === "string" ? record.name.trim() : "";
  return {
    id: record.id,
    name: name || "Registered User",
    email: record.email || [],
    phone: record.phone || [],
    location: record.location || undefined,
    role: record.role || "User",
    lastLogin: record.lastLogin ? record.lastLogin.toISOString?.() || String(record.lastLogin) : undefined,
    avatarUrl: record.avatarUrl || undefined,
  };
}

function mapUserRecord(record: any): User {
  return {
    id: record.id,
    name: record.name || "Registered User",
    email: record.email || [],
    phone: record.phone || [],
    location: record.location || undefined,
    role: record.role || "User",
    lastLogin: record.lastLogin ? record.lastLogin.toISOString?.() || String(record.lastLogin) : undefined,
    avatarUrl: record.avatarUrl || undefined,
  };
}

function mapAgentRecord(record: any): Agent {
  return {
    id: record.id,
    name: record.name || "Unnamed Agent",
    slug: record.slug || record.id,
    location: record.location || "",
    registered: Boolean(record.registered),
    contact: {
      email: record.email || undefined,
      phone: record.phone || undefined,
    },
    userId: record.userId || undefined,
    photoUrl: record.photoUrl || undefined,
    about: record.about || undefined,
    specializations: normalizeStringArray(record.specializations),
    availability_hours: record.availabilityHours || undefined,
    time_slot_duration: record.timeSlotDuration ?? undefined,
    unavailability: record.unavailability || undefined,
  };
}

function mapTeamMemberRecord(record: any): TeamMember {
  return {
    id: record.id,
    orgId: record.orgId || undefined,
    userId: record.userId || undefined,
    name: record.name,
    slug: record.slug || record.id,
    position: record.position,
    socialMedia: record.socialMedia || {},
    about: record.about || "",
    moreDetails: record.moreDetails || undefined,
    photoUrl: record.photoUrl || undefined,
    registered: Boolean(record.registered),
  };
}

function mapRequirementRecord(record: any): Requirement {
  return {
    id: record.id,
    userId: record.userId,
    minBudget: record.minBudget ?? undefined,
    maxBudget: record.maxBudget ?? undefined,
    location: record.location ?? undefined,
    propertyType: record.propertyType || [],
    purpose: record.purpose ?? undefined,
    urgency: record.urgency ?? undefined,
    requiredTime: record.requiredTime ?? undefined,
    paymentMethod: record.paymentMethod || [],
    loan: record.loan ?? false,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function mapAccountRecord(record: any): Account {
  const baseAccount = {
    id: record.id,
    created_on: record.createdOn?.toISOString?.() || new Date().toISOString(),
    accessed_on: record.accessedOn?.toISOString?.() || new Date().toISOString(),
    created_from_ip: record.createdFromIp || undefined,
    last_accessed_from_ip: record.lastAccessedFromIp || undefined,
  };

  if (record.registered) {
    return {
      ...baseAccount,
      registered: true,
      account_type: record.accountType,
    };
  }

  return {
    ...baseAccount,
    registered: false,
    account_type: "guest",
    name: record.name || undefined,
    location: record.location || undefined,
  };
}

export class PrismaAdapter implements DatabaseAdapter {
  async addProperty(propertyData: Omit<ExtractedPropertyData, "embedding">): Promise<string> {
    const { isPropertyPage: _ignored, ...rest } = propertyData;
    const created = await prisma.property.create({
      data: {
        ...buildPropertyData({
          ...rest,
          isFeatured: false,
          isApproved: false,
          status: "pending",
          agency: rest.agency ?? {
            id: "imported",
            name: "Imported Listing",
            logoUrl: "https://placehold.co/100x40.png",
          },
        }),
      },
    });

    if (!created.slug) {
      await prisma.property.update({
        where: { id: created.id },
        data: { slug: created.id },
      });
    }

    return created.id;
  }

  async createProperty(propertyData: CreatePropertyInput): Promise<string> {
    const created = await prisma.property.create({
      data: {
        ...buildPropertyData({
          ...propertyData,
          isFeatured: false,
          isApproved: true,
          status: "approved",
          agency: propertyData.agency ?? {
            id: "manual",
            name: "Manually Added",
            logoUrl: "https://placehold.co/100x40.png",
          },
        }),
      },
    });

    if (!created.slug) {
      await prisma.property.update({
        where: { id: created.id },
        data: { slug: created.id },
      });
    }

    return created.id;
  }

  async updateProperty(id: string, propertyData: UpdatePropertyInput): Promise<void> {
    await prisma.property.update({
      where: { id },
      data: buildPropertyData(propertyData),
    });
  }

  async updatePropertyImages(id: string, images: string[]): Promise<void> {
    await prisma.property.update({
      where: { id },
      data: { images },
    });
  }

  async addFetchToHistory(propertyId: string, data: ExtractedPropertyData): Promise<void> {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new Error("Property not found.");

    const nextHistory = [
      { fetchedAt: new Date().toISOString(), data },
      ...((property.fetchHistory as any[]) || []),
    ];

    await prisma.property.update({
      where: { id: propertyId },
      data: { fetchHistory: nextHistory },
    });
  }

  async deleteFetchHistoryItem(propertyId: string, fetchedAt: string): Promise<void> {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new Error("Property not found.");

    const nextHistory = ((property.fetchHistory as any[]) || []).filter(
      (item) => item.fetchedAt !== fetchedAt
    );

    await prisma.property.update({
      where: { id: propertyId },
      data: { fetchHistory: nextHistory },
    });
  }

  async addImagesToFetchHistory(propertyId: string, images: string[]): Promise<void> {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new Error("Property not found.");

    const nextHistory = [
      { fetchedAt: new Date().toISOString(), images },
      ...((property.imageFetchHistory as any[]) || []),
    ];

    await prisma.property.update({
      where: { id: propertyId },
      data: { imageFetchHistory: nextHistory },
    });
  }

  async deleteImageFetchHistoryItem(propertyId: string, fetchedAt: string): Promise<void> {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new Error("Property not found.");

    const nextHistory = ((property.imageFetchHistory as any[]) || []).filter(
      (item) => item.fetchedAt !== fetchedAt
    );

    await prisma.property.update({
      where: { id: propertyId },
      data: { imageFetchHistory: nextHistory },
    });
  }

  async updatePropertyWithExtractedData(id: string, propertyData: ExtractedPropertyData): Promise<void> {
    const { isPropertyPage: _ignored, ...rest } = propertyData;
    await prisma.property.update({
      where: { id },
      data: buildPropertyData(rest),
    });
  }

  async getProperties(): Promise<Property[]> {
    const records = await prisma.property.findMany({
      orderBy: { updatedAt: "desc" },
    });
    return records.map(mapPropertyRecord);
  }

  async getPaginatedProperties(options: { page?: number; limit?: number; filters?: PropertyFilters } = {}): Promise<{ properties: Property[]; totalCount: number }> {
    const page = Math.max(1, options.page ?? 1);
    const limit = Math.max(1, options.limit ?? 20);
    const filters = options.filters ?? {};

    const where: any = {};

    if (filters.id) where.id = filters.id;
    if (filters.status) where.status = filters.status;
    if (filters.sourceUrl) where.sourceUrl = filters.sourceUrl;

    if (filters.searchTerm) {
      where.OR = [
        { title: { contains: filters.searchTerm, mode: "insensitive" } },
        { description: { contains: filters.searchTerm, mode: "insensitive" } },
      ];
    }

    if (Number.isFinite(filters.minPrice)) {
      where.price = { ...(where.price || {}), gte: filters.minPrice };
    }
    if (Number.isFinite(filters.maxPrice)) {
      where.price = { ...(where.price || {}), lte: filters.maxPrice };
    }

    const [totalCount, records] = await Promise.all([
      prisma.property.count({ where }),
      prisma.property.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: limit,
        skip: (page - 1) * limit,
      }),
    ]);

    return {
      properties: records.map(mapPropertyRecord),
      totalCount,
    };
  }

  async getPropertiesByAgent(agentId: string): Promise<Property[]> {
    const records = await prisma.property.findMany({
      where: { listingAgent: agentId },
      orderBy: { updatedAt: "desc" },
    });
    return records.map(mapPropertyRecord);
  }

  async getFeaturedProperties(limit: number): Promise<Property[]> {
    const records = await prisma.property.findMany({
      where: { isFeatured: true },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });

    if (records.length > 0) {
      return records.map(mapPropertyRecord);
    }

    const fallback = await prisma.property.findMany({
      orderBy: { updatedAt: "desc" },
      take: limit,
    });
    return fallback.map(mapPropertyRecord);
  }

  async getRecentProperties(limit: number): Promise<Property[]> {
    const records = await prisma.property.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return records.map(mapPropertyRecord);
  }

  async getPropertiesByPurpose(purpose: "Sale" | "Rent" | "Lease", limit: number): Promise<Property[]> {
    const records = await prisma.property.findMany({
      where: { purpose },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });
    return records.map(mapPropertyRecord);
  }

  async getFeaturedProjects(limit: number): Promise<Property[]> {
    return this.getFeaturedProperties(limit);
  }

  async getPremiumProperties(limit: number): Promise<Property[]> {
    const records = await prisma.property.findMany({
      where: { price: { not: null } },
      orderBy: { price: "desc" },
      take: limit,
    });
    return records.map(mapPropertyRecord);
  }

  async getLuxuriousProperties(limit: number): Promise<Property[]> {
    return this.getPremiumProperties(limit);
  }

  async getPendingProperties(limit: number): Promise<Property[]> {
    const records = await prisma.property.findMany({
      where: { status: "pending" },
      orderBy: { updatedAt: "desc" },
      take: limit,
    });
    return records.map(mapPropertyRecord);
  }

  async getPropertyById(id: string): Promise<Property | null> {
    const record = await prisma.property.findUnique({ where: { id } });
    return record ? mapPropertyRecord(record) : null;
  }

  async getPropertyBySlug(slug: string): Promise<Property | null> {
    const record = await prisma.property.findFirst({ where: { slug } });
    if (record) return mapPropertyRecord(record);
    return this.getPropertyById(slug);
  }

  async approveProperty(propertyId: string): Promise<void> {
    await prisma.property.update({
      where: { id: propertyId },
      data: { status: "approved", isApproved: true },
    });
  }

  async deleteProperty(propertyId: string): Promise<void> {
    await prisma.property.delete({ where: { id: propertyId } });
  }

  async isPropertySaved(userId: string, propertyId: string): Promise<boolean> {
    const existing = await prisma.userSavedProperty.findUnique({
      where: { userId_propertyId: { userId, propertyId } },
    });
    return Boolean(existing);
  }

  async toggleSavedProperty(userId: string, propertyId: string): Promise<{ saved: boolean }> {
    const existing = await prisma.userSavedProperty.findUnique({
      where: { userId_propertyId: { userId, propertyId } },
    });

    if (existing) {
      await prisma.userSavedProperty.delete({
        where: { userId_propertyId: { userId, propertyId } },
      });
      return { saved: false };
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { title: true },
    });

    await prisma.userSavedProperty.create({
      data: {
        userId,
        propertyId,
        propertyTitle: property?.title || "Property",
        savedAt: new Date(),
      },
    });

    return { saved: true };
  }

  async getSavedProperties(userId: string): Promise<Property[]> {
    const saved = await prisma.userSavedProperty.findMany({
      where: { userId },
      include: { property: true },
      orderBy: { savedAt: "desc" },
    });

    return saved
      .map((entry) => entry.property)
      .filter(Boolean)
      .map((property) => mapPropertyRecord(property));
  }

  async getLatestSavedProperties(limit: number): Promise<SavedPropertyEntry[]> {
    const saved = await prisma.userSavedProperty.findMany({
      orderBy: { savedAt: "desc" },
      take: limit,
      include: {
        account: true,
        property: true,
      },
    });

    return saved.map((entry) => ({
      userId: entry.userId,
      userName: entry.account?.name || "Unknown User",
      propertyId: entry.propertyId,
      propertyTitle: entry.propertyTitle || entry.property?.title || "Unknown Property",
      savedAt: entry.savedAt.toISOString(),
    }));
  }

  async getUsersBySavedProperty(propertyId: string): Promise<User[]> {
    const saved = await prisma.userSavedProperty.findMany({
      where: { propertyId },
      include: { account: true },
      orderBy: { savedAt: "desc" },
    });

    return saved
      .map((entry) => entry.account)
      .filter(Boolean)
      .map((account) => mapAccountToUser(account));
  }

  async getUsers(): Promise<User[]> {
    const users = await prisma.user.findMany({
      orderBy: [{ lastLogin: "desc" }, { name: "asc" }],
    });
    return users.map(mapUserRecord);
  }

  async updateUser(id: string, data: UpdateUserFormValues): Promise<void> {
    await prisma.user.upsert({
      where: { id },
      create: {
        id,
        name: data.name || "User",
        email: data.email || [],
        phone: data.phone || [],
        location: data.location || null,
        role: "User",
      },
      update: {
        name: data.name,
        email: data.email || [],
        phone: data.phone || [],
        location: data.location || null,
      },
    });
  }

  async createAgency(agencyData: CreateAgencyInput): Promise<string> {
    const agency = await prisma.agency.create({
      data: {
        name: agencyData.name,
        registeredName: agencyData.registeredName || null,
        logoUrl: agencyData.logoUrl || null,
        website: agencyData.website || null,
        contactEmail: agencyData.contactEmail || null,
        contactPhone: agencyData.contactPhone || null,
        mainLocation: agencyData.mainLocation || null,
        branches: agencyData.branches || [],
        contactPersonName: agencyData.contactPersonName || null,
        contactPersonRole: agencyData.contactPersonRole || null,
      },
    });

    return agency.id;
  }

  async getAgencies(options: { limit?: number; offset?: number } = {}): Promise<Agency[]> {
    const records = await prisma.agency.findMany({
      orderBy: { createdAt: "desc" },
      take: options.limit ?? 20,
      skip: options.offset ?? 0,
    });

    return records.map((agency) => ({
      id: agency.id,
      name: agency.name,
      logoUrl: agency.logoUrl || "https://placehold.co/200x80.png",
      website: agency.website || undefined,
      registeredName: agency.registeredName || undefined,
      contactEmail: agency.contactEmail || undefined,
      contactPhone: agency.contactPhone || undefined,
      mainLocation: agency.mainLocation || undefined,
      branches: agency.branches || [],
      contactPersonName: agency.contactPersonName || undefined,
      contactPersonRole: agency.contactPersonRole || undefined,
    }));
  }

  async getFeaturedAgencies(limit: number): Promise<Agency[]> {
    const records = await prisma.agency.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return records.map((agency) => ({
      id: agency.id,
      name: agency.name,
      logoUrl: agency.logoUrl || "https://placehold.co/200x80.png",
      website: agency.website || undefined,
      registeredName: agency.registeredName || undefined,
      contactEmail: agency.contactEmail || undefined,
      contactPhone: agency.contactPhone || undefined,
      mainLocation: agency.mainLocation || undefined,
      branches: agency.branches || [],
      contactPersonName: agency.contactPersonName || undefined,
      contactPersonRole: agency.contactPersonRole || undefined,
    }));
  }

  async getAgencyById(id: string): Promise<Agency | null> {
    const agency = await prisma.agency.findUnique({ where: { id } });
    if (!agency) return null;

    return {
      id: agency.id,
      name: agency.name,
      logoUrl: agency.logoUrl || "https://placehold.co/200x80.png",
      website: agency.website || undefined,
      registeredName: agency.registeredName || undefined,
      contactEmail: agency.contactEmail || undefined,
      contactPhone: agency.contactPhone || undefined,
      mainLocation: agency.mainLocation || undefined,
      branches: agency.branches || [],
      contactPersonName: agency.contactPersonName || undefined,
      contactPersonRole: agency.contactPersonRole || undefined,
    };
  }

  async updateAgency(id: string, agencyData: UpdateAgencyInput): Promise<void> {
    await prisma.agency.update({
      where: { id },
      data: {
        name: agencyData.name,
        registeredName: agencyData.registeredName || null,
        logoUrl: agencyData.logoUrl || null,
        website: agencyData.website || null,
        contactEmail: agencyData.contactEmail || null,
        contactPhone: agencyData.contactPhone || null,
        mainLocation: agencyData.mainLocation || null,
        branches: agencyData.branches || [],
        contactPersonName: agencyData.contactPersonName || null,
        contactPersonRole: agencyData.contactPersonRole || null,
      },
    });
  }

  async deleteAgency(agencyId: string): Promise<void> {
    await prisma.agency.delete({ where: { id: agencyId } });
  }

  async createAgent(agentData: CreateAgentFormValues): Promise<string> {
    const agent = await prisma.agent.create({
      data: {
        name: agentData.name,
        slug: agentData.slug || null,
        location: agentData.location || null,
        registered: Boolean(agentData.registered),
        userId: agentData.userId || null,
        email: agentData.contact?.email || agentData.email || null,
        phone: agentData.contact?.phone || agentData.phone || null,
        about: agentData.about || null,
        photoUrl: agentData.photoUrl || null,
        specializations: normalizeStringArray(agentData.specializations),
        availabilityHours: agentData.availability_hours || null,
        timeSlotDuration: agentData.time_slot_duration ?? null,
        unavailability: agentData.unavailability || null,
      },
    });

    return agent.id;
  }

  async getAgents(options: { limit?: number; offset?: number } = {}): Promise<Agent[]> {
    const records = await prisma.agent.findMany({
      orderBy: { createdAt: "desc" },
      take: options.limit ?? 20,
      skip: options.offset ?? 0,
    });

    return records.map(mapAgentRecord);
  }

  async getAgentById(id: string): Promise<Agent | null> {
    const record = await prisma.agent.findUnique({ where: { id } });
    return record ? mapAgentRecord(record) : null;
  }

  async getAgentBySlug(slug: string): Promise<Agent | null> {
    const record = await prisma.agent.findFirst({ where: { slug } });
    return record ? mapAgentRecord(record) : null;
  }

  async updateAgent(id: string, agentData: any): Promise<void> {
    await prisma.agent.update({
      where: { id },
      data: {
        name: agentData.name || undefined,
        slug: agentData.slug || undefined,
        location: agentData.location || undefined,
        registered: agentData.registered ?? undefined,
        userId: agentData.userId ?? undefined,
        email: agentData.contact?.email || agentData.email || undefined,
        phone: agentData.contact?.phone || agentData.phone || undefined,
        about: agentData.about || undefined,
        photoUrl: agentData.photoUrl || undefined,
        specializations: normalizeStringArray(agentData.specializations),
        availabilityHours: agentData.availability_hours || undefined,
        timeSlotDuration: agentData.time_slot_duration ?? undefined,
        unavailability: agentData.unavailability || undefined,
      },
    });
  }

  async deleteAgent(agentId: string): Promise<void> {
    await prisma.agent.delete({ where: { id: agentId } });
  }

  async getAgentsByLocation(location: string): Promise<Agent[]> {
    const records = await prisma.agent.findMany({
      where: {
        location: {
          contains: location,
          mode: "insensitive",
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return records.map(mapAgentRecord);
  }

  async createTeamMember(memberData: CreateTeamMemberFormValues): Promise<string> {
    const member = await prisma.teamMember.create({
      data: {
        orgId: memberData.orgId || null,
        userId: memberData.userId || null,
        name: memberData.name || "Team Member",
        slug: memberData.slug || null,
        position: memberData.position || "",
        socialMedia: memberData.socialMedia || {},
        about: memberData.about || "",
        moreDetails: memberData.moreDetails || null,
        photoUrl: memberData.photoUrl || null,
        registered: Boolean(memberData.registered),
      },
    });

    return member.id;
  }

  async getTeamMembers(options: { limit?: number; offset?: number } = {}): Promise<TeamMember[]> {
    const records = await prisma.teamMember.findMany({
      orderBy: { createdAt: "desc" },
      take: options.limit ?? 20,
      skip: options.offset ?? 0,
    });

    return records.map(mapTeamMemberRecord);
  }

  async getTeamMemberById(id: string): Promise<TeamMember | null> {
    const record = await prisma.teamMember.findUnique({ where: { id } });
    return record ? mapTeamMemberRecord(record) : null;
  }

  async getTeamMemberBySlug(slug: string): Promise<TeamMember | null> {
    const record = await prisma.teamMember.findFirst({ where: { slug } });
    return record ? mapTeamMemberRecord(record) : null;
  }

  async updateTeamMember(id: string, memberData: UpdateTeamMemberFormValues): Promise<void> {
    await prisma.teamMember.update({
      where: { id },
      data: {
        orgId: memberData.orgId || undefined,
        userId: memberData.userId || undefined,
        name: memberData.name || undefined,
        slug: memberData.slug || undefined,
        position: memberData.position || undefined,
        socialMedia: memberData.socialMedia || undefined,
        about: memberData.about || undefined,
        moreDetails: memberData.moreDetails || undefined,
        photoUrl: memberData.photoUrl || undefined,
        registered: memberData.registered ?? undefined,
      },
    });
  }

  async deleteTeamMember(memberId: string): Promise<void> {
    await prisma.teamMember.delete({ where: { id: memberId } });
  }

  async createRequirement(data: CreateRequirementFormValues): Promise<string> {
    const requirement = await prisma.requirement.create({
      data: {
        userId: data.userId || "",
        minBudget: data.minBudget,
        maxBudget: data.maxBudget,
        location: data.location || null,
        propertyType: data.propertyType || [],
        purpose: data.purpose || null,
        urgency: data.urgency || null,
        requiredTime: data.requiredTime || null,
        paymentMethod: data.paymentMethod || [],
        loan: data.loan || false,
      },
    });

    return requirement.id;
  }

  async getRequirementById(id: string): Promise<Requirement | null> {
    const record = await prisma.requirement.findUnique({ where: { id } });
    return record ? mapRequirementRecord(record) : null;
  }

  async getRequirementByUserId(userId: string): Promise<Requirement[] | null> {
    const records = await prisma.requirement.findMany({ where: { userId } });
    if (records.length === 0) return null;
    return records.map(mapRequirementRecord);
  }

  async updateRequirement(id: string, data: CreateRequirementFormValues): Promise<void> {
    await prisma.requirement.update({
      where: { id },
      data: {
        minBudget: data.minBudget,
        maxBudget: data.maxBudget,
        location: data.location || null,
        propertyType: data.propertyType || [],
        purpose: data.purpose || null,
        urgency: data.urgency || null,
        requiredTime: data.requiredTime || null,
        paymentMethod: data.paymentMethod || [],
        loan: data.loan || false,
      },
    });
  }

  async createTemporaryAccount(ipAddress: string): Promise<string> {
    const account = await prisma.account.create({
      data: {
        id: `temp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        createdFromIp: ipAddress,
        lastAccessedFromIp: ipAddress,
        createdOn: new Date(),
        accessedOn: new Date(),
        registered: false,
        accountType: "guest",
      },
    });

    return account.id;
  }

  async getAccounts(): Promise<Account[]> {
    const records = await prisma.account.findMany({ orderBy: { createdAt: "desc" } });
    return records.map(mapAccountRecord);
  }

  async getAccountById(id: string): Promise<Account | null> {
    const record = await prisma.account.findUnique({ where: { id } });
    return record ? mapAccountRecord(record) : null;
  }

  async updateAccountAccess(accountId: string, ipAddress: string): Promise<void> {
    await prisma.account.update({
      where: { id: accountId },
      data: {
        accessedOn: new Date(),
        lastAccessedFromIp: ipAddress,
      },
    });
  }
}
