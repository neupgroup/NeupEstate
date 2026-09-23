'use server';
import { prisma } from '@neup/core/database/prisma';
import type { Inquiry, InquiryStatus } from '@/types';
export async function viewInquiry(id: string): Promise<Inquiry | null> {
  const inquiry = await prisma.inquiry.findUnique({ where: { id } });
  return inquiry ? { id: inquiry.id, propertyId: inquiry.propertyId, propertyTitle: inquiry.propertyTitle, agentName: inquiry.agentName || undefined, name: inquiry.name, email: inquiry.email, phone: inquiry.phone || undefined, question: inquiry.question, createdAt: inquiry.createdAt.toISOString(), status: inquiry.status as InquiryStatus } : null;
}
