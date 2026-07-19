/**
 * team-service.ts
 *
 * Service for managing team members.
 */

import { prisma } from '@/core/database/prisma';
import type { TeamMember } from '@/core/database/prisma';

// ─── Types ───────────────────────────────────────────────────────────────────

export type TeamMemberInput = {
  orgId?: string;
  userId?: string;
  name: string;
  slug?: string;
  position: string;
  socialMedia?: Record<string, string>;
  about: string;
  moreDetails?: string;
  photoUrl?: string;
  registered?: boolean;
};

export type TeamMemberUpdate = Partial<TeamMemberInput>;

// ─── Read Operations ─────────────────────────────────────────────────────────

/**
 * Get all team members.
 */
export async function getTeamMembers(): Promise<TeamMember[]> {
  return await prisma.teamMember.findMany({
    orderBy: [
      { registered: 'desc' },
      { createdAt: 'desc' },
    ],
  });
}

/**
 * Get a team member by ID.
 */
export async function getTeamMemberById(id: string): Promise<TeamMember | null> {
  return await prisma.teamMember.findUnique({
    where: { id },
  });
}

/**
 * Get a team member by slug.
 */
export async function getTeamMemberBySlug(slug: string): Promise<TeamMember | null> {
  return await prisma.teamMember.findUnique({
    where: { slug },
  });
}

/**
 * Get team members by organization ID.
 */
export async function getTeamMembersByOrgId(orgId: string): Promise<TeamMember[]> {
  return await prisma.teamMember.findMany({
    where: { orgId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get registered team members only.
 */
export async function getRegisteredTeamMembers(): Promise<TeamMember[]> {
  return await prisma.teamMember.findMany({
    where: { registered: true },
    orderBy: { createdAt: 'desc' },
  });
}

// ─── Write Operations ────────────────────────────────────────────────────────

/**
 * Create a new team member.
 */
export async function createTeamMember(data: TeamMemberInput): Promise<TeamMember> {
  return await prisma.teamMember.create({
    data: {
      orgId: data.orgId,
      userId: data.userId,
      name: data.name,
      slug: data.slug,
      position: data.position,
      socialMedia: data.socialMedia || {},
      about: data.about,
      moreDetails: data.moreDetails,
      photoUrl: data.photoUrl,
      registered: data.registered ?? false,
    },
  });
}

/**
 * Update a team member.
 */
export async function updateTeamMember(
  id: string,
  data: TeamMemberUpdate
): Promise<TeamMember> {
  return await prisma.teamMember.update({
    where: { id },
    data: {
      ...(data.orgId !== undefined && { orgId: data.orgId }),
      ...(data.userId !== undefined && { userId: data.userId }),
      ...(data.name !== undefined && { name: data.name }),
      ...(data.slug !== undefined && { slug: data.slug }),
      ...(data.position !== undefined && { position: data.position }),
      ...(data.socialMedia !== undefined && { socialMedia: data.socialMedia }),
      ...(data.about !== undefined && { about: data.about }),
      ...(data.moreDetails !== undefined && { moreDetails: data.moreDetails }),
      ...(data.photoUrl !== undefined && { photoUrl: data.photoUrl }),
      ...(data.registered !== undefined && { registered: data.registered }),
    },
  });
}

/**
 * Delete a team member.
 */
export async function deleteTeamMember(id: string): Promise<TeamMember> {
  return await prisma.teamMember.delete({
    where: { id },
  });
}

// ─── Utility Functions ───────────────────────────────────────────────────────

/**
 * Generate a slug from a name.
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Check if a slug is available.
 */
export async function isSlugAvailable(slug: string, excludeId?: string): Promise<boolean> {
  const existing = await prisma.teamMember.findUnique({
    where: { slug },
  });

  if (!existing) return true;
  if (excludeId && existing.id === excludeId) return true;

  return false;
}

/**
 * Get team member count.
 */
export async function getTeamMemberCount(): Promise<number> {
  return await prisma.teamMember.count();
}

/**
 * Get registered team member count.
 */
export async function getRegisteredTeamMemberCount(): Promise<number> {
  return await prisma.teamMember.count({
    where: { registered: true },
  });
}
