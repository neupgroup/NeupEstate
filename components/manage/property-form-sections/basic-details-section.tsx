
"use client";

import { Control, useFormContext } from "react-hook-form";
import { CreatePropertyFormValues, PropertyCategorySchema, PropertyPurposeOptions, PropertyUsageTypeSchema } from "@/types";
import { FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface BasicDetailsSectionProps {
    control: Control<CreatePropertyFormValues>;
}

type MultiSelectCardProps = {
    options: readonly string[];
    selected: string[];
    onToggle: (option: string) => void;
    multi?: boolean;
};

function SelectionCards({ options, selected, onToggle, multi = false }: MultiSelectCardProps) {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {options.map((option) => {
                const idx = selected.indexOf(option);
                const isSelected = idx !== -1;
                const showNumber = multi && isSelected && selected.length > 1;

                return (
                    <button
                        key={option}
                        type="button"
                        onClick={() => onToggle(option)}
                        aria-pressed={isSelected}
                        className={cn(
                            "flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all text-left",
                            isSelected
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-background text-foreground hover:border-muted-foreground"
                        )}
                    >
                        <span className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold",
                            isSelected ? "border-primary bg-primary text-white" : "border-muted-foreground"
                        )}>
                            {showNumber ? idx + 1 : isSelected ? <Check className="h-2.5 w-2.5" /> : null}
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
    const selectedCategory = watch("category") ? [watch("category")] : [];
    const selectedType = watch("type") ? [watch("type")] : [];

    const togglePurpose = (option: string) => {
        const next = selectedPurposes.includes(option as any)
            ? selectedPurposes.filter((o) => o !== option)
            : [...selectedPurposes, option as any];
        setValue("purposes", next, { shouldDirty: true, shouldValidate: true });
        setValue("purpose", next[0], { shouldDirty: true, shouldValidate: true });
    };

    const toggleCategory = (option: string) => {
        // single-value field — toggle off if same, else set new
        const current = selectedCategory[0];
        setValue("category", current === option ? (undefined as any) : option as any, { shouldDirty: true, shouldValidate: true });
    };

    const toggleType = (option: string) => {
        const current = selectedType[0];
        setValue("type", current === option ? (undefined as any) : option as any, { shouldDirty: true, shouldValidate: true });
    };

    return (
        <section className="space-y-8">
            <div className="space-y-8">
                <FormField
                    control={control}
                    name="purposes"
                    render={() => (
                        <FormItem>
                            <FormLabel className="text-base font-semibold">Property Purpose</FormLabel>
                            <SelectionCards
                                options={PropertyPurposeOptions}
                                selected={selectedPurposes}
                                onToggle={togglePurpose}
                                multi
                            />
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={control}
                    name="category"
                    render={() => (
                        <FormItem>
                            <FormLabel className="text-base font-semibold">Property Type</FormLabel>
                            <SelectionCards
                                options={PropertyCategorySchema.options}
                                selected={selectedCategory}
                                onToggle={toggleCategory}
                            />
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={control}
                    name="type"
                    render={() => (
                        <FormItem>
                            <FormLabel className="text-base font-semibold">Property Nature</FormLabel>
                            <SelectionCards
                                options={PropertyUsageTypeSchema.options}
                                selected={selectedType}
                                onToggle={toggleType}
                            />
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
        </section>
    );
}
