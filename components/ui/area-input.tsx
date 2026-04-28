"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type SystemKey = "aana" | "kattha" | "feet" | "meter";

type SubUnit = {
    key: string;
    label: string;
    steps: number[];
};

type System = {
    key: SystemKey;
    label: string;
    units: SubUnit[];
};

// ─── System definitions ───────────────────────────────────────────────────────

const SYSTEMS: System[] = [
    {
        key: "aana",
        label: "Aana",
        units: [
            { key: "ropani", label: "Ropani", steps: [1] },
            { key: "aana",   label: "Aana",   steps: [1] },
            { key: "paisa",  label: "Paisa",  steps: [1] },
            { key: "daam",   label: "Daam",   steps: [1] },
        ],
    },
    {
        key: "kattha",
        label: "Kattha",
        units: [
            { key: "bigha",  label: "Bigha",  steps: [1] },
            { key: "kattha", label: "Kattha", steps: [1] },
            { key: "dhur",   label: "Dhur",   steps: [1] },
        ],
    },
    {
        key: "feet",
        label: "Feet",
        units: [
            { key: "sqft", label: "sqft", steps: [1, 10, 100] },
        ],
    },
    {
        key: "meter",
        label: "Meter",
        units: [
            { key: "sqm", label: "sqm", steps: [1, 10, 100] },
        ],
    },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface AreaInputProps {
    label?: string;
    /** Base field name — values stored as `{name}.system`, `{name}.ropani`, etc. */
    name?: string;
    className?: string;
}

export function AreaInput({ label = "Total Area", name = "area", className }: AreaInputProps) {
    const { watch, setValue } = useFormContext();
    const [activeSystem, setActiveSystem] = useState<SystemKey>("aana");

    const system = SYSTEMS.find((s) => s.key === activeSystem)!;

    const get = (unit: string): number =>
        Number(watch(`${name}.${unit}` as any) ?? 0);

    const set = (unit: string, next: number) =>
        setValue(`${name}.${unit}` as any, Math.max(0, next), { shouldDirty: true });

    return (
        <div className={cn("rounded-2xl border bg-card shadow-sm p-4 space-y-4", className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-base font-bold">
                    <span>📐</span>
                    <span className="text-primary">{label}</span>
                </span>
                {/* System tabs */}
                <div className="flex rounded-lg border overflow-hidden">
                    {SYSTEMS.map((s) => (
                        <button
                            key={s.key}
                            type="button"
                            onClick={() => setActiveSystem(s.key)}
                            className={cn(
                                "px-3 py-1 text-xs font-semibold transition-colors",
                                activeSystem === s.key
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-background text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Unit rows */}
            <div className="space-y-2">
                {system.units.map((unit) => {
                    const val = get(unit.key);
                    return (
                        <div key={unit.key} className="rounded-xl bg-muted p-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-medium text-muted-foreground w-14">{unit.label}</span>
                                    <input
                                        type="number"
                                        value={val || ""}
                                        onChange={(e) => set(unit.key, Number(e.target.value))}
                                        placeholder="0"
                                        className="w-16 bg-transparent text-xl font-bold text-primary outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                    />
                                </div>
                                <div className="flex gap-1.5">
                                    {unit.steps.map((step) => (
                                        <button
                                            key={`-${step}`}
                                            type="button"
                                            onClick={() => set(unit.key, val - step)}
                                            className="rounded-lg border-2 border-border bg-background px-2.5 py-1 text-xs font-bold hover:border-primary hover:text-primary transition-colors"
                                        >
                                            -{step}
                                        </button>
                                    ))}
                                    {unit.steps.map((step) => (
                                        <button
                                            key={`+${step}`}
                                            type="button"
                                            onClick={() => set(unit.key, val + step)}
                                            className="rounded-lg border-2 border-border bg-background px-2.5 py-1 text-xs font-bold hover:border-primary hover:text-primary transition-colors"
                                        >
                                            +{step}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
