"use client";

import { Control, useFormContext } from "react-hook-form";
import { CreatePropertyFormValues, PropertyCategorySchema, PropertyPurposeOptions, PropertyUsageTypeSchema } from "@/types";
import { FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { SelectionCards } from "@/components/ui/selection-cards";
import { deriveSelectionState, getDisabledNaturesByNature } from "@/services/property-selection-rules";
import { useEffect } from "react";

interface BasicDetailsSectionProps {
    control: Control<CreatePropertyFormValues>;
    fieldChangeNotes?: Partial<Record<'purposes' | 'categories' | 'types', string>>;
}

export function BasicDetailsSection({ control, fieldChangeNotes }: BasicDetailsSectionProps) {
    const { watch, setValue } = useFormContext<CreatePropertyFormValues>();
    const selectedPurposes = watch("purposes") || [];
    const selectedCategories = (watch("categories" as any) as unknown as string[]) || [];
    const selectedTypes = (watch("types" as any) as unknown as string[]) || [];
    const selectedCategory = selectedCategories[0];
    const selectedType = selectedTypes[0];

    const { disabledCategories, disabledPurposes, disabledNatures, autoNature } =
        deriveSelectionState(selectedCategories, selectedPurposes as string[]);
    const disabledNaturesByNature = getDisabledNaturesByNature(selectedTypes);
    const allDisabledNatures = new Set([...disabledNatures, ...disabledNaturesByNature]);

    // Auto-select nature when all categories imply it
    useEffect(() => {
        if (autoNature && !selectedTypes.includes(autoNature)) {
            setValue("types" as any, [autoNature], { shouldDirty: true });
        }
    }, [JSON.stringify(selectedCategories)]);

    // Clear disabled purposes when categories change
    useEffect(() => {
        const cleaned = (selectedPurposes as string[]).filter((p) => !disabledPurposes.has(p));
        if (cleaned.length !== selectedPurposes.length) {
            setValue("purposes", cleaned as any, { shouldDirty: true });
            setValue("purpose", cleaned[0] as any, { shouldDirty: true });
        }
    }, [JSON.stringify(selectedCategories)]);

    const togglePurpose = (option: string) => {
        const current = selectedPurposes as string[];
        const next = current.includes(option) ? current.filter((o) => o !== option) : [...current, option];
        setValue("purposes", next as any, { shouldDirty: true, shouldValidate: true });
        setValue("purpose", next[0] as any, { shouldDirty: true, shouldValidate: true });
    };

    const toggleCategory = (option: string) => {
        const isSelected = selectedCategories.includes(option);
        const next = isSelected
            ? selectedCategories.filter((c) => c !== option)
            : [...selectedCategories, option];
        setValue("categories" as any, next, { shouldDirty: true, shouldValidate: true });
    };

    const toggleType = (option: string) => {
        if (allDisabledNatures.has(option)) return;
        const isSelected = selectedTypes.includes(option);
        const next = isSelected
            ? selectedTypes.filter((t) => t !== option)
            : [...selectedTypes, option];
        setValue("types" as any, next, { shouldDirty: true, shouldValidate: true });
    };

    return (
        <section className="space-y-10">
            <FormField
                control={control}
                name="purposes"
                render={() => (
                    <FormItem>
                        <FormLabel className="text-base font-semibold">Property Purpose</FormLabel>
                        <SelectionCards
                            options={PropertyPurposeOptions}
                            selected={selectedPurposes as string[]}
                            onToggle={togglePurpose}
                            disabled={disabledPurposes}
                            multi
                        />
                        {fieldChangeNotes?.purposes && (
                            <p className="text-xs text-muted-foreground">{fieldChangeNotes.purposes}</p>
                        )}
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={control}
                name={"categories" as any}
                render={() => (
                    <FormItem>
                        <FormLabel className="text-base font-semibold">Property Type</FormLabel>
                        <SelectionCards
                            options={PropertyCategorySchema.options}
                            selected={selectedCategories}
                            onToggle={toggleCategory}
                            disabled={disabledCategories}
                            multi
                        />
                        {fieldChangeNotes?.categories && (
                            <p className="text-xs text-muted-foreground">{fieldChangeNotes.categories}</p>
                        )}
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={control}
                name={"types" as any}
                render={() => (
                    <FormItem>
                        <FormLabel className="text-base font-semibold">Property Nature</FormLabel>
                        <SelectionCards
                            options={PropertyUsageTypeSchema.options}
                            selected={selectedTypes}
                            onToggle={toggleType}
                            disabled={allDisabledNatures}
                            multi
                        />
                        {fieldChangeNotes?.types && (
                            <p className="text-xs text-muted-foreground">{fieldChangeNotes.types}</p>
                        )}
                        <FormMessage />
                    </FormItem>
                )}
            />
        </section>
    );
}
