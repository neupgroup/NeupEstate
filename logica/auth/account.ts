import { prisma } from "@/lib/prisma";
import { fetchWhoami } from "@/services/auth/bridge";
import { verifyAuthJWT } from "@/services/auth/jwt";

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

// Resolves account profile data by cookie: DB first, then Neup whoami + DB upsert.
export async function getAccountInfo(authAccountCookie: string): Promise<GetAccountInfoResult> {
  if (!authAccountCookie?.trim()) {
    return { success: false, reason: "cookieNotFound" };
  }

  const verification = await verifyAuthJWT(authAccountCookie.trim());
  if (!verification.valid) {
    return { success: false, reason: verification.reason };
  }

  const { aid, guest } = verification.payload;

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

  const whoami = await fetchWhoami(authAccountCookie.trim());
  if (!whoami.success) {
    return { success: false, reason: `whoamiFailed:${whoami.status}` };
  }

  const profile = extractProfile(whoami.data);

  await prisma.account.upsert({
    where: { id: aid },
    create: {
      id: aid,
      neupId: profile.neupId,
      accountType: guest === 1 ? "guest" : "individual",
      registered: guest !== 1,
      displayName: profile.displayName,
      displayImage: profile.displayImage,
      createdOn: new Date(),
      accessedOn: new Date(),
    },
    update: {
      neupId: profile.neupId,
      displayName: profile.displayName,
      displayImage: profile.displayImage,
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
