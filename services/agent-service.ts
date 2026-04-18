
'use server';

import { getDbAdapter } from '@/lib/database';
import type { Agent, CreateAgentFormValues, UpdateAgentFormValues } from '@/types';
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
        const existingAgent = await db.getAgentBySlug(finalSlug);
        if (!existingAgent || (currentId && existingAgent.id === currentId)) {
            isUnique = true;
        } else {
            attempt++;
            finalSlug = `${baseSlug}-${attempt}`;
        }
    }
    return finalSlug;
}

export async function getAgents({ limit = 100, offset = 0 }: { limit?: number; offset?: number } = {}): Promise<Agent[]> {
    const db = getDbAdapter();
    const agents = await db.getAgents({ limit, offset });
    // Add a fallback for slugs if they are missing
    return agents.map(agent => ({
        ...agent,
        slug: agent.slug || agent.id,
    }));
}

export async function getAgentById(id: string): Promise<Agent | null> {
    const db = getDbAdapter();
    const agent = await db.getAgentById(id);
    if (agent) {
        return { ...agent, slug: agent.slug || agent.id };
    }
    return null;
}

export async function getAgentBySlug(slug: string): Promise<Agent | null> {
    const db = getDbAdapter();
    const agent = await db.getAgentBySlug(slug);
     if (agent) {
        return { ...agent, slug: agent.slug || agent.id };
    }
    // Fallback to check by ID if slug is not found
    return getAgentById(slug);
}

export async function createAgent(agentData: CreateAgentFormValues): Promise<string> {
    const db = getDbAdapter();
    let dataToSave: any;
    const specializations = agentData.specializations?.split(',').map(s => s.trim()).filter(Boolean) || [];
    const agentName = agentData.registered ? (await getUsers()).find(u => u.id === agentData.userId)?.name : agentData.name;

    if (!agentName) {
        throw new Error("Agent name could not be determined.");
    }
    const slug = await generateUniqueSlug(agentName);

    if (agentData.registered && agentData.userId) {
        const users = await getUsers();
        const user = users.find(u => u.id === agentData.userId);
        if (!user) {
            throw new Error("Selected user not found.");
        }
        dataToSave = {
            registered: true,
            userId: user.id,
            slug,
            location: agentData.location,
            about: agentData.about,
            name: user.name,
            contact: {
                email: user.email?.[0]?.value || '',
                phone: user.phone?.[0]?.value || ''
            },
            photoUrl: user.avatarUrl,
            specializations,
        };
    } else {
        dataToSave = {
            registered: false,
            slug,
            location: agentData.location,
            about: agentData.about,
            name: agentData.name,
            contact: {
                email: agentData.email,
                phone: agentData.phone,
            },
            photoUrl: agentData.photoUrl || null,
            specializations,
        };
    }
    
    return db.createAgent(dataToSave);
}

export async function updateAgent(id: string, agentData: UpdateAgentFormValues): Promise<void> {
    const db = getDbAdapter();
    let dataToUpdate: any;
    const specializations = agentData.specializations?.split(',').map(s => s.trim()).filter(Boolean) || [];

    const agentName = agentData.registered ? (await getUsers()).find(u => u.id === agentData.userId)?.name : agentData.name;
     if (!agentName) {
        throw new Error("Agent name could not be determined for update.");
    }
    const slug = await generateUniqueSlug(agentName, id);

    if (agentData.registered && agentData.userId) {
        const users = await getUsers();
        const user = users.find(u => u.id === agentData.userId);
        if (!user) {
            throw new Error("Selected user not found.");
        }
        dataToUpdate = {
            registered: true,
            userId: user.id,
            slug,
            location: agentData.location,
            about: agentData.about,
            name: user.name,
            contact: {
                email: user.email?.[0]?.value || '',
                phone: user.phone?.[0]?.value || ''
            },
            photoUrl: user.avatarUrl,
            specializations,
        };
    } else {
         dataToUpdate = {
            registered: false,
            userId: null, // Clear userId if they are no longer registered
            slug,
            location: agentData.location,
            about: agentData.about,
            name: agentData.name,
            contact: {
                email: agentData.email,
                phone: agentData.phone,
            },
            photoUrl: agentData.photoUrl || null,
            specializations,
        };
    }
    
    return db.updateAgent(id, dataToUpdate);
}

export async function deleteAgent(agentId: string): Promise<void> {
    const db = getDbAdapter();
    return db.deleteAgent(agentId);
}

export async function getAgentsByLocation(location: string): Promise<Agent[]> {
    const db = getDbAdapter();
    // This assumes the adapter has a method to handle location-based filtering.
    // The current Firebase adapter does a full scan, which is not scalable.
    // A production system would use a more efficient query or a search index.
    if ('getAgentsByLocation' in db && typeof db.getAgentsByLocation === 'function') {
        return db.getAgentsByLocation(location);
    }
    
    // Fallback for adapters without the specific method
    const allAgents = await db.getAgents({ limit: 1000 });
    return allAgents.filter(agent => agent.location.toLowerCase().includes(location.toLowerCase()));
}
