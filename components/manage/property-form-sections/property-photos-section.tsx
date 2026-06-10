
"use client";

import { Control, useFieldArray, useFormContext } from "react-hook-form";
import { useRef, useState } from "react";
import Link from 'next/link';
import { CreatePropertyFormValues } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusCircle, ImagePlus, GripVertical, Trash2 } from "lucide-react";
import { SafeImage } from "@/components/safe-image";
import { useToast } from "@/logica/core/hooks/use-toast";
import { uploadPropertyMediaFile } from "./media-upload";

interface PropertyPhotosSectionProps {
    control: Control<CreatePropertyFormValues>;
    fieldChangeNotes?: Partial<Record<string, string>>;
}

export function PropertyPhotosSection({ control, fieldChangeNotes }: PropertyPhotosSectionProps) {
    const { watch, getValues, setValue } = useFormContext<CreatePropertyFormValues>();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const { fields, append, remove, move } = useFieldArray({
        control: control as any,
        name: "images" as any
    });

    function handleDropOnIndex(targetIndex: number) {
        if (dragIndex === null || dragIndex === targetIndex) return;
        move(dragIndex, targetIndex);
        setDragIndex(targetIndex);
    }

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
                        contentIds: ["images"],
                    });

                    const currentImages = getValues("images") || [];
                    const firstImage = String(getValues("images.0" as any) ?? "").trim();

                    if (uploadedCount === 0 && currentImages.length <= 1 && !firstImage) {
                        setValue("images.0" as any, url, { shouldDirty: true, shouldValidate: true });
                    } else {
                        append(url);
                    }

                    uploadedCount += 1;
                } catch (error) {
                    if (!firstErrorMessage) {
                        firstErrorMessage = error instanceof Error ? error.message : "Unable to upload one of the selected photos.";
                    }
                }
            }

            if (uploadedCount > 0 && !firstErrorMessage) {
                toast({
                    title: "Photos uploaded",
                    description: `${uploadedCount} photo${uploadedCount === 1 ? "" : "s"} saved to the CDN.`,
                });
            } else if (uploadedCount > 0 && firstErrorMessage) {
                toast({
                    variant: "destructive",
                    title: "Some photos failed to upload",
                    description: firstErrorMessage,
                });
            } else if (firstErrorMessage) {
                toast({
                    variant: "destructive",
                    title: "Photo upload failed",
                    description: firstErrorMessage,
                });
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Photo upload failed",
                description: error instanceof Error ? error.message : "Unable to upload the selected photos.",
            });
        } finally {
            setIsUploading(false);
        }
    }

    return (
        <section className="space-y-10">
            {fieldChangeNotes?.images && (
                <p className="text-xs text-muted-foreground">{fieldChangeNotes.images}</p>
            )}
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="group flex aspect-square flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-muted-foreground/30 bg-muted/20 p-4 text-center transition hover:border-primary/60 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-background shadow-sm ring-1 ring-border">
                            <ImagePlus className="h-6 w-6 text-muted-foreground transition group-hover:text-primary" />
                        </span>
                        <div className="space-y-1">
                            <p className="font-medium">Add images</p>
                            <p className="text-xs text-muted-foreground">Drop photos into square cards</p>
                        </div>
                    </button>

                    {fields.map((field, index) => {
                        const imageUrl = watch(`images.${index}`) || "";
                        const isDragging = dragIndex === index;
                        return (
                            <div
                                key={field.id}
                                draggable
                                onDragStart={() => setDragIndex(index)}
                                onDragEnd={() => setDragIndex(null)}
                                onDragOver={(event) => event.preventDefault()}
                                onDrop={() => handleDropOnIndex(index)}
                                className={`group relative overflow-hidden rounded-2xl border bg-card shadow-sm transition ${isDragging ? "scale-[0.98] ring-2 ring-primary/60" : "hover:shadow-md"}`}
                            >
                                <div className="relative aspect-square bg-muted">
                                    <Link href={imageUrl || "#"} target="_blank" rel="noopener noreferrer" className="block h-full w-full">
                                        <SafeImage
                                            src={imageUrl}
                                            alt={`Preview ${index + 1}`}
                                            width={600}
                                            height={600}
                                            className="h-full w-full object-cover"
                                            fallbackSrc="https://placehold.co/600x600.png"
                                            data-ai-hint="house interior"
                                        />
                                    </Link>
                                    <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[11px] font-medium text-white">
                                        <GripVertical className="h-3.5 w-3.5" />
                                        {index + 1}
                                    </div>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="icon"
                                        className="absolute right-2 top-2 h-7 w-7 rounded-full bg-white/90 text-foreground shadow-md hover:bg-white"
                                        onClick={() => remove(index)}
                                        disabled={fields.length <= 1}
                                        aria-label={`Remove image ${index + 1}`}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 pb-2 pt-8">
                                        <p className="truncate text-xs font-medium text-white">Drag to reorder</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <Input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.svg"
                    multiple
                    className="hidden"
                    disabled={isUploading}
                    onChange={(event) => {
                        void handleUploadFiles(event.target.files);
                        event.currentTarget.value = "";
                    }}
                />
            </div>
        </section>
    );
}
