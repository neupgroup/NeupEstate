
"use client";

import { Control } from "react-hook-form";
import { CreatePropertyFormValues } from "@/types";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

interface FeaturesAmenitiesSectionProps {
    control: Control<CreatePropertyFormValues>;
}

export function FeaturesAmenitiesSection({ control }: FeaturesAmenitiesSectionProps) {
    return (
        <section className="space-y-6">
            <div className="space-y-1">
                <h2 className="text-2xl font-semibold leading-none tracking-tight">Features and Amenities</h2>
                <p className="text-sm text-muted-foreground">List all available amenities.</p>
            </div>
            <div>
                <FormField
                    control={control}
                    name="amenities"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Amenities (comma-separated)</FormLabel>
                            <FormControl>
                                <Textarea placeholder="e.g., Gym, Swimming Pool, Full Furnished" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        </section>
    );
}
