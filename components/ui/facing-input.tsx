"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";
import { ChevronRight, Triangle } from "lucide-react";
import { cn } from "@/core/utils";

export type FacingDirection =
    | "North"
    | "South"
    | "East"
    | "West"
    | "North-East"
    | "North-West"
    | "South-East"
    | "South-West";

interface FacingInputProps {
    name: string;
    label: string;
    variant?: "house" | "land";
    className?: string;
    note?: string;
}

const DIRECTIONS: FacingDirection[] = [
    "North",
    "South",
    "East",
    "West",
    "North-East",
    "North-West",
    "South-East",
    "South-West",
];

const DIRECTION_ALIASES: Record<string, FacingDirection> = {
    n: "North",
    north: "North",
    s: "South",
    south: "South",
    e: "East",
    east: "East",
    w: "West",
    west: "West",
    ne: "North-East",
    northeast: "North-East",
    "north-east": "North-East",
    nw: "North-West",
    northwest: "North-West",
    "north-west": "North-West",
    se: "South-East",
    southeast: "South-East",
    "south-east": "South-East",
    sw: "South-West",
    southwest: "South-West",
    "south-west": "South-West",
};

const NEPALI_ALIASES: Record<string, FacingDirection> = {
    purba: "East",
    purb: "East",
    paschim: "West",
    uttar: "North",
    dakshin: "South",
    "purba-paschim": "East",
    "uttar-purba": "North-East",
    "uttar-paschim": "North-West",
    "dakshin-purba": "South-East",
    "dakshin-paschim": "South-West",
};

const ENGLISH_LABELS: Record<FacingDirection, string> = {
    North: "North",
    South: "South",
    East: "East",
    West: "West",
    "North-East": "North-East",
    "North-West": "North-West",
    "South-East": "South-East",
    "South-West": "South-West",
};

const NEPALI_LABELS: Record<FacingDirection, string> = {
    North: "Uttar",
    South: "Dakshin",
    East: "Purba",
    West: "Paschim",
    "North-East": "Uttar-purba",
    "North-West": "Uttar-paschim",
    "South-East": "Dakshin-purba",
    "South-West": "Dakshin-paschim",
};

function normalizeFacing(value: string): string {
    return value.toLowerCase().replace(/[^a-z-]/g, "");
}

function parseFacing(text: string): FacingDirection | undefined {
    const normalized = normalizeFacing(text);
    if (!normalized) return undefined;
    if (DIRECTION_ALIASES[normalized]) return DIRECTION_ALIASES[normalized];
    if (NEPALI_ALIASES[normalized]) return NEPALI_ALIASES[normalized];
    if (normalized.includes("north") && normalized.includes("east")) return "North-East";
    if (normalized.includes("north") && normalized.includes("west")) return "North-West";
    if (normalized.includes("south") && normalized.includes("east")) return "South-East";
    if (normalized.includes("south") && normalized.includes("west")) return "South-West";
    if (normalized.includes("purba") && normalized.includes("paschim")) return "North-East";
    if (normalized.includes("uttar") && normalized.includes("purba")) return "North-East";
    if (normalized.includes("uttar") && normalized.includes("paschim")) return "North-West";
    if (normalized.includes("dakshin") && normalized.includes("purba")) return "South-East";
    if (normalized.includes("dakshin") && normalized.includes("paschim")) return "South-West";
    if (normalized.includes("purba")) return "East";
    if (normalized.includes("paschim")) return "West";
    if (normalized.includes("uttar")) return "North";
    if (normalized.includes("dakshin")) return "South";
    if (normalized.startsWith("north")) return "North";
    if (normalized.startsWith("south")) return "South";
    if (normalized.startsWith("east")) return "East";
    if (normalized.startsWith("west")) return "West";
    return undefined;
}

function formatFacing(direction?: FacingDirection): string {
    return direction ? direction : "";
}

export function formatFacingDirection(direction?: string | null, mode: "english" | "nepali" = "english"): string {
    if (!direction) return "Not set";
    const parsed = parseFacing(direction) ?? (direction as FacingDirection);
    return mode === "nepali" ? NEPALI_LABELS[parsed] : ENGLISH_LABELS[parsed];
}

export function FacingInput({ name, label, variant = "house", className, note }: FacingInputProps) {
    const { watch, setValue } = useFormContext();
    const value = watch(name as any) as string | undefined;
    const [text, setText] = useState("");
    const [touched, setTouched] = useState(false);
    const [error, setError] = useState("");
    const [mode, setMode] = useState<"english" | "nepali">("english");

    useEffect(() => {
        if (!touched) {
            setText(formatFacingDirection(value, mode));
        }
    }, [value, touched, mode]);

    const variantIcon = useMemo(() => (variant === "land" ? "🟩" : "🏠"), [variant]);

    function select(direction?: FacingDirection) {
        setValue(name as any, direction ?? undefined, {
            shouldDirty: true,
            shouldValidate: true,
        });
        setText(formatFacingDirection(direction, mode));
        setError("");
        setTouched(true);
    }

    function toggleMode() {
        setMode((current) => (current === "english" ? "nepali" : "english"));
        setText(formatFacingDirection(value, mode === "english" ? "nepali" : "english"));
    }

    function onBlur() {
        const parsed = parseFacing(text);
        if (parsed) {
            select(parsed);
            return;
        }
        if (text.trim()) {
            setError("Wrong direction");
        } else {
            setError("");
        }
        setText(formatFacing(value as FacingDirection | undefined));
    }

    return (
        <div className={cn("space-y-2 w-full max-w-2xl", className)}>
            <div className="space-y-1">
                <div className="flex items-center gap-2 text-base font-bold">
                    <span>{variantIcon}</span>
                    <span className="text-foreground">{label}</span>
                    <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground"
                        onClick={toggleMode}
                    >
                        {mode === "english" ? "English" : "Nepali"} <ChevronRight className="inline h-3 w-3" />
                    </button>
                </div>

                {note && <p className="text-xs text-muted-foreground">{note}</p>}

                <input
                    type="text"
                    value={text}
                    onChange={(event) => {
                        setText(event.target.value);
                        setError("");
                        setTouched(true);
                    }}
                    onBlur={onBlur}
                    placeholder="e.g. Purba / North East"
                    className={cn("w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none text-foreground", error && "border-destructive")}
                />
                {error && <p className="text-xs font-medium text-destructive">{error}</p>}
            </div>

            <div className="flex flex-wrap gap-2">
                {DIRECTIONS.map((direction) => {
                    const isSelected = value === direction;
                    return (
                        <button
                            key={direction}
                        type="button"
                            onClick={() => select(isSelected ? undefined : direction)}
                        className={cn(
                            "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                            "border-border bg-background text-foreground hover:border-foreground hover:text-foreground",
                            isSelected && "border-foreground bg-black/5 text-foreground",
                        )}
                    >
                            {formatFacingDirection(direction, mode)}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
