"use client";

import { useFormContext } from "react-hook-form";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface CounterCardProps {
    name: string;
    label: string;
    emoji: string;
    sublabel?: string;
    steps?: number[];
    onRemove?: () => void;
    className?: string;
}

export function CounterCard({
    name,
    label,
    emoji,
    sublabel = "Count",
    steps = [-1, 1, 2],
    onRemove,
    className,
}: CounterCardProps) {
    const { watch, setValue } = useFormContext();
    const value = Number(watch(name as any) ?? 1);

    const set = (next: number) =>
        setValue(name as any, Math.max(0, next), { shouldDirty: true, shouldValidate: true });

    return (
        <div className={cn("rounded-2xl border bg-card shadow-sm p-4 space-y-3", className)}>
            <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-base font-bold">
                    <span>{emoji}</span>
                    <span className="text-primary">{label}</span>
                </span>
                {onRemove && (
                    <button
                        type="button"
                        onClick={onRemove}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>
            <div className="rounded-xl bg-muted p-3 space-y-2">
                <p className="text-xs text-muted-foreground font-medium">{sublabel}</p>
                <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-primary">{value}</span>
                    <div className="flex gap-2">
                        {steps.map((delta) => (
                            <button
                                key={delta}
                                type="button"
                                onClick={() => set(value + delta)}
                                className="rounded-xl border-2 border-border bg-background px-3 py-1.5 text-sm font-bold hover:border-primary hover:text-primary transition-colors"
                            >
                                {delta > 0 ? `+${delta}` : delta}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
