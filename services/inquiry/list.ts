'use server';
import { prisma } from '@neup/core/database/prisma';
import type { Inquiry, InquiryStatus } from '@/types';
import { logger } from '@neup/logica/logger';
export async function listInquiries({ limit = 20, offset = 0 }: { limit?: number; offset?: number } = {}): Promise<Inquiry[]> {
  try { const rows = await prisma.inquiry.findMany({ orderBy: { createdAt: 'desc' }, take: limit, skip: offset }); return rows.map((inquiry) => ({ id: inquiry.id, propertyId: inquiry.propertyId, propertyTitle: inquiry.propertyTitle, agentName: inquiry.agentName || undefined, name: inquiry.name, email: inquiry.email, phone: inquiry.phone || undefined, question: inquiry.question, createdAt: inquiry.createdAt.toISOString(), status: inquiry.status as InquiryStatus })); }
  catch (error) { await logger().type('listInquiries').data({ error: String(error), details: {} }).log(); return []; }
}
