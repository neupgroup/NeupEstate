"use client";

import { useState } from "react";
import { Compass } from "lucide-react";
import { formatFacingDirection } from "@/components/ui/facing-input";

export function FacingDisplayToggle({ value }: { value?: string | null }) {
    const [mode, setMode] = useState<"english" | "nepali">("english");

    return (
        <button
            type="button"
            onClick={() => setMode((current) => (current === "english" ? "nepali" : "english"))}
            className="group flex w-full items-center gap-3 rounded-lg border border-border/70 bg-background px-3 py-2.5 text-left transition-colors duration-200 ease-out hover:border-primary/40 hover:bg-primary/5"
            title="Click to change facing language"
        >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary transition-colors duration-200 ease-out group-hover:border-primary/35 group-hover:bg-primary/15">
                <Compass className="h-5 w-5" />
            </div>
            <div className="min-w-0">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Facing</div>
                <div className="mt-1 text-sm font-medium text-foreground">{formatFacingDirection(value, mode)}</div>
            </div>
        </button>
    );
}
