
"use client";

import { Control, useFieldArray, useFormContext } from "react-hook-form";
import { useState } from "react";
import { CreatePropertyFormValues } from "@/types";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { useToast } from "@/core/hooks/use-toast";
import { uploadPropertyMediaFile } from "./media-upload";

// Sub-component to handle nested useFieldArray
function DocumentGroup({ control, index: docIndex, remove }: { control: Control<CreatePropertyFormValues>, index: number, remove: (index: number) => void }) {
    const { getValues, setValue } = useFormContext<CreatePropertyFormValues>();
    const { toast } = useToast();
    const [isUploading, setIsUploading] = useState(false);
    const { fields: urlFields, append: appendUrl, remove: removeUrl } = useFieldArray({
        control,
        name: `documents.${docIndex}.urls`
    });

    async function handleUploadFiles(files: FileList | null) {
        const selectedFiles = Array.from(files ?? []);
        if (!selectedFiles.length) return;

        setIsUploading(true);
        try {
            let uploadedCount = 0;
            let firstErrorMessage: string | null = null;
            for (const file of selectedFiles) {
                try {
                    const url = await uploadPropertyMediaFile({
                        file,
                        platform: "property",
                        contentIds: ["documents"],
                    });

                    const currentUrls = getValues(`documents.${docIndex}.urls`) || [];
                    const firstUrl = String(getValues(`documents.${docIndex}.urls.0.value`) ?? "").trim();

                    if (uploadedCount === 0 && currentUrls.length <= 1 && !firstUrl) {
                        setValue(`documents.${docIndex}.urls.0.value` as any, url, { shouldDirty: true, shouldValidate: true });
                    } else {
                        appendUrl({ value: url });
                    }

                    uploadedCount += 1;
                } catch (error) {
                    if (!firstErrorMessage) {
                        firstErrorMessage = error instanceof Error ? error.message : "Unable to upload one of the selected documents.";
                    }
                }
            }

            if (uploadedCount > 0 && !firstErrorMessage) {
                toast({
                    title: "Documents uploaded",
                    description: `${uploadedCount} document${uploadedCount === 1 ? "" : "s"} saved to the CDN.`,
                });
            } else if (uploadedCount > 0 && firstErrorMessage) {
                toast({
                    variant: "destructive",
                    title: "Some documents failed to upload",
                    description: firstErrorMessage,
                });
            } else if (firstErrorMessage) {
                toast({
                    variant: "destructive",
                    title: "Document upload failed",
                    description: firstErrorMessage,
                });
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Document upload failed",
                description: error instanceof Error ? error.message : "Unable to upload the selected documents.",
            });
        } finally {
            setIsUploading(false);
        }
    }

    return (
        <div className="p-4 border rounded-md space-y-6">
            <div className="flex justify-between items-center">
                <FormLabel>Document Group {docIndex + 1}</FormLabel>
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(docIndex)} disabled={isUploading}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
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
            <div className="space-y-4">
                <Label>Document Links</Label>
                <Input
                    type="file"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.webp,.svg"
                    multiple
                    disabled={isUploading}
                    onChange={(event) => {
                        void handleUploadFiles(event.target.files);
                        event.currentTarget.value = "";
                    }}
                />
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
                <Button type="button" variant="outline" size="sm" onClick={() => appendUrl({ value: '' })} disabled={isUploading}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Link
                </Button>
            </div>
        </div>
    );
}

interface PropertyDocumentsSectionProps {
    control: Control<CreatePropertyFormValues>;
    fieldChangeNotes?: Partial<Record<string, string>>;
}

export function PropertyDocumentsSection({ control, fieldChangeNotes }: PropertyDocumentsSectionProps) {
    const { fields, append, remove } = useFieldArray({
        control,
        name: "documents"
    });

    return (
        <section className="space-y-10">
            {fieldChangeNotes?.documents && (
                <p className="text-xs text-muted-foreground">{fieldChangeNotes.documents}</p>
            )}
            <div className="space-y-6">
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
