'use server';

import { prisma } from '@neup/core/database/prisma';
import type { Agent, CreateAgentFormValues, UpdateAgentFormValues } from '@/types';
import type { Filters } from '@/services/agents/filter';
import { filter } from '@/services/agents/filter';

type AgentProfile = {
  location?: string;
  email?: string;
  phone?: string;
  about?: string;
  photoUrl?: string;
  specializations?: string[];
  availabilityHours?: string;
  timeSlotDuration?: number;
  unavailability?: Agent['unavailability'];
};

type AccountAgent = {
  id: string;
  neupId: string | null;
  displayName: string | null;
  displayImage: string | null;
  moreDetails: unknown;
};

// Read the optional agent profile stored inside the account's JSON details.
function getAgentProfile(moreDetails: unknown): AgentProfile {
  if (!moreDetails || typeof moreDetails !== 'object' || Array.isArray(moreDetails)) return {};
  const profile = (moreDetails as Record<string, unknown>).agentProfile;
  return profile && typeof profile === 'object' && !Array.isArray(profile)
    ? profile as AgentProfile
    : {};
}

// Convert the shared account record into the legacy public agent response shape.
function mapAccountAgent(account: AccountAgent): Agent {
  const profile = getAgentProfile(account.moreDetails);
  return {
    id: account.id,
    name: account.displayName?.trim() || account.neupId || account.id,
    slug: account.neupId || account.id,
    location: typeof profile.location === 'string' ? profile.location : '',
    registered: true,
    userId: account.id,
    contact: { email: profile.email, phone: profile.phone },
    photoUrl: profile.photoUrl || account.displayImage || undefined,
    about: profile.about,
    specializations: Array.isArray(profile.specializations) ? profile.specializations : [],
    availability_hours: profile.availabilityHours,
    time_slot_duration: profile.timeSlotDuration,
    unavailability: profile.unavailability,
  };
}

// Get the full account metadata object before updating its agent profile.
function getAccountAgentProfile(moreDetails: unknown): Record<string, unknown> {
  if (!moreDetails || typeof moreDetails !== 'object' || Array.isArray(moreDetails)) return {};
  return moreDetails as Record<string, unknown>;
}

// List agent accounts and project their account profile fields for current callers.
export async function getAgents(options: { limit?: number; offset?: number; filters?: Filters } = {}): Promise<Agent[]> {
  try {
    const accounts = await prisma.account.findMany({
      where: filter(options.filters),
      take: options.limit ?? 100,
      skip: options.offset ?? 0,
      select: { id: true, neupId: true, displayName: true, displayImage: true, moreDetails: true },
      orderBy: [{ accessedOn: 'desc' }, { createdOn: 'desc' }, { id: 'asc' }],
    });
    return accounts.map(mapAccountAgent);
  } catch {
    return [];
  }
}

// Count account records that are registered as agents.
export async function getAgentCount(filters: Filters = {}): Promise<number> {
  try {
    return await prisma.account.count({ where: filter(filters) });
  } catch {
    return 0;
  }
}

// Resolve one registered agent by its account ID.
export async function getAgentById(id: string): Promise<Agent | null> {
  try {
    const account = await prisma.account.findUnique({
      where: { id },
      select: { id: true, neupId: true, displayName: true, displayImage: true, moreDetails: true, accountType: true },
    });
    return account?.accountType === 'individual.agent' ? mapAccountAgent(account) : null;
  } catch {
    return null;
  }
}

// Resolve one registered agent by its NeupID handle or account ID.
export async function getAgentBySlug(slug: string): Promise<Agent | null> {
  try {
    const account = await prisma.account.findFirst({
      where: { accountType: 'individual.agent', OR: [{ neupId: slug }, { id: slug }] },
      select: { id: true, neupId: true, displayName: true, displayImage: true, moreDetails: true },
    });
    return account ? mapAccountAgent(account) : null;
  } catch {
    return null;
  }
}

// Search agent account profiles by their stored operating location.
export async function getAgentsByLocation(location: string): Promise<Agent[]> {
  const query = location.trim().toLocaleLowerCase();
  if (!query) return [];
  return (await getAgents({ limit: 200 })).filter((agent) => agent.location.toLocaleLowerCase().includes(query));
}

// Promote an existing account to agent and save its agent-specific profile details.
export async function createAgent(data: CreateAgentFormValues): Promise<string> {
  if (!data.registered || !data.userId) throw new Error('Select an existing account to make it an agent.');
  const account = await prisma.account.findUnique({
    where: { id: data.userId },
    select: { id: true, moreDetails: true },
  });
  if (!account) throw new Error('The selected account was not found.');

  const existing = getAccountAgentProfile(account.moreDetails);
  const profile = { ...getAgentProfile(account.moreDetails), ...toAgentProfile(data) };
  await prisma.account.update({
    where: { id: account.id },
    data: {
      accountType: 'individual.agent',
      moreDetails: toJsonValue({ ...existing, agentProfile: profile }),
    },
  });
  return account.id;
}

// Update profile details stored on an existing agent account.
export async function updateAgent(id: string, data: UpdateAgentFormValues): Promise<void> {
  const account = await prisma.account.findUnique({ where: { id }, select: { moreDetails: true, accountType: true } });
  if (!account || account.accountType !== 'individual.agent') throw new Error('Agent account not found.');
  const moreDetails = getAccountAgentProfile(account.moreDetails);
  const profile = { ...getAgentProfile(account.moreDetails), ...toAgentProfile(data) };
  await prisma.account.update({
    where: { id },
    data: { moreDetails: toJsonValue({ ...moreDetails, agentProfile: profile }) },
  });
}

// Remove the agent role and profile metadata without deleting the account.
export async function deleteAgent(id: string): Promise<void> {
  const account = await prisma.account.findUnique({ where: { id }, select: { moreDetails: true, accountType: true } });
  if (!account || account.accountType !== 'individual.agent') return;
  const moreDetails = getAccountAgentProfile(account.moreDetails);
  delete moreDetails.agentProfile;
  await prisma.account.update({ where: { id }, data: { accountType: 'individual', moreDetails: toJsonValue(moreDetails) } });
}

// Normalize form values into the account's JSON agent-profile shape.
function toAgentProfile(data: CreateAgentFormValues | UpdateAgentFormValues): AgentProfile {
  return {
    location: data.location,
    email: data.registered ? undefined : data.email,
    phone: data.registered ? undefined : data.phone,
    about: data.about,
    photoUrl: data.registered ? undefined : data.photoUrl,
    specializations: typeof data.specializations === 'string'
      ? data.specializations.split(',').map((item) => item.trim()).filter(Boolean)
      : data.specializations ?? [],
    availabilityHours: data.availability_hours || undefined,
    timeSlotDuration: data.time_slot_duration,
    unavailability: data.unavailability,
  };
}

// Strip undefined form fields before persisting JSON through Prisma.
function toJsonValue(value: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(value));
}
