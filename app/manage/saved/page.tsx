

import { getLatestSavedProperties } from '@/services/property';
import { SavedPropertiesDashboard } from '@/components/manage/saved-properties-dashboard';
import type { SavedPropertyEntry } from '@/services/property';

export default async function ManageSavedPropertiesPage() {
    let latestSaved: SavedPropertyEntry[] = [];
    try {
        latestSaved = await getLatestSavedProperties(20);
    } catch (e) {
        console.error("Failed to fetch latest saved properties:", e);
    }
    
    return <SavedPropertiesDashboard initialSavedProperties={latestSaved} />;
}
