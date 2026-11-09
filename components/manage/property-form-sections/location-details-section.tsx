
"use client";

import { useEffect, useState } from "react";
import { Control, useWatch } from "react-hook-form";
import { CreateListingFormValues } from "@/types";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@neup/components/ui/input";

interface LocationDetailsSectionProps {
    control: Control<CreateListingFormValues>;
    fieldChangeNotes?: Partial<Record<string, string>>;
}

type LocationOption = {
    id: string;
    title: string;
    type: string;
    parent: { title: string } | null;
};

export function LocationDetailsSection({ control, fieldChangeNotes }: LocationDetailsSectionProps) {
    const [locationQuery, setLocationQuery] = useState("");
    const [locations, setLocations] = useState<LocationOption[]>([]);
    const [locationsLoading, setLocationsLoading] = useState(false);
    const basePath = process.env.NEXT_PUBLIC_APP_BASEPATH ?? '';
    const selectedLocationId = useWatch({ control, name: 'locationId' });

    // Search active location records and keep the selected value as the location UUID.
    useEffect(() => {
        let isCurrent = true;
        const timeout = window.setTimeout(async () => {
            setLocationsLoading(true);
            try {
                const params = new URLSearchParams({ query: locationQuery, limit: '100' });
                const response = await fetch(`${basePath}/bridge/api.v1/locations?${params.toString()}`);
                const result = await response.json() as { data?: LocationOption[] };
                let nextLocations = Array.isArray(result.data) ? result.data : [];
                if (selectedLocationId && !nextLocations.some((location) => location.id === selectedLocationId)) {
                    const selectedParams = new URLSearchParams({ id: selectedLocationId, limit: '1' });
                    const selectedResponse = await fetch(`${basePath}/bridge/api.v1/locations?${selectedParams.toString()}`);
                    const selectedResult = await selectedResponse.json() as { data?: LocationOption[] };
                    nextLocations = [...(selectedResult.data ?? []), ...nextLocations];
                }
                if (isCurrent) setLocations(nextLocations);
            } catch {
                if (isCurrent) setLocations([]);
            } finally {
                if (isCurrent) setLocationsLoading(false);
            }
        }, 250);

        return () => {
            isCurrent = false;
            window.clearTimeout(timeout);
        };
    }, [basePath, locationQuery, selectedLocationId]);

    return (
        <section className="space-y-10">
            <div className="space-y-8">
                <div className="space-y-3">
                    <FormItem>
                        <FormLabel>Property location</FormLabel>
                        <FormControl>
                            <Input value={locationQuery} onChange={(event) => setLocationQuery(event.target.value)} placeholder="Search locations" />
                        </FormControl>
                    </FormItem>
                    <FormField control={control} name="locationId" render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <select {...field} className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                    <option value="">{locationsLoading ? 'Loading locations…' : 'Choose a location'}</option>
                                    {locations.map((location) => (
                                        <option key={location.id} value={location.id}>
                                            {[location.title, location.parent?.title].filter(Boolean).join(', ')}
                                        </option>
                                    ))}
                                </select>
                            </FormControl>
                            {fieldChangeNotes?.locationId && <p className="text-xs text-muted-foreground">{fieldChangeNotes.locationId}</p>}
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField control={control} name="structuredLocation.country" render={({ field }) => (<FormItem><FormLabel>Country</FormLabel><FormControl><Input placeholder="e.g., Nepal" {...field} /></FormControl>{fieldChangeNotes?.["structuredLocation.country"] && <p className="text-xs text-muted-foreground">{fieldChangeNotes["structuredLocation.country"]}</p>}<FormMessage /></FormItem>)} />
                    <FormField control={control} name="structuredLocation.province" render={({ field }) => (<FormItem><FormLabel>Province/State</FormLabel><FormControl><Input placeholder="e.g., Bagmati" {...field} /></FormControl>{fieldChangeNotes?.["structuredLocation.province"] && <p className="text-xs text-muted-foreground">{fieldChangeNotes["structuredLocation.province"]}</p>}<FormMessage /></FormItem>)} />
                    <FormField control={control} name="structuredLocation.district" render={({ field }) => (<FormItem><FormLabel>District</FormLabel><FormControl><Input placeholder="e.g., Kathmandu" {...field} /></FormControl>{fieldChangeNotes?.["structuredLocation.district"] && <p className="text-xs text-muted-foreground">{fieldChangeNotes["structuredLocation.district"]}</p>}<FormMessage /></FormItem>)} />
                    <FormField control={control} name="structuredLocation.municipality" render={({ field }) => (<FormItem><FormLabel>Municipality</FormLabel><FormControl><Input placeholder="e.g., Metropolitan City/Municipality" {...field} /></FormControl>{fieldChangeNotes?.["structuredLocation.municipality"] && <p className="text-xs text-muted-foreground">{fieldChangeNotes["structuredLocation.municipality"]}</p>}<FormMessage /></FormItem>)} />
                    <FormField control={control} name="structuredLocation.ward" render={({ field }) => (<FormItem><FormLabel>Ward No.</FormLabel><FormControl><Input type="number" placeholder="e.g., 1" {...field} /></FormControl>{fieldChangeNotes?.["structuredLocation.ward"] && <p className="text-xs text-muted-foreground">{fieldChangeNotes["structuredLocation.ward"]}</p>}<FormMessage /></FormItem>)} />
                </div>
                <FormField control={control} name="structuredLocation.street" render={({ field }) => (<FormItem><FormLabel>Street/Tole</FormLabel><FormControl><Input placeholder="e.g., Sorhakhutte" {...field} /></FormControl>{fieldChangeNotes?.["structuredLocation.street"] && <p className="text-xs text-muted-foreground">{fieldChangeNotes["structuredLocation.street"]}</p>}<FormMessage /></FormItem>)} />
                <FormField control={control} name="structuredLocation.landmark" render={({ field }) => (<FormItem><FormLabel>Landmark</FormLabel><FormControl><Input placeholder="e.g., Near Petrol Pump" {...field} /></FormControl>{fieldChangeNotes?.["structuredLocation.landmark"] && <p className="text-xs text-muted-foreground">{fieldChangeNotes["structuredLocation.landmark"]}</p>}<FormMessage /></FormItem>)} />
                <FormField control={control} name="structuredLocation.coordinates" render={({ field }) => (<FormItem><FormLabel>Location Coordinates</FormLabel><FormControl><Input placeholder="e.g., 27.7172, 85.324" {...field} /></FormControl>{fieldChangeNotes?.["structuredLocation.coordinates"] && <p className="text-xs text-muted-foreground">{fieldChangeNotes["structuredLocation.coordinates"]}</p>}<FormMessage /></FormItem>)} />
            </div>
        </section>
    );
}
