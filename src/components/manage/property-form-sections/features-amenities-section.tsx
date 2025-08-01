
"use client";

import { Control } from "react-hook-form";
import { CreatePropertyFormValues } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

interface FeaturesAmenitiesSectionProps {
    control: Control<CreatePropertyFormValues>;
}

export function FeaturesAmenitiesSection({ control }: FeaturesAmenitiesSectionProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Features and Amenities</CardTitle>
                <CardDescription>List all available amenities.</CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
        </Card>
    );
}
