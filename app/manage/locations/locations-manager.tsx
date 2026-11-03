'use client';

import { useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@neup/components/ui/button';
import { Input } from '@neup/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@neup/components/ui/card';
import { createLocationAction, setLocationInactiveAction, updateLocationAction } from './actions';

type LocationRow = {
  id: string;
  title: string;
  type: string;
  childOf: string | null;
  postalCode: string | null;
  status: string;
};

const LOCATION_TYPES = [
  'country', 'province', 'area', 'municipality', 'ruralMunicipality',
  'subMetropolitanCity', 'metropolitanCity', 'locality',
];

// Renders the location creation form and editable location records.
export function LocationsManager({
  locations,
  allLocations,
  totalLocations,
  searchQuery,
}: {
  locations: LocationRow[];
  allLocations: LocationRow[];
  totalLocations: number;
  searchQuery: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState('');
  const [areaSearch, setAreaSearch] = useState(searchQuery);

  // Applies the area search and resets pagination to its first page.
  function searchAreas(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    const query = areaSearch.trim();
    if (query) params.set('area', query);
    else params.delete('area');
    params.delete('page');
    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  }

  // Runs a server action and presents its result without leaving the page.
  function runAction(action: () => Promise<void>, successMessage: string) {
    setMessage('');
    startTransition(async () => {
      try {
        await action();
        setMessage(successMessage);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Unable to save location.');
      }
    });
  }

  // Builds one reusable editor for both adding and updating locations.
  function LocationFields({ location }: { location?: LocationRow }) {
    const action = location
      ? updateLocationAction.bind(null, location.id)
      : createLocationAction;
    return (
      <form action={(formData) => runAction(() => action(formData), location ? 'Location updated.' : 'Location added.')} className="grid gap-3 md:grid-cols-6">
        <Input name="title" defaultValue={location?.title} placeholder="Title" required />
        <select name="type" defaultValue={location?.type ?? ''} required className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="" disabled>Type</option>
          {LOCATION_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
        <select name="childOf" defaultValue={location?.childOf ?? ''} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">No parent</option>
          {allLocations.filter((candidate) => candidate.id !== location?.id).map((candidate) => (
            <option key={candidate.id} value={candidate.id}>{candidate.title} ({candidate.type})</option>
          ))}
        </select>
        <Input name="postalCode" defaultValue={location?.postalCode ?? ''} placeholder="Postal code" />
        <Input name="status" defaultValue={location?.status ?? 'active'} placeholder="Status" required />
        <Button type="submit" disabled={isPending}>{location ? 'Save' : 'Add location'}</Button>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Locations</h1>
        <p className="mt-1 text-sm text-muted-foreground">Add and maintain the location hierarchy.</p>
      </div>
      {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
      <Card>
        <CardHeader><CardTitle>Add location</CardTitle><CardDescription>Create a location and optionally choose its parent.</CardDescription></CardHeader>
        <CardContent><LocationFields /></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>All locations</CardTitle><CardDescription>Showing {locations.length} of {totalLocations} locations</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={searchAreas} className="flex flex-col gap-2 sm:flex-row">
            <Input
              type="search"
              value={areaSearch}
              onChange={(event) => setAreaSearch(event.target.value)}
              placeholder="Search areas by name, type, or postal code"
              aria-label="Search locations by name, type, or postal code"
            />
            <Button type="submit" variant="outline">Search</Button>
          </form>
          {locations.length === 0 && <p className="text-sm text-muted-foreground">No locations match this search.</p>}
          {locations.map((location) => (
            <div key={location.id} className="space-y-3 rounded-md border p-4">
              <LocationFields location={location} />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{location.status}{location.childOf ? ` · Parent: ${allLocations.find((item) => item.id === location.childOf)?.title ?? 'Unknown'}` : ''}</span>
                {location.status !== 'inactive' && (
                  <Button variant="outline" size="sm" disabled={isPending} onClick={() => runAction(() => setLocationInactiveAction(location.id), `${location.title} marked inactive.`)}>Mark inactive</Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
