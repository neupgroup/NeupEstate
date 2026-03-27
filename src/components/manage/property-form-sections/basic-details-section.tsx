
"use client";

import { Control, useFormContext } from "react-hook-form";
import { CreatePropertyFormValues, PropertyCategorySchema, PropertyPurposeOptions, PropertyUsageTypeSchema } from "@/types";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface BasicDetailsSectionProps {
    control: Control<CreatePropertyFormValues>;
}

export function BasicDetailsSection({ control }: BasicDetailsSectionProps) {
    const { watch, setValue } = useFormContext<CreatePropertyFormValues>();
    const selectedPurposes = watch("purposes") || [];

    const togglePurpose = (option: typeof PropertyPurposeOptions[number]) => {
        const nextPurposes = selectedPurposes.includes(option)
            ? selectedPurposes.filter((selectedOption) => selectedOption !== option)
            : [...selectedPurposes, option];

        setValue("purposes", nextPurposes, { shouldDirty: true, shouldValidate: true });
        setValue("purpose", nextPurposes[0], { shouldDirty: true, shouldValidate: true });
    };

    return (
        <section className="space-y-6">
            <div className="space-y-1">
                <h2 className="text-2xl font-semibold leading-none tracking-tight">Property Basics</h2>
                <p className="text-sm text-muted-foreground">Set the listing purpose, category, and usage type.</p>
            </div>
            <div className="space-y-6">
                <FormField
                    control={control}
                    name="purposes"
                    render={() => (
                        <FormItem>
                            <FormLabel>Purpose</FormLabel>
                            <div className="flex flex-wrap gap-2">
                                {PropertyPurposeOptions.map((option) => {
                                    const selectionIndex = selectedPurposes.indexOf(option);
                                    const isSelected = selectionIndex !== -1;
                                    const showOrder = isSelected && selectedPurposes.length > 1;

                                    return (
                                        <button
                                            key={option}
                                            type="button"
                                            onClick={() => togglePurpose(option)}
                                            className={cn(
                                                "flex items-center justify-center gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                                                isSelected && "border-transparent bg-primary text-primary-foreground"
                                            )}
                                            aria-pressed={isSelected}
                                        >
                                            <span>{option}</span>
                                            {showOrder && (
                                                <span
                                                    key={`${option}-${selectionIndex + 1}`}
                                                    className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-current px-1 text-xs animate-in fade-in-0 zoom-in-50 duration-200"
                                                >
                                                    {selectionIndex + 1}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                The first selected purpose is primary. Additional selections are ordered as secondary, tertiary, and so on.
                            </p>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={control}
                    name="category"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Category</FormLabel>
                            <FormControl>
                                <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-wrap gap-2">
                                    {PropertyCategorySchema.options.map((option) => (
                                        <FormItem key={option}>
                                            <FormControl><RadioGroupItem value={option} id={`category-${option}`} className="sr-only peer" /></FormControl>
                                            <Label htmlFor={`category-${option}`} className={cn("flex cursor-pointer items-center justify-center rounded-md border border-input bg-transparent px-3 py-1 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-transparent peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground")}>{option}</Label>
                                        </FormItem>
                                    ))}
                                </RadioGroup>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={control}
                    name="type"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Usage Type</FormLabel>
                            <FormControl>
                                <RadioGroup onValueChange={field.onChange} value={field.value} className="flex flex-wrap gap-2">
                                    {PropertyUsageTypeSchema.options.map((option) => (
                                        <FormItem key={option}>
                                            <FormControl><RadioGroupItem value={option} id={`type-${option}`} className="sr-only peer" /></FormControl>
                                            <Label htmlFor={`type-${option}`} className={cn("flex cursor-pointer items-center justify-center rounded-md border border-input bg-transparent px-3 py-1 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-transparent peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground")}>{option}</Label>
                                        </FormItem>
                                    ))}
                                </RadioGroup>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        </section>
    );
}
