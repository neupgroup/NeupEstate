
"use client";

import { Control } from "react-hook-form";
import { CreatePropertyFormValues } from "@/types";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface SeoSectionProps {
    control: Control<CreatePropertyFormValues>;
    isEditForm: boolean;
}

export function SeoSection({ control, isEditForm }: SeoSectionProps) {
    return (
        <section className="space-y-6">
            <div className="space-y-1">
                <h2 className="text-2xl font-semibold leading-none tracking-tight">SEO & Metadata</h2>
                <p className="text-sm text-muted-foreground">Optimize the listing for search engines.</p>
            </div>
            <div className="space-y-4">
                {isEditForm && (
                     <FormField
                        control={control}
                        name="slug"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>URL Slug</FormLabel>
                                <FormControl>
                                    <Input readOnly placeholder="e.g., modern-downtown-loft-xyz123" {...field} />
                                </FormControl>
                                <FormDescription>
                                    The unique URL for this property. Generated via AI Rewrite.
                                </FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
                <FormField
                    control={control}
                    name="metaTitle"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Meta Title</FormLabel>
                            <FormControl>
                                <Input placeholder="SEO Title (max 60 chars)" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={control}
                    name="metaDescription"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Meta Description</FormLabel>
                            <FormControl>
                                <Textarea placeholder="SEO Description (max 160 chars)" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={control}
                    name="metaTags"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Meta Tags (comma-separated)</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g., loft, downtown, modern" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        </section>
    );
}
