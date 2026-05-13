/**
 * create-account.ts
 *
 * Server-side service that ensures an account row exists for the current
 * request. Called from layouts so it runs on every SSR request — both
 * public pages and /manage pages.
 *
 * Flow:
 *   1. Read the verified account ID from the x-account-id request header
 *      (set by proxy.ts after JWT signature verification — no re-parsing needed).
 *   2. If no account ID is present, do nothing (unauthenticated / guest not
 *      yet identified — proxy.ts will redirect them to whoisthisthat).
 *   3. Check if the account row already exists in the DB.
 *      → exists: bump accessedOn and return.
 *      → missing: fetch display info from NeupID, then create the row.
 *
 * This is intentionally fire-and-forget from the layout — errors are logged
 * but never bubble up to break the page render.
 */

import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getAccountInformation } from '@/services/account/lookup';
import { logProblem } from '@/services/problem-service';

/**
 * Ensures an account row exists for the current request's authenticated user.
 * Safe to call on every request — cheap no-op when the row already exists.
 */
export async function createAccount(): Promise<void> {
  try {
    const headerStore = await headers();
    const aid = headerStore.get('x-account-id');

    // No verified account ID — nothing to do
    if (!aid) return;

    // Check if the row already exists
    const existing = await prisma.account.findUnique({
      where: { id: aid },
      select: { id: true },
    });

    if (existing) {
      // Row exists — bump accessedOn and return
      await prisma.account.update({
        where: { id: aid },
        data: { accessedOn: new Date() },
      });
      return;
    }

    // First visit — fetch display info from NeupID
    let displayName: string | null = null;
    let displayImage: string | null = null;
    let accountType = 'individual';

    try {
      const info = await getAccountInformation({ accountId: aid });
      if (info.found) {
        displayName  = info.account.displayName  || null;
        displayImage = info.account.displayImage || null;
        accountType  = info.account.accountType  || 'individual';
      }
    } catch {
      // Non-fatal — create the row without display info if NeupID is unreachable
    }

    await prisma.account.create({
      data: {
        id: aid,
        accountType,
        registered: true,
        createdOn:  new Date(),
        accessedOn: new Date(),
        displayName,
        displayImage,
      },
    });
  } catch (error) {
    // Never let account creation break the page render
    await logProblem(error, 'createAccount').catch(() => {});
  }
}
