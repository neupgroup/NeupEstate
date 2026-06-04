"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { formatNepaliComma, toNepaliReadableWords } from "@/logica/core/nepali-price";
import { cn } from "@/logica/core/utils";

interface PriceInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type"> {
  value: string;
  onChange: (raw: string) => void;
  /** Extra className for the wrapper div */
  wrapperClassName?: string;
}

/**
 * A price input that:
 * - Accepts only digits
 * - Shows Devanagari-style comma formatting (e.g. 68,00,000) as the user types
 * - Displays the Nepali word equivalent below (e.g. "68 Lakhs")
 * - Passes the raw numeric string back via onChange
 */
export function PriceInput({ value, onChange, wrapperClassName, className, ...props }: PriceInputProps) {
  const formatted = formatNepaliComma(value);
  const words = toNepaliReadableWords(value);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Strip everything except digits
    const raw = e.target.value.replace(/[^0-9]/g, "");
    onChange(raw);
  }

  return (
    <div className={cn("space-y-1", wrapperClassName)}>
      <Input
        {...props}
        type="text"
        inputMode="numeric"
        value={formatted}
        onChange={handleChange}
        className={className}
      />
      {words && (
        <p className="text-xs text-muted-foreground pl-0.5">{words}</p>
      )}
    </div>
  );
}
