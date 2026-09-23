'use server';
import { prisma } from '@neup/core/database/prisma';
import type { InquiryStatus } from '@/types';
import { logger } from '@neup/logica/logger';
export async function updateInquiry(id: string, status: InquiryStatus): Promise<void> { try { await prisma.inquiry.update({ where: { id }, data: { status } }); } catch (error) { await logger().type(`updateInquiry (ID: ${id})`).data({ error: String(error), details: {} }).log(); throw new Error('Failed to update inquiry status.'); } }
