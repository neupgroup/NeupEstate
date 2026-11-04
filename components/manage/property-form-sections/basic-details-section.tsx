"use client";

import { Control, useFormContext } from "react-hook-form";
import { CreateListingFormValues, ListingCategorySchema, ListingPurposeOptions, ListingUsageTypeSchema } from "@/types";
import { FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { SelectionCards } from "@/components/ui/selection-cards";
import { deriveSelectionState, getDisabledNaturesByNature } from "@/services/listings/selection-logic";
import { useEffect } from "react";

interface BasicDetailsSectionProps {
    control: Control<CreateListingFormValues>;
    fieldChangeNotes?: Partial<Record<'purpose' | 'category' | 'types', string>>;
}

export function BasicDetailsSection({ control, fieldChangeNotes }: BasicDetailsSectionProps) {
    const { watch, setValue } = useFormContext<CreateListingFormValues>();
    const selectedPurpose = watch("purpose");
    const selectedCategoryValue = watch("category");
    const selectedPurposes = selectedPurpose ? [selectedPurpose] : [];
    const selectedCategories = selectedCategoryValue ? [selectedCategoryValue] : [];
    const selectedTypes = (watch("types" as any) as unknown as string[]) || [];
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
            setValue("purpose", cleaned[0] as any, { shouldDirty: true });
        }
    }, [JSON.stringify(selectedCategories)]);

    const togglePurpose = (option: string) => {
        setValue("purpose", option as any, { shouldDirty: true, shouldValidate: true });
    };

    const toggleCategory = (option: string) => {
        setValue("category", option as any, { shouldDirty: true, shouldValidate: true });
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
                name="purpose"
                render={() => (
                    <FormItem>
                        <FormLabel className="text-base font-semibold">Listing Purpose</FormLabel>
                        <SelectionCards
                            options={ListingPurposeOptions}
                            selected={selectedPurposes as string[]}
                            onToggle={togglePurpose}
                            disabled={disabledPurposes}
                        />
                        {fieldChangeNotes?.purpose && (
                            <p className="text-xs text-muted-foreground">{fieldChangeNotes.purpose}</p>
                        )}
                        <FormMessage />
                    </FormItem>
                )}
            />

            <FormField
                control={control}
                name="category"
                render={() => (
                    <FormItem>
                        <FormLabel className="text-base font-semibold">Listing Type</FormLabel>
                        <SelectionCards
                            options={ListingCategorySchema.options}
                            selected={selectedCategories}
                            onToggle={toggleCategory}
                            disabled={disabledCategories}
                        />
                        {fieldChangeNotes?.category && (
                            <p className="text-xs text-muted-foreground">{fieldChangeNotes.category}</p>
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
                        <FormLabel className="text-base font-semibold">Listing Nature</FormLabel>
                        <SelectionCards
                            options={ListingUsageTypeSchema.options}
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
