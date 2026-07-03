import { prisma } from '@/logica/core/prisma';
import { getAuthenticatedAccount } from '@/services/auth';
import { isAgencyLikeAccountType } from '@/services/account-type';

/*
::neup.documentation::property-posting-context

::private

Resolves the effective posting profile for property creation from the signed-in
account, an optional URL-selected working profile, and the stored default
working profile on the account.

The resolved context is used to decide whether a property is being created for
an agency account or as the individual account itself, and to persist audit
metadata alongside `property_changes`.

::private end
::end
*/

type PostingContextAccount = {
  id: string;
  accountType: string;
  workingProfile: string | null;
  displayName: string | null;
};

export type PropertyPostingContext = {
  actorAccountId: string;
  signedInAccountId: string;
  effectiveProfileId: string;
  effectiveProfileName: string | null;
  profileType: 'agency' | 'individual';
  postingAgencyId: string | null;
  propertyAgentId: string | null;
  createdById: string;
  createdForId: string;
  workingProfileId: string | null;
  transferToId: string | null;
};

function normalizeId(value?: string | null): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

async function readAccount(accountId: string): Promise<PostingContextAccount | null> {
  return prisma.account.findUnique({
    where: { id: accountId },
    select: {
      id: true,
      accountType: true,
      workingProfile: true,
      displayName: true,
    },
  });
}

async function canAccessWorkingProfile(actorAccountId: string, workingProfileId: string): Promise<boolean> {
  if (actorAccountId === workingProfileId) return true;

  const [agencyMembership, agencyInvite] = await Promise.all([
    prisma.agencyMap.findFirst({
      where: {
        accountId: actorAccountId,
        agencyAccountId: workingProfileId,
      },
      select: { id: true },
    }),
    prisma.agencyAgentMap.findFirst({
      where: {
        agentId: actorAccountId,
        agencyId: workingProfileId,
        status: 'accepted',
      },
      select: { id: true },
    }),
  ]);

  return Boolean(agencyMembership || agencyInvite);
}

export async function resolvePropertyPostingContext(input: {
  actorAccountId: string;
  requestedWorkingProfileId?: string | null;
}): Promise<PropertyPostingContext> {
  const actor = await readAccount(input.actorAccountId);
  if (!actor) {
    throw new Error('Account not found.');
  }

  const signedInResult = await getAuthenticatedAccount();
  const signedInAccountId = signedInResult.success ? signedInResult.account.aid : actor.id;
  const requestedWorkingProfileId = normalizeId(input.requestedWorkingProfileId);
  const defaultWorkingProfileId = normalizeId(actor.workingProfile);

  let effectiveProfileId = requestedWorkingProfileId ?? defaultWorkingProfileId ?? actor.id;
  const isStoredDefaultWorkingProfile =
    effectiveProfileId !== actor.id &&
    defaultWorkingProfileId !== null &&
    effectiveProfileId === defaultWorkingProfileId;

  if (!isStoredDefaultWorkingProfile && !(await canAccessWorkingProfile(actor.id, effectiveProfileId))) {
    effectiveProfileId = actor.id;
  }

  const effectiveProfile =
    effectiveProfileId === actor.id
      ? actor
      : await readAccount(effectiveProfileId);

  const resolvedProfile = effectiveProfile ?? actor;
  const isAgencyProfile = isAgencyLikeAccountType(resolvedProfile.accountType);
  const isTransferToIndividual = !isAgencyProfile && resolvedProfile.id !== actor.id;

  return {
    actorAccountId: actor.id,
    signedInAccountId,
    effectiveProfileId: resolvedProfile.id,
    effectiveProfileName: resolvedProfile.displayName ?? null,
    profileType: isAgencyProfile ? 'agency' : 'individual',
    postingAgencyId: isAgencyProfile ? resolvedProfile.id : null,
    propertyAgentId: isAgencyProfile ? null : resolvedProfile.id,
    createdById: signedInAccountId,
    createdForId: resolvedProfile.id,
    workingProfileId: resolvedProfile.id === actor.id ? null : resolvedProfile.id,
    transferToId: isTransferToIndividual ? resolvedProfile.id : null,
  };
}
