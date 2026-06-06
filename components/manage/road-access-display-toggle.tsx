"use client";

import { useState } from "react";

type RoadAccessUnit = "meter" | "feet" | "haat" | "inch";

const ORDER: RoadAccessUnit[] = ["meter", "feet", "haat", "inch"];
const METERS_PER_UNIT: Record<RoadAccessUnit, number> = {
    meter: 1,
    feet: 0.3048,
    haat: 18 * 2.54 / 100,
    inch: 2.54 / 100,
};

function formatNumber(value: number) {
    const rounded = Math.round(value * 100000000) / 100000000;
    return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function formatAanaLike(value: number, unit: RoadAccessUnit) {
    const display = value / METERS_PER_UNIT[unit];
    return `${formatNumber(display)} ${unit}`;
}

export function RoadAccessDisplayToggle({ value }: { value?: number | null }) {
    const [index, setIndex] = useState(0);
    const unit = ORDER[index];
    const numeric = Number(value ?? 0);
    const formatted = !numeric ? "Not set" : formatAanaLike(numeric, unit);

    return (
        <button
            type="button"
            onClick={() => setIndex((current) => (current + 1) % ORDER.length)}
            className="w-full rounded-xl border bg-background px-4 py-3 text-left transition-colors hover:bg-muted/40"
            title="Click to change road access format"
        >
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Road Access</div>
            <div className="mt-1 text-sm font-medium text-foreground">{formatted}</div>
        </button>
    );
}
