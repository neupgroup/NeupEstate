"use client";

import { Control, useFormContext } from "react-hook-form";
import { CreatePropertyFormValues, PropertyCategorySchema, PropertyPurposeOptions, PropertyUsageTypeSchema } from "@/types";
import { FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { deriveSelectionState, getDisabledNaturesByNature } from "@/services/property-selection-rules";
import { useEffect } from "react";

interface BasicDetailsSectionProps {
    control: Control<CreatePropertyFormValues>;
}

type SelectionCardsProps = {
    options: readonly string[];
    selected: string[];
    onToggle: (option: string) => void;
    disabled?: Set<string>;
    multi?: boolean;
    lockLastSelected?: boolean;
};

function SelectionCards({ options, selected, onToggle, disabled = new Set(), multi = false, lockLastSelected = false }: SelectionCardsProps) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {options.map((option) => {
                const isSelected = selected.includes(option);
                const isDisabled = disabled.has(option);
                const isLocked = lockLastSelected && isSelected && selected.length === 1;
                const showNumber = multi && isSelected && selected.length > 1;

                return (
                    <button
                        key={option}
                        type="button"
                        onClick={() => !isDisabled && !isLocked && onToggle(option)}
                        aria-pressed={isSelected}
                        disabled={isDisabled}
                        className={cn(
                            "flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all text-left",
                            isSelected && !isDisabled
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-background text-foreground hover:border-muted-foreground",
                            isDisabled && "opacity-50 cursor-not-allowed select-none",
                            isLocked && "cursor-default"
                        )}
                    >
                        <span className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold",
                            isSelected && !isDisabled ? "border-primary bg-primary text-white" : "border-muted-foreground"
                        )}>
                            {showNumber ? selected.indexOf(option) + 1 : isSelected ? <Check className="h-2.5 w-2.5" /> : null}
                        </span>
                        <span>{option}</span>
                    </button>
                );
            })}
        </div>
    );
}

export function BasicDetailsSection({ control }: BasicDetailsSectionProps) {
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
        <section className="space-y-8">
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
                        <FormMessage />
                    </FormItem>
                )}
            />
        </section>
    );
}
