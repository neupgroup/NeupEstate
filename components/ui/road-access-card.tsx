"use client";

import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { cn } from "@/logica/core/utils";

interface RoadAccessCardProps {
    name: string;
    note?: string;
}

export function RoadAccessCard({ name, note }: RoadAccessCardProps) {
    const { watch, setValue } = useFormContext();
    const value = watch(name as any) as number | undefined;
    const [text, setText] = useState("");
    const [touched, setTouched] = useState(false);

    useEffect(() => {
        if (!touched) {
            setText(value === undefined || value === null ? "" : String(value));
        }
    }, [value, touched]);

    function select(next?: number) {
        const normalized = next === undefined ? undefined : Math.max(0, next);
        setValue(name as any, normalized, {
            shouldDirty: true,
            shouldValidate: true,
        });
        setText(normalized === undefined ? "" : String(normalized));
        setTouched(true);
    }

    function onBlur() {
        if (!text.trim()) {
            select(undefined);
            return;
        }
        if (/^\d+$/.test(text.trim())) {
            select(Number(text.trim()));
            return;
        }
        setText(value === undefined || value === null ? "" : String(value));
    }

    function nudge(delta: number) {
        select(Number(value ?? 0) + delta);
    }

    const visibleActions = [
        { label: "+1 feet", delta: 1 },
        { label: "-1 feet", delta: -1 },
        { label: "+2 feet", delta: 2 },
        { label: "-2 feet", delta: -2 },
        { label: "+5 feet", delta: 5 },
        { label: "-5 feet", delta: -5 },
        { label: "+10 feet", delta: 10 },
        { label: "-10 feet", delta: -10 },
    ].filter((action) => action.delta > 0 || Math.abs(action.delta) <= Number(value ?? 0));

    return (
        <div className={cn("space-y-2 w-full max-w-2xl")}>
            <div className="space-y-1">
                <div className="flex items-center gap-2 text-base font-bold">
                    <span>🛣️</span>
                    <span className="text-foreground">Road Access</span>
                    <span className="text-xs text-muted-foreground font-medium">(Feet System)</span>
                </div>

                {note && <p className="text-xs text-muted-foreground">{note}</p>}

                <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="e.g. 18"
                    value={text}
                    onChange={(event) => {
                        const nextText = event.target.value;
                        if (nextText === "" || /^\d*$/.test(nextText)) {
                            setText(nextText);
                            setTouched(true);
                        }
                    }}
                    onBlur={onBlur}
                    className={cn(
                        "w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none text-foreground",
                        "focus:ring-2 focus:ring-ring focus:border-foreground"
                    )}
                />
            </div>

            <div className="flex flex-wrap gap-2">
                {visibleActions.map((action) => (
                    <button
                        key={action.label}
                        type="button"
                        onClick={() => nudge(action.delta)}
                        className="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors border-border bg-background text-foreground hover:border-foreground hover:text-foreground"
                    >
                        {action.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
