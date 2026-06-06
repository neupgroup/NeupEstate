"use client";

import { useState } from "react";
import { Route } from "lucide-react";

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
            className="group flex w-full items-center gap-3 rounded-lg border border-border/70 bg-background px-3 py-2.5 text-left transition-colors duration-200 ease-out hover:border-primary/40 hover:bg-primary/5"
            title="Click to change road access format"
        >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary transition-colors duration-200 ease-out group-hover:border-primary/35 group-hover:bg-primary/15">
                <Route className="h-5 w-5" />
            </div>
            <div className="min-w-0">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Road Access</div>
                <div className="mt-1 text-sm font-medium text-foreground">{formatted}</div>
            </div>
        </button>
    );
}
