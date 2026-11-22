import { prisma } from '@neup/core/database/prisma';
import type { CreateInquiryFormValues } from '@/types';
import { getListingBySlug } from '@/services/listings/view';

export class InquiryServiceError extends Error { status: number; constructor(message: string, status: number) { super(message); this.name = 'InquiryServiceError'; this.status = status; } }
export type InquiryType = 'property' | 'bridge';
export type InquiryData = { slug: string; name?: string; email?: string; phone?: string; message?: string; question?: string; submittedBy?: string };

export async function createInquiry(accountId: string | undefined, type: InquiryType, data: InquiryData): Promise<string> {
  const slug = data.slug?.trim() || '';
  if (!slug) throw new InquiryServiceError('Property slug is required.', 400);
  try {
    const property = await getListingBySlug(slug, { includeInactive: type === 'bridge' });
    if (!property) throw new InquiryServiceError('Property not found.', 404);
    const propertyId = property.id;
    const isBridge = type === 'bridge';
    const bridgeData = data as Extract<InquiryData, { message?: string }>;
    if (isBridge && !bridgeData.phone?.trim() && !bridgeData.email?.trim()) throw new InquiryServiceError('Provide at least phone or email.', 400);
    const inquiry = await prisma.inquiry.create({ data: { propertyId, propertyTitle: property.title, agentName: property.listingAgent || property.agency.name || null, name: data.name?.trim() || 'Unknown', email: data.email?.trim() || '', phone: data.phone?.trim() || null, question: (data.message ?? data.question)?.trim() || '', status: 'new' } });
    return inquiry.id;
  } catch (error) {
    if (error instanceof InquiryServiceError) throw error;
    throw new InquiryServiceError('Failed to submit inquiry.', 500);
  }
}
