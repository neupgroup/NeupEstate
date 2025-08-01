

'use server';

import type { User } from '@/types';
import { getDbAdapter } from '@/lib/database';
import { logProblem } from './problem-service';

export async function getUsers(): Promise<User[]> {
    const db = getDbAdapter();
    try {
        return await db.getUsers();
    } catch(error) {
        await logProblem(error, 'getUsers service');
        return [];
    }
}
