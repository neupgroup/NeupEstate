
"use client";

import { Control } from "react-hook-form";
import { CreatePropertyFormValues } from "@/types";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface LocationDetailsSectionProps {
    control: Control<CreatePropertyFormValues>;
    fieldChangeNotes?: Partial<Record<string, string>>;
}

export function LocationDetailsSection({ control, fieldChangeNotes }: LocationDetailsSectionProps) {
    return (
        <section className="space-y-6">
            <div className="space-y-6">
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
