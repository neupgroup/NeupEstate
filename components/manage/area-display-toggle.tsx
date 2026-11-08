"use client";

import { useMemo, useState } from "react";
import { MoveDiagonal } from "lucide-react";
import { useDisplayConfiguration } from '@/components/display-preferences';
import { formatNumber, type NumberingSystem } from '@neup/numbering-system';

type SystemKey = "sqm" | "sqft" | "aana" | "ropani" | "paisa" | "daam" | "bigha" | "kattha" | "dhur";

const ORDER: SystemKey[] = ["sqm", "sqft", "aana", "ropani", "paisa", "daam", "bigha", "kattha", "dhur"];

const SQUARE_METRES_PER_UNIT: Record<SystemKey, number> = {
    sqm: 1,
    sqft: 0.092903,
    aana: 31.8,
    ropani: 508.72,
    paisa: 7.95,
    daam: 1.9875,
    bigha: 6772.63,
    kattha: 338.63,
    dhur: 16.93,
};

export function AreaDisplayToggle({ value }: { value?: number | null }) {
    const { preferences } = useDisplayConfiguration();
    const [overrideUnit, setOverrideUnit] = useState<SystemKey | null>(null);
    const preferredUnit = ORDER.includes(preferences.areaUnit as SystemKey) ? preferences.areaUnit as SystemKey : 'aana';
    const system = overrideUnit ?? preferredUnit;

    const formatted = useMemo(() => {
        const area = Number(value ?? 0);
        if (!area) return "Not set";
        const converted = area / SQUARE_METRES_PER_UNIT[system];
        const suffix = system === 'sqm' ? 'm²' : system === 'sqft' ? 'ft²' : system;
        return `${formatNumber(converted.toFixed(2).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, ''), preferences.numberSystem as NumberingSystem)} ${suffix}`;
    }, [value, system, preferences.numberSystem]);

    return (
        <button
            type="button"
            onClick={() => {
                const currentIndex = ORDER.indexOf(system);
                setOverrideUnit(ORDER[(currentIndex + 1) % ORDER.length]);
            }}
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
