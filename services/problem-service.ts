
'use server';

import { prisma } from '@/core/database/prisma';
import type { Problem } from '@/types';
import { promises as fsp } from 'fs';
import path from 'path';

let suspendProblemLoggingUntil = 0;
const ERROR_LOG_DIR = path.join(process.cwd(), 'logs');
const ERROR_LOG_FILE = path.join(ERROR_LOG_DIR, 'errors.log');

type ErrorLogEntry = {
    timestamp: string;
    context: string;
    message: string;
    stack: string;
    details?: Record<string, unknown>;
    source: 'problem-service';
};

async function appendErrorLog(entry: ErrorLogEntry): Promise<void> {
    try {
        await fsp.mkdir(ERROR_LOG_DIR, { recursive: true });
        await fsp.appendFile(ERROR_LOG_FILE, `${JSON.stringify(entry)}\n`, 'utf8');
    } catch (fileError) {
        console.error('[CRITICAL] Failed to write to logs/errors.log');
        console.error('Log write error:', fileError);
    }
}

/**
 * Logs an error to the Postgres-backed problems table through Prisma.
 */
export async function logProblem(error: unknown, context: string, details?: Record<string, unknown>): Promise<void> {
    const normalizedError = error instanceof Error ? error : new Error(String(error));
    const serializedDetails = details ? safelySerializeDetails(details) : undefined;

    await appendErrorLog({
        timestamp: new Date().toISOString(),
        context,
        message: normalizedError.message || 'An unknown error occurred.',
        stack: normalizedError.stack || 'No stack trace available.',
        details: serializedDetails,
        source: 'problem-service',
    });

    if (Date.now() < suspendProblemLoggingUntil) {
        console.error(`[WARN] Skipping problem logging for context: ${context} because Prisma logging is temporarily suspended.`);
        console.error('Original Error:', normalizedError);
        return;
    }

    try {
        const problemData = {
            context,
            message: normalizedError.message || 'An unknown error occurred.',
            stack: normalizedError.stack || 'No stack trace available.',
            createdAt: new Date(),
            details: serializedDetails as any,
        };

        await prisma.problem.create({
            data: problemData,
        });
    } catch (loggingError: unknown) {
        if (isPrismaPoolTimeoutError(loggingError)) {
            suspendProblemLoggingUntil = Date.now() + 30_000;
        }

        console.error(`[CRITICAL] Failed to log an error to Postgres from context: ${context}.`);
        console.error('Original Error:', normalizedError);
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
        await appendErrorLog({
            timestamp: new Date().toISOString(),
            context: 'getProblems',
            message: error?.message ?? 'Error fetching problems from Postgres',
            stack: error?.stack ?? 'No stack trace available.',
            source: 'problem-service',
        });
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
        await appendErrorLog({
            timestamp: new Date().toISOString(),
            context: 'clearAllProblems',
            message: error?.message ?? 'Failed to clear problems table',
            stack: error?.stack ?? 'No stack trace available.',
            source: 'problem-service',
        });
        return { success: false, error: (error as Error).message };
    }
}

function safelySerializeDetails(details: Record<string, unknown>): Record<string, unknown> {
    try {
        return JSON.parse(JSON.stringify(details));
    } catch {
        return {
            serializationError: 'Failed to serialize problem details.',
        };
    }
}

function isPrismaPoolTimeoutError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
        return false;
    }

    const candidate = error as { code?: string; message?: string };
    return (
        candidate.code === 'P2024' ||
        candidate.message?.includes('Timed out fetching a new connection from the connection pool') === true
    );
}
