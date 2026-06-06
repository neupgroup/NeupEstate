
"use client";

import { Control, useFieldArray, useFormContext } from "react-hook-form";
import Link from 'next/link';
import { CreatePropertyFormValues } from "@/types";
import { FormField, FormControl, FormMessage, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2 } from "lucide-react";
import { SafeImage } from "@/components/safe-image";

interface PropertyPhotosSectionProps {
    control: Control<CreatePropertyFormValues>;
    fieldChangeNotes?: Partial<Record<string, string>>;
}

export function PropertyPhotosSection({ control, fieldChangeNotes }: PropertyPhotosSectionProps) {
    const { watch } = useFormContext<CreatePropertyFormValues>();
    const { fields, append, remove } = useFieldArray({
        control: control as any,
        name: "images" as any
    });

    return (
        <section className="space-y-6">
            {fieldChangeNotes?.images && (
                <p className="text-xs text-muted-foreground">{fieldChangeNotes.images}</p>
            )}
            <div className="space-y-4">
                {fields.map((field, index) => (
                    <div key={field.id} className="relative">
                        <Link href={watch(`images.${index}`) || '#'} target="_blank" rel="noopener noreferrer" className="absolute left-2 top-1/2 -translate-y-1/2 z-10">
                            <SafeImage src={watch(`images.${index}`)} alt={`Preview ${index + 1}`} width={64} height={64} className="rounded-md object-cover w-16 h-16 border" fallbackSrc="https://placehold.co/64x64.png" data-ai-hint="house interior" />
                        </Link>
                        <FormField
                            control={control}
                            name={`images.${index}`}
                            render={({ field }) => (
                                <FormItem className="w-full">
                                    <FormControl>
                                        <Input placeholder="https://example.com/image.png" {...field} className="pl-24 pr-10 h-16" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-destructive hover:text-destructive" onClick={() => remove(index)} disabled={fields.length <= 1}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
                <Button type="button" variant="outline" className="w-full" onClick={() => append("")}><PlusCircle className="mr-2 h-4 w-4" />Add a photo of the apartment</Button>
            </div>
        </section>
    );
}
