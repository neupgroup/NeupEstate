

import { getLatestSavedListings } from '@/services/listings';
import { SavedListingsDashboard } from '@/components/manage/saved-properties-dashboard';
import type { SavedListingEntry } from '@/services/listings';

export default async function ManageSavedListingsPage() {
    let latestSaved: SavedListingEntry[] = [];
    try {
        latestSaved = await getLatestSavedListings(20);
    } catch (e) {
        console.error("Failed to fetch latest saved properties:", e);
    }
    
    return <SavedListingsDashboard initialSavedListings={latestSaved} />;
}
