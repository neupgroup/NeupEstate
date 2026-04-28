"use client";

import { useFormContext } from "react-hook-form";
import { AreaUnitSchema } from "@/types";
import { cn } from "@/lib/utils";

interface AreaInputProps {
    label?: string;
    name?: string;
    unitName?: string;
    className?: string;
}

const UNITS = AreaUnitSchema.options;
const STEPS = [1, 5, 10];

export function AreaInput({
    label = "Total Area",
    name = "area",
    unitName = "areaUnit",
    className,
}: AreaInputProps) {
    const { watch, setValue } = useFormContext();

    const value  = Number(watch(name as any) ?? 0);
    const unit   = (watch(unitName as any) as string) || UNITS[0];

    const setVal  = (next: number) => setValue(name as any, Math.max(0, next), { shouldDirty: true, shouldValidate: true });
    const setUnit = (u: string)    => setValue(unitName as any, u, { shouldDirty: true });

    const nextUnit = () => {
        const idx = UNITS.indexOf(unit as any);
        setUnit(UNITS[(idx + 1) % UNITS.length]);
    };

    return (
        <div className={cn("rounded-2xl border bg-card shadow-sm p-4 space-y-3", className)}>
            <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-base font-bold">
                    <span>📐</span>
                    <span className="text-primary">{label}</span>
                </span>
                {/* Unit badge — click to cycle */}
                <button
                    type="button"
                    onClick={nextUnit}
                    title="Click to change unit"
                    className="rounded-full border-2 border-primary/40 bg-primary/5 px-3 py-0.5 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                >
                    {unit}
                </button>
            </div>

            <div className="rounded-xl bg-muted p-3 space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Area in {unit}</p>
                <div className="flex items-center justify-between">
                    <input
                        type="number"
                        value={value || ""}
                        onChange={(e) => setVal(Number(e.target.value))}
                        placeholder="0"
                        className="w-24 bg-transparent text-2xl font-bold text-primary outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <div className="flex gap-2">
                        {[-1, ...STEPS].map((delta) => (
                            <button
                                key={delta}
                                type="button"
                                onClick={() => setVal(value + delta)}
                                className="rounded-xl border-2 border-border bg-background px-3 py-1.5 text-sm font-bold hover:border-primary hover:text-primary transition-colors"
                            >
                                {delta > 0 ? `+${delta}` : delta}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
