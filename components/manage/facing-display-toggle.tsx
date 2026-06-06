"use client";

import { useState } from "react";
import { formatFacingDirection } from "@/components/ui/facing-input";

export function FacingDisplayToggle({ value }: { value?: string | null }) {
    const [mode, setMode] = useState<"english" | "nepali">("english");

    return (
        <button
            type="button"
            onClick={() => setMode((current) => (current === "english" ? "nepali" : "english"))}
            className="w-full rounded-xl border bg-background px-4 py-3 text-left transition-colors hover:bg-muted/40"
            title="Click to change facing language"
        >
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Facing</div>
            <div className="mt-1 text-sm font-medium text-foreground">{formatFacingDirection(value, mode)}</div>
        </button>
    );
}
