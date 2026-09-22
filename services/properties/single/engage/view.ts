'use server';

import type { Property } from '@/types';
import { getSavedProperties, getUsersBySavedProperty as getSavedPropertyUsers } from '../../view';
import { logger } from "@neup/logica/logger";

export async function getSavedPropertiesForUser(userId: string): Promise<Property[]> {
  try { return await getSavedProperties(userId); }
  catch (error) { await logger().type(`getSavedPropertiesForUser (User: ${userId})`).data({ error: String(error), details: {} }).log(); return []; }
}

export async function getUsersBySavedProperty(propertyId: string): Promise<any[]> {
  try { return await getSavedPropertyUsers(propertyId); }
  catch (error) { await logger().type(`getUsersBySavedProperty (Property: ${propertyId})`).data({ error: String(error), details: {} }).log(); return []; }
}
