"use client";

import { useEffect, useRef, useState } from "react";
import { useFormContext, useFormState } from "react-hook-form";
import { cn } from "@/logica/core/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type SystemKey = "aana" | "kattha" | "feet" | "meter";
type SubUnit   = { key: string; label: string; steps: number[] };
type System    = { key: SystemKey; label: string; units: SubUnit[] };

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
        units: [{ key: "sqft", label: "sqft", steps: [1, 10, 100] }],
    },
    {
        key: "meter",
        label: "Meter",
        units: [{ key: "sqm", label: "sqm", steps: [1, 10, 100] }],
    },
];

const SYSTEM_KEYS: Record<SystemKey, string[]> = {
    aana:   ["ropani", "aana", "paisa", "daam"],
    kattha: ["bigha", "kattha", "dhur"],
    feet:   ["sqft"],
    meter:  ["sqm"],
};

const ALL_UNITS = Object.values(SYSTEM_KEYS).flat();

// ─── Conversion: sqm as canonical ────────────────────────────────────────────

// 1 unit → sqm  (exact factors, not derived from sqft)
const TO_SQM: Record<string, number> = {
    ropani: 508.72,
    aana:   31.80,
    paisa:  7.95,
    daam:   1.9875,
    bigha:  6772.63,
    kattha: 338.63,
    dhur:   16.93,
    sqft:   0.092903,
    sqm:    1,
};

function toSqm(vals: Record<string, number>): number {
    return Object.entries(vals).reduce(
        (sum, [k, v]) => sum + (v || 0) * (TO_SQM[k] ?? 0),
        0
    );
}

function fromSqm(sqm: number, system: SystemKey): Record<string, number> {
    if (sqm <= 0) return {};
    if (system === "meter") return { sqm: round2(sqm) };
    if (system === "feet")  return { sqft: round2(sqm / 0.092903) };
    if (system === "aana") {
        let rem = sqm;
        const ropani = Math.floor(rem / 508.72);  rem -= ropani * 508.72;
        const aana   = Math.floor(rem / 31.80);   rem -= aana   * 31.80;
        const paisa  = Math.floor(rem / 7.95);    rem -= paisa  * 7.95;
        const daam   = Math.floor(rem / 1.9875);
        return { ropani, aana, paisa, daam };
    }
    if (system === "kattha") {
        let rem = sqm;
        const bigha  = Math.floor(rem / 6772.63); rem -= bigha  * 6772.63;
        const kattha = Math.floor(rem / 338.63);  rem -= kattha * 338.63;
        const dhur   = Math.floor(rem / 16.93);
        return { bigha, kattha, dhur };
    }
    return {};
}

function round2(n: number) { return Math.round(n * 100) / 100; }

function detectSystem(getVal: (k: string) => number): SystemKey {
    for (const sys of SYSTEMS) {
        if (SYSTEM_KEYS[sys.key].some(k => getVal(k) > 0)) return sys.key;
    }
    return "aana";
}

// ─── Component ────────────────────────────────────────────────────────────────

interface AreaInputProps {
    label?: string;
    name?: string;
    className?: string;
}

export function AreaInput({ label = "Total Area", name = "area", className }: AreaInputProps) {
    const { watch, setValue, control } = useFormContext();
    const { errors } = useFormState({ control, name: name as any });

    const get = (unit: string): number =>
        Number(watch(`${name}.${unit}` as any) ?? 0);

    const [activeSystem, setActiveSystem] = useState<SystemKey>(() => detectSystem(get));

    /**
     * canonicalSqm is the single source of truth.
     * It is updated ONLY when the user types or clicks +/-.
     * Tab switches read from this ref — they never re-derive sqm from
     * already-converted values, which prevents drift.
     */
    const canonicalSqm = useRef<number>(0);

    // Initialise canonical from form values on mount / after form.reset()
    const initialised = useRef(false);
    useEffect(() => {
        const vals: Record<string, number> = {};
        for (const u of ALL_UNITS) vals[u] = get(u);
        const sqm = toSqm(vals);
        if (!initialised.current || sqm !== canonicalSqm.current) {
            canonicalSqm.current = sqm;
            initialised.current = true;
            setActiveSystem(detectSystem(get));
        }
    });

    const system = SYSTEMS.find(s => s.key === activeSystem)!;

    /** Write a unit value and update the canonical sqm from the new form state. */
    function set(unit: string, next: number) {
        const clamped = Math.max(0, next);
        setValue(`${name}.${unit}` as any, clamped, { shouldDirty: true });
        // Recompute canonical from all current values + this new one
        const vals: Record<string, number> = {};
        for (const u of ALL_UNITS) vals[u] = get(u);
        vals[unit] = clamped;
        canonicalSqm.current = toSqm(vals);
    }

    function switchSystem(next: SystemKey) {
        if (next === activeSystem) return;

        // Clear current system's fields
        for (const u of SYSTEM_KEYS[activeSystem]) {
            setValue(`${name}.${u}` as any, undefined, { shouldDirty: true });
        }

        // Write converted values from the canonical sqm (not re-derived from form)
        if (canonicalSqm.current > 0) {
            const converted = fromSqm(canonicalSqm.current, next);
            for (const [u, v] of Object.entries(converted)) {
                setValue(`${name}.${u}` as any, v > 0 ? v : undefined, { shouldDirty: true });
            }
        }

        setActiveSystem(next);
    }

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
                    <div className="flex rounded-lg border overflow-hidden">
                        {SYSTEMS.map(s => (
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
                    {system.units.map(unit => {
                        const val = get(unit.key);
                        return (
                            <div key={unit.key} className="rounded-xl bg-muted p-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-medium text-muted-foreground w-14">{unit.label}</span>
                                        <input
                                            type="number"
                                            value={val || ""}
                                            onChange={e => set(unit.key, Number(e.target.value))}
                                            placeholder="0"
                                            className="w-16 bg-transparent text-xl font-bold text-primary outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                    </div>
                                    <div className="flex gap-1.5">
                                        {unit.steps.map(step => (
                                            <button
                                                key={`-${step}`}
                                                type="button"
                                                onClick={() => set(unit.key, val - step)}
                                                className="rounded-lg border-2 border-border bg-background px-2.5 py-1 text-xs font-bold hover:border-primary hover:text-primary transition-colors"
                                            >
                                                -{step}
                                            </button>
                                        ))}
                                        {unit.steps.map(step => (
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
