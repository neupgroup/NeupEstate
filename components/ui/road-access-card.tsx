"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";
import { cn } from "@/logica/core/utils";

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

export function RoadAccessCard({ name, note }: { name: string; note?: string }) {
    const { watch, setValue } = useFormContext();
    const value = watch(name as any) as number | undefined;
    const [text, setText] = useState("");
    const [touched, setTouched] = useState(false);
    const [unitIndex, setUnitIndex] = useState(0);

    const unit = ORDER[unitIndex];

    useEffect(() => {
        if (!touched) {
            const meters = Number(value ?? 0);
            setText(meters ? formatNumber(meters / METERS_PER_UNIT[unit]) : "");
        }
    }, [value, touched, unit]);

    function select(nextMeters?: number) {
        const normalized = nextMeters === undefined ? undefined : Math.max(0, nextMeters);
        setValue(name as any, normalized, {
            shouldDirty: true,
            shouldValidate: true,
        });
        const display = normalized === undefined ? "" : formatNumber(normalized / METERS_PER_UNIT[unit]);
        setText(display);
        setTouched(true);
    }

    function onBlur() {
        if (!text.trim()) {
            select(undefined);
            return;
        }
        const parsed = Number(text.trim());
        if (Number.isFinite(parsed)) {
            select(parsed * METERS_PER_UNIT[unit]);
            return;
        }
        const meters = Number(value ?? 0);
        setText(meters ? formatNumber(meters / METERS_PER_UNIT[unit]) : "");
    }

    function nudge(delta: number) {
        select(Number(value ?? 0) + delta * METERS_PER_UNIT[unit]);
    }

    const visibleActions = [1, -1, 2, -2, 5, -5, 10, -10].filter((delta) => delta > 0 || Math.abs(delta) <= Number(value ?? 0));

    return (
        <div className={cn("space-y-2 w-full max-w-2xl")}>
            <div className="space-y-1">
                <button
                    type="button"
                    onClick={() => setUnitIndex((current) => (current + 1) % ORDER.length)}
                    className="flex items-center gap-2 text-base font-bold text-left"
                >
                    <span>🛣️</span>
                    <span className="text-foreground">Road Access</span>
                    <span className="text-xs text-muted-foreground">
                        {unit}
                    </span>
                </button>

                {note && <p className="text-xs text-muted-foreground">{note}</p>}

                <input
                    type="text"
                    inputMode="decimal"
                    placeholder="e.g. 18"
                    value={text}
                    onChange={(event) => {
                        const nextText = event.target.value;
                        if (nextText === "" || /^\d*(?:\.\d*)?$/.test(nextText)) {
                            setText(nextText);
                            setTouched(true);
                        }
                    }}
                    onBlur={onBlur}
                    className={cn(
                        "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none text-foreground",
                        "focus:ring-2 focus:ring-ring focus:border-foreground",
                    )}
                />
            </div>

            <div className="flex flex-wrap gap-2">
                {visibleActions.map((delta) => (
                    <button
                        key={delta}
                        type="button"
                        onClick={() => nudge(delta)}
                        className="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors border-border bg-background text-foreground hover:border-foreground hover:text-foreground"
                    >
                        {delta > 0 ? `+${delta}` : `${delta}`} {unit}
                    </button>
                ))}
            </div>
        </div>
    );
}
