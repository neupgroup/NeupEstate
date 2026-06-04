'use server';

import { prisma } from '@/logica/core/prisma';
import { logProblem } from './problem-service';
import type { Agent, CreateAgentFormValues, UpdateAgentFormValues } from '@/types';
import slugify from 'slugify';

function mapRecord(r: any): Agent {
  return {
    id:             r.id,
    name:           r.name || 'Unnamed Agent',
    slug:           r.slug || r.id,
    location:       r.location || '',
    registered:     Boolean(r.registered),
    contact:        { email: r.email || undefined, phone: r.phone || undefined },
    userId:         r.userId || undefined,
    photoUrl:       r.photoUrl || undefined,
    about:          r.about || undefined,
    specializations: r.specializations || [],
    availability_hours:  r.availabilityHours || undefined,
    time_slot_duration:  r.timeSlotDuration ?? undefined,
    unavailability:      r.unavailability || undefined,
  };
}

async function uniqueSlug(name: string, excludeId?: string): Promise<string> {
  const base = slugify(name, { lower: true, strict: true, remove: /[*+~.()'\"!:@]/g });
  let slug = base;
  let i = 1;
  while (true) {
    const existing = await prisma.agent.findFirst({ where: { slug } });
    if (!existing || existing.id === excludeId) return slug;
    slug = `${base}-${++i}`;
  }
}

export async function getAgents({ limit = 100, offset = 0 }: { limit?: number; offset?: number } = {}): Promise<Agent[]> {
  try {
    const records = await prisma.agent.findMany({ orderBy: { createdAt: 'desc' }, take: limit, skip: offset });
    return records.map(mapRecord);
  } catch (e) { await logProblem(e, 'getAgents'); return []; }
}

export async function getAgentById(id: string): Promise<Agent | null> {
  try {
    const record = await prisma.agent.findUnique({ where: { id } });
    return record ? mapRecord(record) : null;
  } catch (e) { await logProblem(e, `getAgentById ${id}`); return null; }
}

export async function getAgentBySlug(slug: string): Promise<Agent | null> {
  try {
    const record = await prisma.agent.findFirst({ where: { slug } });
    if (record) return mapRecord(record);
    return getAgentById(slug);
  } catch (e) { await logProblem(e, `getAgentBySlug ${slug}`); return null; }
}

export async function getAgentsByLocation(location: string): Promise<Agent[]> {
  try {
    const records = await prisma.agent.findMany({ where: { location: { contains: location, mode: 'insensitive' } }, orderBy: { createdAt: 'desc' } });
    return records.map(mapRecord);
  } catch (e) { await logProblem(e, `getAgentsByLocation ${location}`); return []; }
}

export async function createAgent(d: CreateAgentFormValues): Promise<string> {
  try {
    const specializations = typeof d.specializations === 'string'
      ? d.specializations.split(',').map((s) => s.trim()).filter(Boolean)
      : d.specializations || [];

    const name = d.registered
      ? (await prisma.agent.findFirst())?.name ?? (d as any).name ?? 'Agent'
      : (d as any).name;

    const slug = await uniqueSlug(name || 'agent');

    const agent = await prisma.agent.create({
      data: {
        name:             name || 'Agent',
        slug,
        location:         d.location || null,
        registered:       Boolean(d.registered),
        userId:           d.userId || null,
        email:            (d as any).contact?.email || (d as any).email || null,
        phone:            (d as any).contact?.phone || (d as any).phone || null,
        about:            d.about || null,
        photoUrl:         (d as any).photoUrl || null,
        specializations,
        availabilityHours: d.availability_hours || null,
        timeSlotDuration:  d.time_slot_duration ?? null,
        unavailability:    d.unavailability || null,
      },
    });
    return agent.id;
  } catch (e) { await logProblem(e, 'createAgent'); throw new Error('Failed to create agent.'); }
}

export async function updateAgent(id: string, d: UpdateAgentFormValues): Promise<void> {
  try {
    const specializations = typeof d.specializations === 'string'
      ? d.specializations.split(',').map((s) => s.trim()).filter(Boolean)
      : d.specializations || [];

    const name = (d as any).name || 'agent';
    const slug = await uniqueSlug(name, id);

    await prisma.agent.update({
      where: { id },
      data: {
        name,
        slug,
        location:         d.location || null,
        registered:       Boolean(d.registered),
        userId:           d.userId || null,
        email:            (d as any).contact?.email || (d as any).email || null,
        phone:            (d as any).contact?.phone || (d as any).phone || null,
        about:            d.about || null,
        photoUrl:         (d as any).photoUrl || null,
        specializations,
        availabilityHours: d.availability_hours || null,
        timeSlotDuration:  d.time_slot_duration ?? null,
        unavailability:    d.unavailability || null,
      },
    });
  } catch (e) { await logProblem(e, `updateAgent ${id}`); throw new Error('Failed to update agent.'); }
}

export async function deleteAgent(id: string): Promise<void> {
  try {
    await prisma.agent.delete({ where: { id } });
  } catch (e) { await logProblem(e, `deleteAgent ${id}`); throw new Error('Failed to delete agent.'); }
}
