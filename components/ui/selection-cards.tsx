"use client";

import { Check } from "lucide-react";
import { cn } from "@/core/utils";

export interface SelectionCardsProps {
    options: readonly string[];
    selected: string[];
    onToggle: (option: string) => void;
    disabled?: Set<string>;
    /** Allow multiple selections */
    multi?: boolean;
    /** Show order numbers when multiple items are selected */
    showOrder?: boolean;
    className?: string;
}

export function SelectionCards({
    options,
    selected,
    onToggle,
    disabled = new Set(),
    multi = false,
    showOrder = false,
    className,
}: SelectionCardsProps) {
    return (
        <div className={cn("grid grid-cols-2 sm:grid-cols-4 gap-3", className)}>
            {options.map((option) => {
                const isSelected = selected.includes(option);
                const isDisabled = disabled.has(option);
                const orderNum = showOrder && multi && isSelected && selected.length > 1
                    ? selected.indexOf(option) + 1
                    : null;

                return (
                    <button
                        key={option}
                        type="button"
                        onClick={() => !isDisabled && onToggle(option)}
                        aria-pressed={isSelected}
                        aria-disabled={isDisabled}
                        className={cn(
                            "flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-all text-left",
                            isSelected && !isDisabled
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-background text-foreground hover:border-muted-foreground",
                            isDisabled && "opacity-50 cursor-not-allowed select-none"
                        )}
                    >
                        <span className={cn(
                            "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold",
                            isSelected && !isDisabled
                                ? "border-primary bg-primary text-white"
                                : "border-muted-foreground"
                        )}>
                            {orderNum ?? (isSelected ? <Check className="h-2.5 w-2.5" /> : null)}
                        </span>
                        <span>{option}</span>
                    </button>
                );
            })}
        </div>
    );
}
