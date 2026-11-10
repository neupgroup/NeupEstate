'use server';

import type { Listing } from '@/types';
import { getSavedListings, getUsersBySavedListing as getSavedListingUsers } from '../../view';

export async function getSavedListingsForUser(userId: string): Promise<Listing[]> {
  try { return await getSavedListings(userId); }
  catch (error) { return []; }
}

export async function getUsersBySavedListing(propertyId: string): Promise<any[]> {
  try { return await getSavedListingUsers(propertyId); }
  catch (error) { return []; }
}
