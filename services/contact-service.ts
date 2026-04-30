
'use server';

import { prisma } from '@/lib/prisma';
import type { ContactSubmission, CreateContactSubmissionFormValues } from '@/types';
import { logProblem } from './problem-service';

export async function createContactSubmission(data: CreateContactSubmissionFormValues): Promise<string> {
    try {
        const submission = await prisma.contactSubmission.create({
            data: {
                name: data.name,
                email: data.email,
                phone: data.phone || null,
                subject: data.subject,
                body: data.body,
                status: 'new',
            },
        });
        return submission.id;
    } catch (error) {
        await logProblem(error, 'createContactSubmission');
        throw new Error('Failed to submit contact form.');
    }
}

export async function getContactSubmissions({ limit = 20, offset = 0 }: { limit?: number; offset?: number } = {}): Promise<ContactSubmission[]> {
    try {
        const submissions = await prisma.contactSubmission.findMany({
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
        });
        return submissions.map((submission) => ({
            id: submission.id,
            name: submission.name,
            email: submission.email,
            phone: submission.phone || undefined,
            subject: submission.subject,
            body: submission.body,
            status: submission.status,
            createdAt: submission.createdAt.toISOString(),
        })) as any[];
    } catch (error) {
        await logProblem(error, 'getContactSubmissions');
        return [];
    }
}
