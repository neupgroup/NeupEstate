import { prisma } from '@neup/core/database/prisma';
import type { CreateInquiryFormValues } from '@/types';
import { getPropertyById } from '@/services/properties';
import { logger } from '@neup/logica/logger';

export class InquiryServiceError extends Error { status: number; constructor(message: string, status: number) { super(message); this.name = 'InquiryServiceError'; this.status = status; } }
export type InquiryType = 'property' | 'bridge';
export type InquiryData = CreateInquiryFormValues | { propertyId: string; phone?: string; email?: string; message?: string; name?: string };

export async function createInquiry(accountId: string | undefined, type: InquiryType, data: InquiryData): Promise<string> {
  const propertyId = data.propertyId?.trim() || '';
  if (!propertyId) throw new InquiryServiceError('Property is required.', 400);
  try {
    const property = await getPropertyById(propertyId, { includeInactive: type === 'bridge' });
    if (!property) throw new InquiryServiceError('Property not found.', 404);
    const isBridge = type === 'bridge';
    const bridgeData = data as Extract<InquiryData, { message?: string }>;
    if (isBridge && !bridgeData.phone?.trim() && !bridgeData.email?.trim()) throw new InquiryServiceError('Provide at least phone or email.', 400);
    const formData = data as CreateInquiryFormValues;
    const inquiry = await prisma.inquiry.create({ data: { propertyId, propertyTitle: property.title, agentName: property.listingAgent || property.agency.name || null, name: isBridge ? bridgeData.name?.trim() || 'Unknown' : formData.name, email: isBridge ? bridgeData.email?.trim() || '' : formData.email, phone: (isBridge ? bridgeData.phone : formData.phone)?.trim() || null, question: isBridge ? bridgeData.message?.trim() || '' : formData.question, status: 'new' } });
    return inquiry.id;
  } catch (error) {
    if (error instanceof InquiryServiceError) throw error;
    await logger().type(`createInquiry${accountId ? ` account:${accountId}` : ''}`).data({ error: String(error), details: {} }).log();
    throw new InquiryServiceError('Failed to submit inquiry.', 500);
  }
}
