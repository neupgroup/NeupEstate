"use client";

import { cn } from "@/logica/core/utils";

export type CompassDirection =
    | "North" | "South" | "East" | "West"
    | "North-East" | "North-West" | "South-East" | "South-West";

interface CompassPickerProps {
    value?: CompassDirection | string;
    onChange: (value: CompassDirection | undefined) => void;
    label?: string;
    /** Show a land icon instead of a house icon in the center */
    variant?: "house" | "land";
}

const GRID: { dir: CompassDirection; row: number; col: number; label: string }[] = [
    { dir: "North-West", row: 1, col: 1, label: "NW" },
    { dir: "North",      row: 1, col: 2, label: "N"  },
    { dir: "North-East", row: 1, col: 3, label: "NE" },
    { dir: "West",       row: 2, col: 1, label: "W"  },
    { dir: "East",       row: 2, col: 3, label: "E"  },
    { dir: "South-West", row: 3, col: 1, label: "SW" },
    { dir: "South",      row: 3, col: 2, label: "S"  },
    { dir: "South-East", row: 3, col: 3, label: "SE" },
];

const FULL: Record<CompassDirection, string> = {
    "North":      "North",
    "South":      "South",
    "East":       "East",
    "West":       "West",
    "North-East": "North East",
    "North-West": "North West",
    "South-East": "South East",
    "South-West": "South West",
};

function HouseIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"
            className="w-6 h-6 text-muted-foreground">
            <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
            <path d="M9 21V12h6v9" />
        </svg>
    );
}

function LandIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"
            className="w-6 h-6 text-muted-foreground">
            <path d="M3 20h18" />
            <path d="M5 20V10l7-7 7 7v10" />
            <path d="M9 20v-5h6v5" />
        </svg>
    );
}

export function CompassPicker({ value, onChange, label = "Facing", variant = "house" }: CompassPickerProps) {
    const selected = value as CompassDirection | undefined;

    return (
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            {/* Card header — matches the style in the screenshot */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div className="flex items-center gap-2.5">
                    {/* Compass needle icon */}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                        className="w-5 h-5 text-primary">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    <span className="text-base font-semibold text-primary">{label}</span>
                </div>
                {selected && (
                    <span className="text-sm text-muted-foreground font-medium">
                        {FULL[selected]}
                    </span>
                )}
            </div>

            {/* Grid body */}
            <div className="p-4">
                <div className="inline-grid grid-cols-3 grid-rows-3 gap-2">
                    {Array.from({ length: 9 }, (_, i) => {
                        const row = Math.floor(i / 3) + 1;
                        const col = (i % 3) + 1;

                        // Center cell
                        if (row === 2 && col === 2) {
                            return (
                                <div
                                    key="center"
                                    className="w-16 h-14 flex items-center justify-center rounded-xl bg-muted/60 border border-border"
                                >
                                    {variant === "land" ? <LandIcon /> : <HouseIcon />}
                                </div>
                            );
                        }

                        const entry = GRID.find(d => d.row === row && d.col === col);
                        if (!entry) return <div key={`empty-${i}`} className="w-16 h-14" />;

                        const { dir, label: short } = entry;
                        const isSelected = selected === dir;
                        const isCardinal = short.length === 1;

                        return (
                            <button
                                key={dir}
                                type="button"
                                title={FULL[dir]}
                                onClick={() => onChange(isSelected ? undefined : dir)}
                                className={cn(
                                    "w-16 h-14 rounded-xl border font-semibold transition-all duration-100",
                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                    isCardinal ? "text-sm" : "text-xs",
                                    isSelected
                                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                        : "bg-muted/40 text-foreground border-border hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
                                )}
                            >
                                {short}
                            </button>
                        );
                    })}
                </div>

                {!selected && (
                    <p className="mt-3 text-xs text-muted-foreground">
                        Select the direction the property faces
                    </p>
                )}
            </div>
        </div>
    );
}
