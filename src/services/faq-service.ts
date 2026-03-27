
'use server';

import { prisma } from '@/lib/prisma';
import type { FAQ, CreateFaqFormValues } from '@/types';
import { logProblem } from './problem-service';


export async function getFaqs({ limit = 50, offset = 0 }: { limit?: number; offset?: number } = {}): Promise<FAQ[]> {
    try {
        const faqs = await prisma.faq.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        });
        return faqs.map(faq => ({
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
        const faq = await prisma.faq.create({
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
        await prisma.faq.update({
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
        await prisma.faq.delete({
            where: { id },
        });
    } catch (error: any) {
        await logProblem(error, `deleteFaq (ID: ${id})`);
        throw new Error('Failed to delete FAQ.');
    }
}
