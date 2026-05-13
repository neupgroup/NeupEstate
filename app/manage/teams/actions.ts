'use server';

import { requireAuth } from '@/services/auth';
import {
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  generateSlug,
  isSlugAvailable,
} from '@/services/team-service';
import { revalidatePath } from 'next/cache';

/**
 * Create a new team member.
 */
export async function createTeamMemberAction(formData: FormData) {
  // Require authentication
  await requireAuth();

  const name = formData.get('name') as string;
  const slug = formData.get('slug') as string;
  const position = formData.get('position') as string;
  const about = formData.get('about') as string;
  const moreDetails = formData.get('moreDetails') as string;
  const photoUrl = formData.get('photoUrl') as string;
  const orgId = formData.get('orgId') as string;
  const userId = formData.get('userId') as string;
  const registered = formData.get('registered') === 'on';

  // Validate required fields
  if (!name || !position || !about) {
    throw new Error('Name, position, and about are required');
  }

  // Generate slug if not provided
  let finalSlug = slug || generateSlug(name);

  // Check if slug is available
  if (finalSlug) {
    const available = await isSlugAvailable(finalSlug);
    if (!available) {
      throw new Error(`Slug "${finalSlug}" is already taken`);
    }
  }

  // Build social media object
  const socialMedia: Record<string, string> = {};
  const linkedin = formData.get('linkedin') as string;
  const twitter = formData.get('twitter') as string;
  const github = formData.get('github') as string;
  const website = formData.get('website') as string;

  if (linkedin) socialMedia.linkedin = linkedin;
  if (twitter) socialMedia.twitter = twitter;
  if (github) socialMedia.github = github;
  if (website) socialMedia.website = website;

  // Create team member
  await createTeamMember({
    name,
    slug: finalSlug || undefined,
    position,
    about,
    moreDetails: moreDetails || undefined,
    photoUrl: photoUrl || undefined,
    orgId: orgId || undefined,
    userId: userId || undefined,
    registered,
    socialMedia: Object.keys(socialMedia).length > 0 ? socialMedia : undefined,
  });

  revalidatePath('/manage/teams');
}

/**
 * Update an existing team member.
 */
export async function updateTeamMemberAction(id: string, formData: FormData) {
  // Require authentication
  await requireAuth();

  const name = formData.get('name') as string;
  const slug = formData.get('slug') as string;
  const position = formData.get('position') as string;
  const about = formData.get('about') as string;
  const moreDetails = formData.get('moreDetails') as string;
  const photoUrl = formData.get('photoUrl') as string;
  const orgId = formData.get('orgId') as string;
  const userId = formData.get('userId') as string;
  const registered = formData.get('registered') === 'on';

  // Validate required fields
  if (!name || !position || !about) {
    throw new Error('Name, position, and about are required');
  }

  // Check if slug is available (excluding current member)
  if (slug) {
    const available = await isSlugAvailable(slug, id);
    if (!available) {
      throw new Error(`Slug "${slug}" is already taken`);
    }
  }

  // Build social media object
  const socialMedia: Record<string, string> = {};
  const linkedin = formData.get('linkedin') as string;
  const twitter = formData.get('twitter') as string;
  const github = formData.get('github') as string;
  const website = formData.get('website') as string;

  if (linkedin) socialMedia.linkedin = linkedin;
  if (twitter) socialMedia.twitter = twitter;
  if (github) socialMedia.github = github;
  if (website) socialMedia.website = website;

  // Update team member
  await updateTeamMember(id, {
    name,
    slug: slug || undefined,
    position,
    about,
    moreDetails: moreDetails || undefined,
    photoUrl: photoUrl || undefined,
    orgId: orgId || undefined,
    userId: userId || undefined,
    registered,
    socialMedia: Object.keys(socialMedia).length > 0 ? socialMedia : undefined,
  });

  revalidatePath('/manage/teams');
  revalidatePath(`/manage/teams/${id}/edit`);
}

/**
 * Delete a team member.
 */
export async function deleteTeamMemberAction(id: string) {
  // Require authentication
  await requireAuth();

  await deleteTeamMember(id);

  revalidatePath('/manage/teams');
}
