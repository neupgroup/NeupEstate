"use client";

import { useMemo, useState } from "react";
import { MoveDiagonal } from "lucide-react";

type SystemKey = "sqm" | "sqft" | "aana" | "bigha";

const ORDER: SystemKey[] = ["sqm", "sqft", "aana", "bigha"];

const SQFT_PER: Record<SystemKey, number> = {
    sqm: 1,
    sqft: 0.092903,
    aana: 31.8,
    bigha: 6772.63,
};

function formatNumber(value: number) {
    const rounded = Math.round(value * 100) / 100;
    return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function formatAanaSystem(sqm: number) {
    if (sqm <= 0) return "Not set";
    let remaining = sqm;
    const ropani = Math.floor(remaining / 508.72);
    remaining -= ropani * 508.72;
    const aana = Math.floor(remaining / 31.8);
    remaining -= aana * 31.8;
    const paisa = Math.floor(remaining / 7.95);
    remaining -= paisa * 7.95;
    const daam = Math.floor(remaining / 1.9875);
    const parts = [
        ["ropani", ropani],
        ["aana", aana],
        ["paisa", paisa],
        ["daam", daam],
    ] as const;

    return parts
        .map(([unit, value]) => ({ unit, value }))
        .filter((part) => part.value > 0)
        .map((part) => `${part.value} ${part.unit}`)
        .join(" ");
}

function formatBighaSystem(sqm: number) {
    if (sqm <= 0) return "Not set";
    let remaining = sqm;
    const bigha = Math.floor(remaining / 6772.63);
    remaining -= bigha * 6772.63;
    const kattha = Math.floor(remaining / 338.63);
    remaining -= kattha * 338.63;
    const dhur = Math.floor(remaining / 16.93);
    const parts = [
        ["bigha", bigha],
        ["kattha", kattha],
        ["dhur", dhur],
    ] as const;

    return parts
        .map(([unit, value]) => ({ unit, value }))
        .filter((part) => part.value > 0)
        .map((part) => `${part.value} ${part.unit}`)
        .join(" ");
}

export function AreaDisplayToggle({ value }: { value?: number | null }) {
    const [systemIndex, setSystemIndex] = useState(0);
    const system = ORDER[systemIndex];

    const formatted = useMemo(() => {
        const area = Number(value ?? 0);
        if (!area) return "Not set";
        if (system === "aana") return formatAanaSystem(area);
        if (system === "bigha") return formatBighaSystem(area);
        return `${formatNumber(area / SQFT_PER[system])} ${system === "sqm" ? "m²" : system}`;
    }, [value, system]);

    return (
        <button
            type="button"
            onClick={() => setSystemIndex((current) => (current + 1) % ORDER.length)}
            className="group flex w-full items-center gap-3 rounded-lg border border-border/70 bg-background px-3 py-2.5 text-left transition-colors duration-200 ease-out hover:border-primary/40 hover:bg-primary/5"
            title="Click to change area format"
        >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary transition-colors duration-200 ease-out group-hover:border-primary/35 group-hover:bg-primary/15">
                <MoveDiagonal className="h-5 w-5" />
            </div>
            <div className="min-w-0">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Area</div>
                <div className="mt-1 text-sm font-medium text-foreground">{formatted}</div>
            </div>
        </button>
    );
}
