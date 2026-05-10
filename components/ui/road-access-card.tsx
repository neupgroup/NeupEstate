"use client";

import { useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";

interface RoadAccessCardProps {
    name: string;
}

// Common road widths in feet
const PRESETS = [8, 10, 12, 16, 20, 24, 30, 40];

export function RoadAccessCard({ name }: RoadAccessCardProps) {
    const { watch, setValue } = useFormContext();
    const raw = watch(name as any);
    const value = raw !== undefined && raw !== "" ? Number(raw) : undefined;

    function set(ft: number) {
        setValue(name as any, value === ft ? undefined : ft, {
            shouldDirty: true,
            shouldValidate: true,
        });
    }

    function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
        const n = e.target.value === "" ? undefined : Number(e.target.value);
        setValue(name as any, n, { shouldDirty: true, shouldValidate: true });
    }

    return (
        <div className="rounded-2xl border bg-card shadow-sm p-4 space-y-3">
            {/* Header */}
            <div className="flex items-center gap-2 text-base font-bold">
                <span>🛣️</span>
                <span className="text-primary">Road Access</span>
                {value !== undefined && (
                    <span className="ml-auto text-sm font-semibold text-muted-foreground">
                        {value} ft
                    </span>
                )}
            </div>

            <div className="rounded-xl bg-muted p-3 space-y-3">
                {/* Preset chips */}
                <p className="text-xs text-muted-foreground font-medium">Common widths</p>
                <div className="grid grid-cols-4 gap-1.5">
                    {PRESETS.map(ft => {
                        const isSelected = value === ft;
                        return (
                            <button
                                key={ft}
                                type="button"
                                onClick={() => set(ft)}
                                className={cn(
                                    "rounded-lg py-1.5 text-xs font-semibold border transition-all",
                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                    isSelected
                                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                        : "bg-background border-border text-foreground hover:border-primary hover:text-primary hover:bg-primary/5"
                                )}
                            >
                                {ft} ft
                            </button>
                        );
                    })}
                </div>

                {/* Custom input */}
                <div className="flex items-center gap-2 pt-1">
                    <p className="text-xs text-muted-foreground font-medium shrink-0">Custom</p>
                    <div className="flex items-center gap-1.5 flex-1">
                        <input
                            type="number"
                            min={1}
                            placeholder="e.g. 18"
                            value={value !== undefined && !PRESETS.includes(value) ? value : ""}
                            onChange={handleInput}
                            className={cn(
                                "w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm",
                                "focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary",
                                "placeholder:text-muted-foreground"
                            )}
                        />
                        <span className="text-xs text-muted-foreground shrink-0">ft</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
