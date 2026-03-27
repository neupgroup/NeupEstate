
'use server';

import { prisma } from '@/lib/prisma';
import type { Problem } from '@/types';

/**
 * Logs an error to the Postgres-backed problems table through Prisma.
 */
export async function logProblem(error: any, context: string, details?: Record<string, any>): Promise<void> {
    try {
        const problemData = {
            context,
            message: error.message || 'An unknown error occurred.',
            stack: error.stack || 'No stack trace available.',
            createdAt: new Date(),
            details: details ? safelySerializeDetails(details) : undefined,
        };

        await prisma.problem.create({
            data: problemData,
        });
    } catch (loggingError) {
        console.error(`[CRITICAL] Failed to log an error to Postgres from context: ${context}.`);
        console.error('Original Error:', error);
        console.error('Logging Error:', loggingError);
    }
}

/**
 * Retrieves a paginated list of problems from Postgres, sorted by creation date.
 */
export async function getProblems({ limit = 20, offset = 0 }: { limit?: number; offset?: number } = {}): Promise<{problems: Problem[], totalCount: number}> {
    try {
        const [totalCount, problemRows] = await Promise.all([
            prisma.problem.count(),
            prisma.problem.findMany({
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
            }),
        ]);

        const problems = problemRows.map((row) => {
            return {
                id: row.id,
                context: row.context,
                message: row.message,
                stack: row.stack || undefined,
                createdAt: row.createdAt.toISOString(),
                details: (row.details as Record<string, any> | null) || undefined,
            } as Problem;
        });

        return { problems, totalCount };

    } catch (error: any) {
        console.error("Error fetching problems from Postgres:", error);
        const fallbackProblem: Problem = {
            id: 'local-error-2',
            context: 'getProblems',
            message: error.message,
            stack: error.stack,
            createdAt: new Date().toISOString(),
            details: { info: "This is a fallback error object because the getProblems function failed.", originalError: error.message }
        };
        return { problems: [fallbackProblem], totalCount: 1 };
    }
}


/**
 * Deletes all documents in the 'problems' collection.
 */
export async function clearAllProblems(): Promise<{ success: boolean; error?: string }> {
    try {
        await prisma.problem.deleteMany();
        return { success: true };
    } catch (error: any) {
        // Don't try to log an error that happens while clearing logs to avoid loops.
        console.error("Failed to clear problems table:", error);
        return { success: false, error: (error as Error).message };
    }
}

function safelySerializeDetails(details: Record<string, any>): Record<string, any> {
    try {
        return JSON.parse(JSON.stringify(details));
    } catch {
        return {
            serializationError: 'Failed to serialize problem details.',
        };
    }
}
