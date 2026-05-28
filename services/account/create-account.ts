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
    let existing: { id: string; neupId?: string | null; displayName?: string | null; displayImage?: string | null } | null = null;
    try {
      existing = await prisma.account.findUnique({
        where: { id: aid },
        select: { id: true, neupId: true, displayName: true, displayImage: true },
      });
    } catch (err: any) {
      // If the neupId column doesn't exist yet (migration not applied), fall back
      // to a safer select that omits the column so the app can continue running.
      try {
        existing = await prisma.account.findUnique({
          where: { id: aid },
          select: { id: true, displayName: true, displayImage: true },
        });
      } catch (e) {
        // If even this fails, rethrow to be handled by outer catch
        throw e;
      }
    }

    if (existing) {
      // Row exists — bump accessedOn and return (but update any missing denormalized fields)
      const updateData: any = { accessedOn: new Date() };
      // If some display fields are missing, attempt to fetch them below
      if (!existing.displayName || !existing.displayImage || !existing.neupId) {
        try {
          const info = await getAccountInformation({ accountId: aid });
          if (info.found) {
            if (!existing.displayName && info.account.displayName) updateData.displayName = info.account.displayName;
            if (!existing.displayImage && info.account.displayImage) updateData.displayImage = info.account.displayImage;
            if (!existing.neupId && info.account.neupId) updateData.neupId = info.account.neupId;
          }
        } catch {
          // ignore lookup errors
        }
      }

      await prisma.account.update({
        where: { id: aid },
        data: updateData,
      });
      return;
    }

    // First visit — fetch display info from NeupID
    let displayName: string | null = null;
    let displayImage: string | null = null;
    let neupIdFromLookup: string | null = null;
    let accountType = 'individual';

    try {
      const info = await getAccountInformation({ accountId: aid });
      if (info.found) {
        displayName  = info.account.displayName  || null;
        displayImage = info.account.displayImage || null;
        accountType  = info.account.accountType  || 'individual';
        // include neupId when creating
        neupIdFromLookup = info.account.neupId || null;
      }
    } catch {
      // Non-fatal — create the row without display info if NeupID is unreachable
    }

    await prisma.account.create({
      data: {
        id: aid,
        neupId: neupIdFromLookup ?? null,
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
