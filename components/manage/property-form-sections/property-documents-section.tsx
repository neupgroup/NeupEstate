
"use client";

import { Control, useFieldArray } from "react-hook-form";
import { CreatePropertyFormValues } from "@/types";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";

// Sub-component to handle nested useFieldArray
function DocumentGroup({ control, index: docIndex, remove }: { control: Control<CreatePropertyFormValues>, index: number, remove: (index: number) => void }) {
    const { fields: urlFields, append: appendUrl, remove: removeUrl } = useFieldArray({
        control,
        name: `documents.${docIndex}.urls`
    });

    return (
        <div className="p-4 border rounded-md space-y-4">
            <div className="flex justify-between items-center">
                <FormLabel>Document Group {docIndex + 1}</FormLabel>
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(docIndex)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
            <FormField
                control={control}
                name={`documents.${docIndex}.name`}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Document Group Name</FormLabel>
                        <FormControl><Input placeholder="e.g., Citizenship, Land Ownership Certificate" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <div className="space-y-2">
                <Label>Document Links</Label>
                {urlFields.map((urlField, urlIndex) => (
                    <div key={urlField.id} className="relative">
                        <FormField
                            control={control}
                            name={`documents.${docIndex}.urls.${urlIndex}.value`}
                            render={({ field }) => (
                                <FormItem className="flex-grow">
                                    <FormControl><Input placeholder="https://example.com/doc.pdf" {...field} className="pr-10" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeUrl(urlIndex)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => appendUrl({ value: '' })}><PlusCircle className="mr-2 h-4 w-4" />Add Link</Button>
            </div>
        </div>
    );
}

interface PropertyDocumentsSectionProps {
    control: Control<CreatePropertyFormValues>;
}

export function PropertyDocumentsSection({ control }: PropertyDocumentsSectionProps) {
    const { fields, append, remove } = useFieldArray({
        control,
        name: "documents"
    });

    return (
        <section className="space-y-6">
            <div className="space-y-4">
                {fields.map((field, index) => (
                    <DocumentGroup
                        key={field.id}
                        control={control}
                        index={index}
                        remove={remove}
                    />
                ))}
                <Button type="button" variant="outline" className="w-full" onClick={() => append({ name: '', urls: [{ value: '' }] })}><PlusCircle className="mr-2 h-4 w-4" />Add property documents (pdf/jpeg/doc)</Button>
            </div>
        </section>
    );
}
