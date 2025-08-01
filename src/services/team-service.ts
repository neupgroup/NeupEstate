
'use server';

import { getDbAdapter } from '@/lib/database';
import type { TeamMember, CreateTeamMemberFormValues, UpdateTeamMemberFormValues } from '@/types';
import { getUsers } from './user-service';
import slugify from 'slugify';

async function generateUniqueSlug(name: string, currentId?: string): Promise<string> {
    const db = getDbAdapter();
    let baseSlug = slugify(name, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g });
    let finalSlug = baseSlug;
    let attempt = 1;

    let isUnique = false;
    while (!isUnique) {
        // This is a simplification. A real implementation in the adapter would be more efficient.
        const existingMember = await db.getTeamMemberBySlug(finalSlug);
        if (!existingMember || (currentId && existingMember.id === currentId)) {
            isUnique = true;
        } else {
            attempt++;
            finalSlug = `${baseSlug}-${attempt}`;
        }
    }
    return finalSlug;
}


async function prepareDataForSave(data: CreateTeamMemberFormValues, currentId?: string) {
    let dataToSave: any;

    if (data.registered && data.userId) {
        const users = await getUsers();
        const user = users.find(u => u.id === data.userId);
        if (!user) {
            throw new Error("Selected user not found.");
        }
        const slug = await generateUniqueSlug(user.name, currentId);
        dataToSave = {
            registered: true,
            userId: user.id,
            name: user.name,
            slug,
            photoUrl: user.avatarUrl,
            position: data.position,
            about: data.about,
            moreDetails: data.moreDetails,
            socialMedia: data.socialMedia,
        };
    } else {
        const slug = await generateUniqueSlug(data.name, currentId);
        dataToSave = {
            registered: false,
            name: data.name,
            slug,
            position: data.position,
            about: data.about,
            moreDetails: data.moreDetails,
            socialMedia: data.socialMedia,
            photoUrl: data.photoUrl || null,
        };
    }
    return dataToSave;
}


export async function createTeamMember(memberData: CreateTeamMemberFormValues): Promise<string> {
    const dataToSave = await prepareDataForSave(memberData);
    const db = getDbAdapter();
    return db.createTeamMember(dataToSave);
}

export async function getTeamMembers({ limit = 20, offset = 0 }: { limit?: number; offset?: number } = {}): Promise<TeamMember[]> {
    const db = getDbAdapter();
    return db.getTeamMembers({ limit, offset });
}

export async function getTeamMemberById(id: string): Promise<TeamMember | null> {
    const db = getDbAdapter();
    return db.getTeamMemberById(id);
}

export async function getTeamMemberBySlug(slug: string): Promise<TeamMember | null> {
    const db = getDbAdapter();
    return db.getTeamMemberBySlug(slug);
}

export async function updateTeamMember(id: string, memberData: UpdateTeamMemberFormValues): Promise<void> {
    const dataToUpdate = await prepareDataForSave(memberData, id);
    const db = getDbAdapter();
    return db.updateTeamMember(id, dataToUpdate);
}

export async function deleteTeamMember(memberId: string): Promise<void> {
    const db = getDbAdapter();
    return db.deleteTeamMember(memberId);
}
