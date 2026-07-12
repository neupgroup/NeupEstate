"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";
import { ChevronRight, Triangle } from "lucide-react";
import { cn } from "@/core/utils";

interface YearPickerCardProps {
    name: string;
    label: string;
    emoji: string;
    className?: string;
    note?: string;
}

const CURRENT_YEAR = new Date().getFullYear();
type YearSystem = "bs" | "ad";

function formatYearText(year?: number): string {
    return year ? String(year) : "";
}

function parseYearText(text: string): number | undefined {
    const match = text.match(/\d{4}/);
    if (!match) return undefined;
    const year = Number(match[0]);
    if (!Number.isFinite(year)) return undefined;
    return year;
}

export function YearPickerCard({ name, label, emoji, className, note }: YearPickerCardProps) {
    const { watch, setValue } = useFormContext();
    const value = watch(name as any) as number | undefined;
    const [text, setText] = useState("");
    const [touched, setTouched] = useState(false);
    const [system, setSystem] = useState<YearSystem>("ad");

    useEffect(() => {
        if (!touched) {
            setText(formatYearText(value));
        }
    }, [value, touched]);

    function select(year?: number) {
        setValue(name as any, year, {
            shouldDirty: true,
            shouldValidate: true,
        });
        setText(formatYearText(year));
        setTouched(true);
    }

    function onBlur() {
        const parsed = parseYearText(text);
        if (parsed && parsed <= CURRENT_YEAR + 2) {
            select(parsed);
        } else {
            setText(formatYearText(value));
        }
    }

    function adjust(delta: number) {
        select((value ?? CURRENT_YEAR) + delta);
    }

    return (
        <div className={cn("space-y-2 w-full max-w-2xl", className)}>
            <div className="space-y-1">
                <div className="flex items-center gap-2 text-base font-bold">
                    <span>{emoji}</span>
                    <span className="text-foreground">{label}</span>
                    <button
                        type="button"
                        onClick={() => setSystem((current) => (current === "ad" ? "bs" : "ad"))}
                        className="text-xs text-muted-foreground hover:text-foreground"
                    >
                        ({system.toUpperCase()} System) <ChevronRight className="inline h-3 w-3" />
                    </button>
                </div>

                {note && <p className="text-xs text-muted-foreground">{note}</p>}

                <input
                    type="text"
                    inputMode="numeric"
                    value={text}
                    onChange={(event) => {
                        setText(event.target.value);
                        setTouched(true);
                    }}
                    onBlur={onBlur}
                    placeholder="e.g. 2025"
                    className={cn("w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none text-foreground")}
                />
            </div>

            <div className="flex flex-wrap gap-2">
                {[
                    { label: "+1 year", delta: 1 },
                    { label: "-1 year", delta: -1 },
                    { label: "+5 years", delta: 5 },
                    { label: "-5 years", delta: -5 },
                ].map((action) => (
                    <button
                        key={action.label}
                        type="button"
                        onClick={() => adjust(action.delta)}
                        className={cn(
                            "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                            "border-border bg-background text-foreground hover:border-foreground hover:text-foreground",
                        )}
                    >
                        {action.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
