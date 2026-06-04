import { prisma } from "@/logica/core/prisma";
import { verifyAuthJWT } from "@/services/auth/jwt";
import { getSignedAccountInformation } from "@/services/account/lookup";

type AccountInfoSuccess = {
  success: true;
  displayName: string | null;
  neupId: string | null;
  displayImage: string | null;
};

type AccountInfoFailure = {
  success: false;
  reason: string;
};

export type GetAccountInfoResult = AccountInfoSuccess | AccountInfoFailure;
export type CreateAccountInAppResult =
  | { success: true; accountId: string }
  | { success: false; reason: string };

type AccountProfile = {
  displayName: string | null;
  displayImage: string | null;
  neupId: string | null;
};

async function resolveProfile(nid?: string): Promise<AccountProfile> {
  const base: AccountProfile = {
    displayName: null,
    displayImage: null,
    neupId: nid ?? null,
  };

  const signed = await getSignedAccountInformation();
  if (signed.found) {
    return {
      displayName: signed.account.displayName ?? null,
      displayImage: signed.account.displayImage ?? null,
      neupId: signed.account.neupId ?? (nid ?? null),
    };
  }

  return base;
}

// Resolves account profile data by cookie: DB first, then sign&get bridge data.
export async function getAccountInfo(authAccountCookie: string): Promise<GetAccountInfoResult> {
  if (!authAccountCookie?.trim()) {
    return { success: false, reason: "cookieNotFound" };
  }

  const verification = await verifyAuthJWT(authAccountCookie.trim());
  if (!verification.valid) {
    return { success: false, reason: verification.reason };
  }

  const { aid, guest, nid } = verification.payload;

  const existing = await prisma.account.findUnique({
    where: { id: aid },
    select: {
      displayName: true,
      neupId: true,
      displayImage: true,
    },
  });

  if (existing) {
    return {
      success: true,
      displayName: existing.displayName ?? null,
      neupId: existing.neupId ?? null,
      displayImage: existing.displayImage ?? null,
    };
  }

  const profile = await resolveProfile(nid);

  await prisma.account.upsert({
    where: { id: aid },
    create: {
      id: aid,
      neupId: profile.neupId,
      accountType: guest === 1 ? "guest" : "individual",
      displayName: profile.displayName,
      displayImage: profile.displayImage,
      createdOn: new Date(),
      accessedOn: new Date(),
    },
    update: {
      ...(profile.neupId ? { neupId: profile.neupId } : {}),
      ...(profile.displayName ? { displayName: profile.displayName } : {}),
      ...(profile.displayImage ? { displayImage: profile.displayImage } : {}),
      accessedOn: new Date(),
    },
  });

  return {
    success: true,
    displayName: profile.displayName,
    neupId: profile.neupId,
    displayImage: profile.displayImage,
  };
}

// Verifies auth_account cookie and creates/updates the account row in app DB.
export async function createAccountInApp(
  authAccountCookie: string
): Promise<CreateAccountInAppResult> {
  if (!authAccountCookie?.trim()) {
    return { success: false, reason: "cookieNotFound" };
  }

  const token = authAccountCookie.trim();
  const verification = await verifyAuthJWT(token);
  if (!verification.valid) {
    return { success: false, reason: verification.reason };
  }

  const { aid, guest, nid } = verification.payload;
  const profile = await resolveProfile(nid);

  await prisma.account.upsert({
    where: { id: aid },
    create: {
      id: aid,
      neupId: profile.neupId,
      accountType: guest === 1 ? "guest" : "individual",
      displayName: profile.displayName,
      displayImage: profile.displayImage,
      createdOn: new Date(),
      accessedOn: new Date(),
    },
    update: {
      ...(profile.neupId ? { neupId: profile.neupId } : {}),
      ...(profile.displayName ? { displayName: profile.displayName } : {}),
      ...(profile.displayImage ? { displayImage: profile.displayImage } : {}),
      accessedOn: new Date(),
    },
  });

  return { success: true, accountId: aid };
}
