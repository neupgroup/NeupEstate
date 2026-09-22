
'use server';

import { prisma } from '@neup/core/database/prisma';
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
