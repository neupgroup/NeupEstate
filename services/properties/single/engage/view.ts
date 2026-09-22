'use server';

import type { Property } from '@/types';
import { getSavedProperties, getUsersBySavedProperty as getSavedPropertyUsers } from '../../view';
import { logProblem } from '@/services/problem-service';

export async function getSavedPropertiesForUser(userId: string): Promise<Property[]> {
  try { return await getSavedProperties(userId); }
  catch (error) { await logProblem(error, `getSavedPropertiesForUser (User: ${userId})`); return []; }
}

export async function getUsersBySavedProperty(propertyId: string): Promise<any[]> {
  try { return await getSavedPropertyUsers(propertyId); }
  catch (error) { await logProblem(error, `getUsersBySavedProperty (Property: ${propertyId})`); return []; }
}
