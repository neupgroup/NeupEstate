
'use server';

import { prisma } from '@/core/database/prisma';
import type { FAQ, CreateFaqFormValues } from '@/types';
import { logProblem } from './problem-service';


export async function getFaqs({ limit = 50, offset = 0 }: { limit?: number; offset?: number } = {}): Promise<FAQ[]> {
    try {
        const faqs = await prisma.fAQ.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        });
        return faqs.map((faq: any) => ({
            id: faq.id,
            question: faq.question,
            answer: faq.answer,
            category: faq.category,
            createdAt: faq.createdAt.toISOString(),
        }));
    } catch (error) {
        await logProblem(error, 'getFaqs');
        return [];
    }
}

export async function createFaq(faqData: CreateFaqFormValues): Promise<string> {
    try {
        const faq = await prisma.fAQ.create({
            data: {
                question: faqData.question,
                answer: faqData.answer,
                category: faqData.category || 'General',
            },
        });
        return faq.id;
    } catch (error: any) {
        await logProblem(error, 'createFaq');
        throw new Error('Failed to create FAQ.');
    }
}

export async function updateFaq(id: string, faqData: CreateFaqFormValues): Promise<void> {
    try {
        await prisma.fAQ.update({
            where: { id },
            data: {
                question: faqData.question,
                answer: faqData.answer,
                category: faqData.category,
            },
        });
    } catch (error: any) {
        await logProblem(error, `updateFaq (ID: ${id})`);
        throw new Error('Failed to update FAQ.');
    }
}

export async function deleteFaq(id: string): Promise<void> {
    try {
        await prisma.fAQ.delete({
            where: { id },
        });
    } catch (error: any) {
        await logProblem(error, `deleteFaq (ID: ${id})`);
        throw new Error('Failed to delete FAQ.');
    }
}
