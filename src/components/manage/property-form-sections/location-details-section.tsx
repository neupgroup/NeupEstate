
"use client";

import { Control } from "react-hook-form";
import { CreatePropertyFormValues } from "@/types";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface LocationDetailsSectionProps {
    control: Control<CreatePropertyFormValues>;
}

export function LocationDetailsSection({ control }: LocationDetailsSectionProps) {
    return (
        <section className="space-y-6">
            <div className="space-y-1">
                <h2 className="text-2xl font-semibold leading-none tracking-tight">Location Details</h2>
                <p className="text-sm text-muted-foreground">Enter the full address of the property.</p>
            </div>
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField control={control} name="structuredLocation.country" render={({ field }) => (<FormItem><FormLabel>Country</FormLabel><FormControl><Input placeholder="e.g., Nepal" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={control} name="structuredLocation.province" render={({ field }) => (<FormItem><FormLabel>Province/State</FormLabel><FormControl><Input placeholder="e.g., Bagmati" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={control} name="structuredLocation.district" render={({ field }) => (<FormItem><FormLabel>District</FormLabel><FormControl><Input placeholder="e.g., Kathmandu" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={control} name="structuredLocation.municipality" render={({ field }) => (<FormItem><FormLabel>Municipality</FormLabel><FormControl><Input placeholder="e.g., Metropolitan City/Municipality" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={control} name="structuredLocation.ward" render={({ field }) => (<FormItem><FormLabel>Ward No.</FormLabel><FormControl><Input type="number" placeholder="e.g., 1" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                <FormField control={control} name="structuredLocation.street" render={({ field }) => (<FormItem><FormLabel>Street/Tole</FormLabel><FormControl><Input placeholder="e.g., Sorhakhutte" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={control} name="structuredLocation.landmark" render={({ field }) => (<FormItem><FormLabel>Landmark</FormLabel><FormControl><Input placeholder="e.g., Near Petrol Pump" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={control} name="structuredLocation.coordinates" render={({ field }) => (<FormItem><FormLabel>Location Coordinates</FormLabel><FormControl><Input placeholder="e.g., 27.7172, 85.324" {...field} /></FormControl><FormMessage /></FormItem>)} />
            </div>
        </section>
    );
}
