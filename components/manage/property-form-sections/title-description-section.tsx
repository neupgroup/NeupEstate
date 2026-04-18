"use client";

import { Control } from "react-hook-form";
import { CreatePropertyFormValues } from "@/types";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface TitleDescriptionSectionProps {
    control: Control<CreatePropertyFormValues>;
}

export function TitleDescriptionSection({ control }: TitleDescriptionSectionProps) {
    return (
        <section className="space-y-6">
            <div className="space-y-1">
                <h2 className="text-2xl font-semibold leading-none tracking-tight">Title & Description</h2>
                <p className="text-sm text-muted-foreground">Keep the main listing copy right before the SEO fields.</p>
            </div>
            <div className="space-y-6">
                <FormField
                    control={control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Title</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., Modern Downtown Loft" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                                <Textarea placeholder="Describe the property..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        </section>
    );
}
