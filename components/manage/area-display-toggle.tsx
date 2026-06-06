"use client";

import { useMemo, useState } from "react";

type SystemKey = "sqft" | "sqm" | "aana" | "bigha";

const ORDER: SystemKey[] = ["sqft", "sqm", "aana", "bigha"];

const SQFT_PER: Record<SystemKey, number> = {
    sqft: 1,
    sqm: 10.7639,
    aana: 342.25,
    bigha: 72900,
};

function formatNumber(value: number) {
    const rounded = Math.round(value * 100) / 100;
    return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function formatAanaSystem(sqft: number) {
    if (sqft <= 0) return "Not set";
    let remaining = sqft;
    const ropani = Math.floor(remaining / 5476);
    remaining -= ropani * 5476;
    const aana = Math.floor(remaining / 342.25);
    remaining -= aana * 342.25;
    const paisa = Math.floor(remaining / 85.56);
    remaining -= paisa * 85.56;
    const daam = Math.floor(remaining / 21.39);
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

function formatBighaSystem(sqft: number) {
    if (sqft <= 0) return "Not set";
    let remaining = sqft;
    const bigha = Math.floor(remaining / 72900);
    remaining -= bigha * 72900;
    const kattha = Math.floor(remaining / 3645);
    remaining -= kattha * 3645;
    const dhur = Math.floor(remaining / 182.25);
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
        return `${formatNumber(area / SQFT_PER[system])} ${system}`;
    }, [value, system]);

    return (
        <button
            type="button"
            onClick={() => setSystemIndex((current) => (current + 1) % ORDER.length)}
            className="w-full rounded-xl border bg-background px-4 py-3 text-left transition-colors hover:bg-muted/40"
            title="Click to change area format"
        >
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Area</div>
            <div className="mt-1 text-sm font-medium text-foreground">{formatted}</div>
        </button>
    );
}
