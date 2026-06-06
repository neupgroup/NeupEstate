"use client";

import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { X } from "lucide-react";
import { cn } from "@/logica/core/utils";

interface CounterCardProps {
    name: string;
    label: string;
    emoji: string;
    sublabel?: string;
    steps?: number[];
    onRemove?: () => void;
    className?: string;
    note?: string;
}

export function CounterCard({
    name,
    label,
    emoji,
    sublabel = "Count",
    steps = [-1, 1, 2],
    onRemove,
    className,
    note,
}: CounterCardProps) {
    const { watch, setValue } = useFormContext<Record<string, number | undefined>>();
    const value = watch(name);
    const [text, setText] = useState("");
    const [touched, setTouched] = useState(false);

    useEffect(() => {
        if (!touched) {
            setText(value === undefined || value === null ? "" : String(value));
        }
    }, [value, touched]);

    function select(next?: number) {
        setValue(name, next === undefined ? undefined : Math.max(0, next), {
            shouldDirty: true,
            shouldValidate: true,
        });
        setText(next === undefined ? "" : String(Math.max(0, next)));
        setTouched(true);
    }

    function onBlur() {
        if (!text.trim()) {
            select(undefined);
            return;
        }
        const parsed = Number(text);
        if (Number.isFinite(parsed) && /^\d+$/.test(text.trim())) {
            select(parsed);
            return;
        }
        setText(value === undefined || value === null ? "" : String(value));
    }

    function nudge(delta: number) {
        select(Number(value ?? 0) + delta);
    }

    const visibleSteps = steps.filter((step) => step <= Number(value ?? 0));

    return (
        <div className={cn("space-y-2 w-full max-w-2xl", className)}>
            <div className="space-y-1">
                <div className="flex items-center gap-2 text-base font-bold">
                    <span>{emoji}</span>
                    <span className="text-foreground">{label}</span>
                    {onRemove && (
                        <button
                            type="button"
                            onClick={onRemove}
                            className="ml-auto flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>

                {note && <p className="text-xs text-muted-foreground">{note}</p>}

                <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="e.g. 2"
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
                {visibleSteps.map((delta) => (
                    <button
                        key={delta}
                        type="button"
                        onClick={() => nudge(delta)}
                        className="rounded-full border px-3 py-1.5 text-xs font-medium transition-colors border-border bg-background text-foreground hover:border-foreground hover:text-foreground"
                    >
                        {delta > 0 ? `+${delta}` : delta}
                    </button>
                ))}
            </div>
        </div>
    );
}
