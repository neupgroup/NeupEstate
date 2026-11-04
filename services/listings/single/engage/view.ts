'use server';

import type { Listing } from '@/types';
import { getSavedListings, getUsersBySavedListing as getSavedListingUsers } from '../../view';
import { logger } from "@neup/logica/logger";

export async function getSavedListingsForUser(userId: string): Promise<Listing[]> {
  try { return await getSavedListings(userId); }
  catch (error) { await logger().type(`getSavedPropertiesForUser (User: ${userId})`).data({ error: String(error), details: {} }).log(); return []; }
}

export async function getUsersBySavedListing(propertyId: string): Promise<any[]> {
  try { return await getSavedListingUsers(propertyId); }
  catch (error) { await logger().type(`getUsersBySavedListing (Property: ${propertyId})`).data({ error: String(error), details: {} }).log(); return []; }
}
