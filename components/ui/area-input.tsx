"use client";

import { useState } from "react";
import { useFormContext, useFormState } from "react-hook-form";
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

// All unit keys across all systems
const ALL_UNITS = ["ropani", "aana", "paisa", "daam", "bigha", "kattha", "dhur", "sqft", "sqm"];

// ─── Conversion helpers ───────────────────────────────────────────────────────

// Factors: 1 unit = N sqft
const TO_SQFT: Record<string, number> = {
    ropani: 5476,
    aana:   342.25,
    paisa:  85.56,
    daam:   21.39,
    bigha:  72900,
    kattha: 3645,
    dhur:   182.25,
    sqft:   1,
    sqm:    10.7639,
};

function toSqft(values: Record<string, number>): number {
    return Object.entries(values).reduce((sum, [k, v]) => sum + (v || 0) * (TO_SQFT[k] ?? 0), 0);
}

/**
 * Decompose a sqft total into the units of the target system.
 * For Aana/Kattha: integer decomposition (cascade down).
 * For sqft/sqm: single decimal value.
 */
function fromSqft(sqft: number, system: SystemKey): Record<string, number> {
    if (sqft <= 0) return {};

    if (system === "feet") {
        return { sqft: Math.round(sqft * 100) / 100 };
    }
    if (system === "meter") {
        return { sqm: Math.round((sqft / 10.7639) * 100) / 100 };
    }
    if (system === "aana") {
        let rem = sqft;
        const ropani = Math.floor(rem / 5476);   rem -= ropani * 5476;
        const aana   = Math.floor(rem / 342.25); rem -= aana   * 342.25;
        const paisa  = Math.floor(rem / 85.56);  rem -= paisa  * 85.56;
        const daam   = Math.floor(rem / 21.39);
        return { ropani, aana, paisa, daam };
    }
    if (system === "kattha") {
        let rem = sqft;
        const bigha  = Math.floor(rem / 72900); rem -= bigha  * 72900;
        const kattha = Math.floor(rem / 3645);  rem -= kattha * 3645;
        const dhur   = Math.floor(rem / 182.25);
        return { bigha, kattha, dhur };
    }
    return {};
}

// ─── Component ────────────────────────────────────────────────────────────────

interface AreaInputProps {
    label?: string;
    /** Base field name — values stored as `{name}.ropani`, `{name}.sqft`, etc. */
    name?: string;
    className?: string;
}

export function AreaInput({ label = "Total Area", name = "area", className }: AreaInputProps) {
    const { watch, setValue, control } = useFormContext();
    const { errors } = useFormState({ control, name: name as any });
    const [activeSystem, setActiveSystem] = useState<SystemKey>("aana");

    const system = SYSTEMS.find((s) => s.key === activeSystem)!;

    const get = (unit: string): number =>
        Number(watch(`${name}.${unit}` as any) ?? 0);

    const set = (unit: string, next: number) =>
        setValue(`${name}.${unit}` as any, Math.max(0, next), { shouldDirty: true });

    function switchSystem(next: SystemKey) {
        if (next === activeSystem) return;

        // 1. Read current values and convert to sqft
        const currentValues: Record<string, number> = {};
        for (const u of ALL_UNITS) {
            currentValues[u] = get(u);
        }
        const totalSqft = toSqft(currentValues);

        // 2. Clear all unit fields
        for (const u of ALL_UNITS) {
            setValue(`${name}.${u}` as any, undefined, { shouldDirty: true });
        }

        // 3. Write converted values into the new system (only if there was something)
        if (totalSqft > 0) {
            const converted = fromSqft(totalSqft, next);
            for (const [u, v] of Object.entries(converted)) {
                if (v > 0) {
                    setValue(`${name}.${u}` as any, v, { shouldDirty: true });
                }
            }
        }

        setActiveSystem(next);
    }

    // Dig out the error message for this field (may be nested)
    function getErrorMessage(): string | undefined {
        const parts = name.split(".");
        let node: any = errors;
        for (const part of parts) {
            node = node?.[part];
            if (!node) return undefined;
        }
        if (typeof node?.message === "string") return node.message;
        if (node && typeof node === "object") {
            for (const key of Object.keys(node)) {
                if (typeof node[key]?.message === "string") return node[key].message;
            }
        }
        return undefined;
    }

    const errorMessage = getErrorMessage();

    return (
        <div className={cn("space-y-1", className)}>
        <div className={cn("rounded-2xl border bg-card shadow-sm p-4 space-y-4", errorMessage && "border-destructive")}>
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
                            onClick={() => switchSystem(s.key)}
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
        {errorMessage && (
            <p className="text-sm font-medium text-destructive">{errorMessage}</p>
        )}
        </div>
    );
}
