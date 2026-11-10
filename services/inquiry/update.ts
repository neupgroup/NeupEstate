'use server';
import { prisma } from '@neup/core/database/prisma';
import type { InquiryStatus } from '@/types';
export async function updateInquiry(id: string, status: InquiryStatus): Promise<void> { try { await prisma.inquiry.update({ where: { id }, data: { status } }); } catch (error) { throw new Error('Failed to update inquiry status.'); } }
