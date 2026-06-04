"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/logica/core/utils";

interface YearPickerCardProps {
    name: string;
    label: string;
    emoji: string;
}

const CURRENT_YEAR = new Date().getFullYear();
const DECADE_SIZE = 12; // 3 rows × 4 cols

export function YearPickerCard({ name, label, emoji }: YearPickerCardProps) {
    const { watch, setValue } = useFormContext();
    const value = watch(name as any) as number | undefined;

    // Start the decade view on the decade containing the selected year,
    // or the current decade if nothing is selected.
    const baseYear = value
        ? Math.floor(value / DECADE_SIZE) * DECADE_SIZE
        : Math.floor(CURRENT_YEAR / DECADE_SIZE) * DECADE_SIZE;

    const [decadeStart, setDecadeStart] = useState(baseYear);

    const years = Array.from({ length: DECADE_SIZE }, (_, i) => decadeStart + i);

    function select(year: number) {
        setValue(name as any, value === year ? undefined : year, {
            shouldDirty: true,
            shouldValidate: true,
        });
    }

    return (
        <div className="rounded-2xl border bg-card shadow-sm p-4 space-y-3">
            {/* Header */}
            <div className="flex items-center gap-2 text-base font-bold">
                <span>{emoji}</span>
                <span className="text-primary">{label}</span>
                {value && (
                    <span className="ml-auto text-sm font-semibold text-muted-foreground">
                        {value}
                    </span>
                )}
            </div>

            {/* Decade navigator + grid */}
            <div className="rounded-xl bg-muted p-3 space-y-3">
                {/* Decade nav */}
                <div className="flex items-center justify-between">
                    <button
                        type="button"
                        title="Previous years"
                        onClick={() => setDecadeStart(d => d - DECADE_SIZE)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background hover:border-primary hover:text-primary transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-xs font-semibold text-muted-foreground">
                        {decadeStart} – {decadeStart + DECADE_SIZE - 1}
                    </span>
                    <button
                        type="button"
                        title="Next years"
                        onClick={() => setDecadeStart(d => d + DECADE_SIZE)}
                        disabled={decadeStart + DECADE_SIZE > CURRENT_YEAR + 2}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background hover:border-primary hover:text-primary transition-colors disabled:opacity-30 disabled:pointer-events-none"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>

                {/* Year grid — 4 columns */}
                <div className="grid grid-cols-4 gap-1.5">
                    {years.map(year => {
                        const isSelected = value === year;
                        const isFuture = year > CURRENT_YEAR + 1;
                        return (
                            <button
                                key={year}
                                type="button"
                                disabled={isFuture}
                                onClick={() => select(year)}
                                className={cn(
                                    "rounded-lg py-1.5 text-xs font-semibold border transition-all",
                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                    isSelected
                                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                        : "bg-background border-border text-foreground hover:border-primary hover:text-primary hover:bg-primary/5",
                                    isFuture && "opacity-30 pointer-events-none"
                                )}
                            >
                                {year}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
