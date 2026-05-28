import { prisma } from "@/lib/prisma";
import { fetchWhoami } from "@/services/auth/bridge";
import { verifyAuthJWT } from "@/services/auth/jwt";
import { getAccountInformation } from "@/services/account/lookup";

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

type WhoamiLike = {
  displayName?: string | null;
  displayImage?: string | null;
  neupId?: string | null;
  nid?: string | null;
  profile?: {
    displayName?: string | null;
    displayImage?: string | null; 
    neupId?: string | null;
    neupid?: string | null;
  } | null;
};

type AccountProfile = {
  displayName: string | null;
  displayImage: string | null;
  neupId: string | null;
};

// Normalizes profile fields from the Neup whoami response.
function extractProfile(data: unknown): {
  displayName: string | null;
  displayImage: string | null;
  neupId: string | null;
} {
  const value = (data ?? {}) as WhoamiLike;

  const displayName =
    value.profile?.displayName ??
    value.displayName ??
    null;

  const displayImage =
    value.profile?.displayImage ??
    value.displayImage ??
    null;

  const neupId =
    value.profile?.neupId ??
    value.profile?.neupid ??
    value.neupId ??
    value.nid ??
    null;

  return { displayName, displayImage, neupId };
}

// Resolves profile from whoami and falls back to public account lookup by accountId.
async function resolveProfile(token: string, aid: string, nid?: string): Promise<AccountProfile> {
  const base: AccountProfile = {
    displayName: null,
    displayImage: null,
    neupId: nid ?? null,
  };

  const whoami = await fetchWhoami(token);
  if (whoami.success) {
    const profile = extractProfile(whoami.data);
    if (profile.displayName || profile.displayImage || profile.neupId) {
      return profile;
    }
  }

  const lookup = await getAccountInformation({ accountId: aid });
  if (lookup.found) {
    return {
      displayName: lookup.account.displayName ?? null,
      displayImage: lookup.account.displayImage ?? null,
      neupId: lookup.account.neupId ?? (nid ?? null),
    };
  }

  return base;
}

// Resolves account profile data by cookie: DB first, then Neup whoami + DB upsert.
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

  const profile = await resolveProfile(authAccountCookie.trim(), aid, nid);

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
  const profile = await resolveProfile(token, aid, nid);

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
