/**
 * ::neup.documentation::service-account-create
 * ::title Authenticated Account Creation Service
 *
 * Ensures the current authenticated Neup account has an application connection
 * and a local account row in this app.
 *
 * ::public
 *
 * Call this from server-side entry points such as layouts and auth callbacks.
 * The service reads the current `auth_account` cookie, creates or reuses the
 * upstream application connection, then upserts the local account row.
 *
 * ::public end
 *
 * ::private
 *
 * Guest sessions are ignored. Errors are logged and swallowed so account
 * bootstrap does not break page rendering or auth redirects.
 *
 * ::private end
 * ::end
 */

import { prisma } from '@/core/database/prisma';
import { createIndividualConnection } from '@/logica/neupid/connections/create';
import { resolveStoredAccountType } from '@/services/account-type';
import { getAccountInformation } from '@/services/account/lookup';
import { getAuthenticatedAccount } from '@/services/auth';
import { getAuthCookieServer } from '@/services/auth/cookie';
import { logProblem } from '@/services/problem-service';

type LocalAccountSeed = {
  id: string;
  neupId: string | null;
  displayName: string | null;
  displayImage: string | null;
  accountType: string;
  connectionId: string | null;
};

function getRequiredEnv(name: 'NEUP_APP_ID' | 'NEUP_APP_SECRET'): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

async function getLocalAccountSeed(accountId: string, connectionId: string | null): Promise<LocalAccountSeed> {
  const accountInfo = await getAccountInformation({ accountId }).catch(() => null);
  const foundAccount = accountInfo?.found ? accountInfo.account : null;

  return {
    id: accountId,
    neupId: foundAccount?.neupId ?? null,
    displayName: foundAccount?.displayName ?? null,
    displayImage: foundAccount?.displayImage ?? null,
    accountType: resolveStoredAccountType({
      remoteAccountType: foundAccount?.accountType ?? 'individual',
    }),
    connectionId,
  };
}

export async function createAccount(): Promise<void> {
  try {
    const authCookie = await getAuthCookieServer();
    if (!authCookie) return;

    const authResult = await getAuthenticatedAccount();
    if (!authResult.success || !authResult.account.aid || authResult.account.guest === 1) {
      return;
    }

    const connectionResponse = await createIndividualConnection({
      accountId: authResult.account.aid,
      authAccountToken: authCookie,
      appId: getRequiredEnv('NEUP_APP_ID'),
      appSecret: getRequiredEnv('NEUP_APP_SECRET'),
    });

    const connectionBody = connectionResponse.body;
    const connectionId =
      typeof connectionBody?.connectionId === 'string' && connectionBody.connectionId.trim()
        ? connectionBody.connectionId.trim()
        : null;

    if (!connectionResponse.ok || connectionBody?.success === false) {
      throw new Error(
        connectionBody?.error_description ||
          connectionBody?.error ||
          `Failed to create account connection: HTTP ${connectionResponse.status}`,
      );
    }

    const seed = await getLocalAccountSeed(authResult.account.aid, connectionId);
    const existing = await prisma.account.findUnique({
      where: { id: seed.id },
      select: { accountType: true },
    });

    await prisma.account.upsert({
      where: { id: seed.id },
      create: {
        id: seed.id,
        neupId: seed.neupId,
        accountType: seed.accountType,
        createdOn: new Date(),
        accessedOn: new Date(),
        displayName: seed.displayName,
        displayImage: seed.displayImage,
        connectionId: seed.connectionId,
      },
      update: {
        accessedOn: new Date(),
        neupId: seed.neupId,
        accountType: resolveStoredAccountType({
          remoteAccountType: seed.accountType,
          existingAccountType: existing?.accountType ?? null,
        }),
        displayName: seed.displayName,
        displayImage: seed.displayImage,
        connectionId: seed.connectionId,
      },
    });
  } catch (error) {
    await logProblem(error, 'createAccount').catch(() => {});
  }
}
