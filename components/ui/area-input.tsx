"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormContext, useFormState } from "react-hook-form";
import { ChevronRight, Triangle } from "lucide-react";
import { cn } from "@/logica/core/utils";

type SystemKey = "aana" | "kattha" | "feet" | "meter";
type SubUnit = { key: string; label: string; steps: number[] };
type System = { key: SystemKey; label: string; units: SubUnit[] };

const SYSTEMS: System[] = [
  { key: "aana", label: "Aana System", units: [{ key: "ropani", label: "Ropani", steps: [1] }, { key: "aana", label: "Aana", steps: [1] }, { key: "paisa", label: "Paisa", steps: [1] }, { key: "daam", label: "Daam", steps: [1] }] },
  { key: "kattha", label: "Kattha System", units: [{ key: "bigha", label: "Bigha", steps: [1] }, { key: "kattha", label: "Kattha", steps: [1] }, { key: "dhur", label: "Dhur", steps: [1] }] },
  { key: "feet", label: "Feet System", units: [{ key: "sqft", label: "Sq Ft", steps: [1, 10, 100] }] },
  { key: "meter", label: "Meter System", units: [{ key: "sqm", label: "Sq Meter", steps: [1, 10, 100] }] },
];

const SYSTEM_KEYS: Record<SystemKey, string[]> = {
  aana: ["ropani", "aana", "paisa", "daam"],
  kattha: ["bigha", "kattha", "dhur"],
  feet: ["sqft"],
  meter: ["sqm"],
};

const ALL_UNITS = Object.values(SYSTEM_KEYS).flat();

const TO_SQM: Record<string, number> = {
  ropani: 508.72,
  aana: 31.8,
  paisa: 7.95,
  daam: 1.9875,
  bigha: 6772.63,
  kattha: 338.63,
  dhur: 16.93,
  sqft: 0.092903,
  sqm: 1,
};

const UNIT_SYNONYMS: Record<string, string> = {
  aana: "aana",
  ana: "aana",
  anna: "aana",
  annaa: "aana",
  aannaa: "aana",
  aaaana: "aana",
  ropani: "ropani",
  paisa: "paisa",
  daam: "daam",
  bigha: "bigha",
  kattha: "kattha",
  dhur: "dhur",
  sqft: "sqft",
  sqm: "sqm",
};

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function toSqm(vals: Record<string, number>): number {
  return Object.entries(vals).reduce((sum, [k, v]) => sum + (v || 0) * (TO_SQM[k] ?? 0), 0);
}

function fromSqm(sqm: number, system: SystemKey): Record<string, number> {
  if (sqm <= 0) return {};
  if (system === "meter") return { sqm: round2(sqm) };
  if (system === "feet") return { sqft: round2(sqm / 0.092903) };
  if (system === "aana") {
    let rem = sqm;
    const ropani = Math.floor(rem / 508.72); rem -= ropani * 508.72;
    const aana = Math.floor(rem / 31.8); rem -= aana * 31.8;
    const paisa = Math.floor(rem / 7.95); rem -= paisa * 7.95;
    const daam = Math.floor(rem / 1.9875);
    return { ropani, aana, paisa, daam };
  }
  let rem = sqm;
  const bigha = Math.floor(rem / 6772.63); rem -= bigha * 6772.63;
  const kattha = Math.floor(rem / 338.63); rem -= kattha * 338.63;
  const dhur = Math.floor(rem / 16.93);
  return { bigha, kattha, dhur };
}

function detectSystem(vals: Record<string, number>): SystemKey {
  if (vals.ropani || vals.aana || vals.paisa || vals.daam) return "aana";
  if (vals.bigha || vals.kattha || vals.dhur) return "kattha";
  if (vals.sqm) return "meter";
  if (vals.sqft) return "feet";
  return "aana";
}

function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^a-z]/g, "");
}

function normalizeUnit(word: string): string | null {
  const normalized = normalizeWord(word);
  if (!normalized) return null;
  if (UNIT_SYNONYMS[normalized]) return UNIT_SYNONYMS[normalized];
  if (normalized.startsWith("aan")) return "aana";
  if (normalized.startsWith("rop")) return "ropani";
  if (normalized.startsWith("pai")) return "paisa";
  if (normalized.startsWith("daa")) return "daam";
  if (normalized.startsWith("kat")) return "kattha";
  if (normalized.startsWith("big")) return "bigha";
  if (normalized.startsWith("dhu")) return "dhur";
  if (normalized.startsWith("sqf")) return "sqft";
  if (normalized.startsWith("sqm")) return "sqm";
  return null;
}

function parseLooseText(text: string): Record<string, number> {
  const lower = text.toLowerCase();
  const matches = lower.match(/\d+(?:\.\d+)?|[a-z]+/g) || [];
  const out: Record<string, number> = {};
  let pendingNumber: number | null = null;
  let lastUnit: string | null = null;

  const pushCurrent = () => {
    if (!lastUnit) return;
    if (pendingNumber == null) {
      out[lastUnit] = Math.max(0, Number(out[lastUnit] ?? 0));
    } else {
      out[lastUnit] = Number(out[lastUnit] ?? 0) + pendingNumber;
    }
    pendingNumber = null;
    lastUnit = null;
  };

  for (const token of matches) {
    if (/^\d/.test(token)) {
      pendingNumber = Number(token);
      continue;
    }
    const unit = normalizeUnit(token);
    if (!unit) continue;
    pushCurrent();
    lastUnit = unit;
    if (pendingNumber == null) pendingNumber = 0;
  }

  pushCurrent();
  return out;
}

function parseTextForSystem(text: string, system: SystemKey): Record<string, number> {
  if (hasExplicitSystemHint(text)) return parseLooseText(text);

  const values = text
    .match(/\d+(?:\.\d+)?/g)
    ?.map((value) => Number(value))
    .filter((value) => Number.isFinite(value)) ?? [];

  if (!values.length) return {};

  const out: Record<string, number> = {};
  const units = SYSTEM_KEYS[system];
  for (const [index, value] of values.entries()) {
    const unit = units[index];
    if (!unit) break;
    out[unit] = value;
  }

  return out;
}

function hasExplicitSystemHint(text: string): boolean {
  const lower = text.toLowerCase();
  return /(ropani|aana|ana|anna|annaa|aannaa|paisa|daam|bigha|kattha|dhur|sqft|sq\s*ft|sqm|sq\s*m)/i.test(lower);
}

function formatText(vals: Record<string, number>, system: SystemKey): string {
  const order = SYSTEM_KEYS[system];
  return order
    .map((key) => ({ key, value: vals[key] }))
    .filter(({ value }) => Number(value) > 0)
    .map(({ key, value }) => `${String(Number(value) || 0).replace(/\.0+$/, "")} ${key === "sqft" ? "Sq Ft" : key === "sqm" ? "Sq Meter" : key.charAt(0).toUpperCase() + key.slice(1)}`)
    .join(" ");
}

function formatCompactText(vals: Record<string, number>, system: SystemKey): string {
  const order = SYSTEM_KEYS[system];
  return order
    .map((key) => ({ key, value: vals[key] }))
    .map(({ value }) => String(Number(value) || 0).replace(/\.0+$/, ""))
    .join("-");
}

function formatEmptyValue(system: SystemKey): string {
  switch (system) {
    case "kattha":
      return "0 Kattha";
    case "feet":
      return "0 Sq Ft";
    case "meter":
      return "0 Sq Meter";
    case "aana":
    default:
      return "0 Daam";
  }
}

function getDisplayText(vals: Record<string, number>, system: SystemKey, focused: boolean) {
  const sqm = toSqm(vals);
  if (focused) {
    return sqm > 0 ? formatCompactText(fromSqm(sqm, system), system) : formatCompactText(fromSqm(0, system), system);
  }
  return sqm > 0 ? formatText(fromSqm(sqm, system), system) : formatEmptyValue(system);
}

interface AreaInputProps {
  label?: string;
  name?: string;
  className?: string;
  note?: string;
}

export function AreaInput({ label = "Total Area", name = "area", className, note }: AreaInputProps) {
  const { watch, setValue, control } = useFormContext();
  const { errors } = useFormState({ control, name: name as any });
  const [activeSystem, setActiveSystem] = useState<SystemKey>("aana");
  const [systemTouched, setSystemTouched] = useState(false);
  const [text, setText] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const canonicalSqm = useRef(0);
  const initialised = useRef(false);

  const get = (unit: string): number => Number(watch(`${name}.${unit}` as any) ?? 0);

  const currentVals = useMemo(() => {
    const vals: Record<string, number> = {};
    for (const unit of ALL_UNITS) vals[unit] = get(unit);
    return vals;
  }, [watch(name as any)]);

  useEffect(() => {
    const sqm = toSqm(currentVals);
    if (!initialised.current || sqm !== canonicalSqm.current) {
      canonicalSqm.current = sqm;
      initialised.current = true;
      const detected = detectSystem(currentVals);
      if (!systemTouched) setActiveSystem(detected);
      const sys = SYSTEMS.find((s) => s.key === (activeSystem ?? detected)) ?? SYSTEMS[0];
      setText(getDisplayText(currentVals, sys.key, isFocused));
    }
  }, [activeSystem, currentVals, isFocused, systemTouched]);

  const system = useMemo(() => SYSTEMS.find((s) => s.key === activeSystem) ?? SYSTEMS[0], [activeSystem]);
  const visibleUnits = useMemo(() => {
    return system.units.map((unit) => ({
      ...unit,
      visibleSteps: unit.steps.filter((step) => (currentVals[unit.key] ?? 0) >= step),
    }));
  }, [system.key, currentVals]);
  const hint = useMemo(() => {
    switch (system.key) {
      case "aana":
        return "e.g. 1 Aana 2 Paisa 2 Daam";
      case "kattha":
        return "e.g. 1 Bigha 2 Kattha 3 Dhur";
      case "feet":
        return "e.g. 1200 Sqft";
      case "meter":
        return "e.g. 120 Sqm";
      default:
        return "Type area";
    }
  }, [system.key]);
  const errorMessage = (() => {
    const parts = name.split(".");
    let node: any = errors;
    for (const part of parts) {
      node = node?.[part];
      if (!node) return undefined;
    }
    return typeof node?.message === "string" ? node.message : undefined;
  })();

  function applyParsed(nextText: string, opts?: { keepText?: boolean; forceSystem?: SystemKey }) {
    const fallbackSystem = opts?.forceSystem ?? activeSystem;
    const parsed = parseTextForSystem(nextText, fallbackSystem);
    const nextSystem = opts?.forceSystem ?? (hasExplicitSystemHint(nextText) ? detectSystem(parsed) : activeSystem);
    const converted = fromSqm(toSqm(parsed), nextSystem);
    setActiveSystem(nextSystem);
    setSystemTouched(true);
    canonicalSqm.current = toSqm(parsed);

    for (const u of ALL_UNITS) setValue(`${name}.${u}` as any, undefined, { shouldDirty: true, shouldValidate: true });
    for (const [u, v] of Object.entries(converted)) setValue(`${name}.${u}` as any, v > 0 ? v : undefined, { shouldDirty: true, shouldValidate: true });

    setText(
      opts?.keepText
        ? nextText
        : toSqm(converted) > 0
          ? formatText(converted, nextSystem)
          : formatEmptyValue(nextSystem),
    );
  }

  function onBlur() {
    if (!text.trim()) {
      for (const u of ALL_UNITS) setValue(`${name}.${u}` as any, undefined, { shouldDirty: true, shouldValidate: true });
      setText(formatEmptyValue(activeSystem));
      setIsFocused(false);
      return;
    }
    applyParsed(text, { keepText: false, forceSystem: hasExplicitSystemHint(text) ? undefined : activeSystem });
    setIsFocused(false);
  }

  function onFocus() {
    setIsFocused(true);
    setText(getDisplayText(currentVals, activeSystem, true));
  }

  function switchSystem(next: SystemKey) {
    const sqm = toSqm(currentVals);
    setActiveSystem(next);
    setSystemTouched(true);
    canonicalSqm.current = sqm;

    for (const u of ALL_UNITS) setValue(`${name}.${u}` as any, undefined, { shouldDirty: true, shouldValidate: true });
    const converted = fromSqm(sqm, next);
    for (const [u, v] of Object.entries(converted)) setValue(`${name}.${u}` as any, v > 0 ? v : undefined, { shouldDirty: true, shouldValidate: true });
    setText(getDisplayText(converted, next, isFocused));
  }

  function nudge(unit: string, delta: number) {
    const parsed = parseTextForSystem(text, activeSystem);
    const basis = toSqm(parsed) > 0 ? parsed : fromSqm(toSqm(currentVals), activeSystem);
    const next = { ...basis, [unit]: Math.max(0, Number(basis[unit] ?? 0) + delta) };
    const converted = fromSqm(toSqm(next), activeSystem);
    setActiveSystem(activeSystem);
    setSystemTouched(true);
    canonicalSqm.current = toSqm(next);
    setText(getDisplayText(converted, activeSystem, isFocused));
    for (const u of ALL_UNITS) setValue(`${name}.${u}` as any, undefined, { shouldDirty: true, shouldValidate: true });
    for (const [u, v] of Object.entries(converted)) setValue(`${name}.${u}` as any, v > 0 ? v : undefined, { shouldDirty: true, shouldValidate: true });
  }

  return (
    <div className={cn("space-y-2 w-full max-w-2xl", className)}>
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-base font-bold">
          <Triangle className="h-4 w-4 rotate-90 text-muted-foreground" />
          <span className="text-foreground">{label}</span>
          <button
            type="button"
            onClick={() => {
              const systems = SYSTEMS.map((s) => s.key);
              const currentIndex = systems.indexOf(system.key);
              const next = systems[(currentIndex + 1) % systems.length];
              switchSystem(next);
            }}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ({system.label}) <ChevronRight className="inline h-3 w-3" />
          </button>
        </div>

        {note && <p className="text-xs text-muted-foreground">{note}</p>}

        <input
          type="text"
          value={text}
          onChange={(e) => {
            setText(e.target.value.toLowerCase());
            setSystemTouched(true);
          }}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={isFocused ? hint : ""}
          className={cn("w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none text-foreground", errorMessage && "border-destructive")}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {visibleUnits.map((unit) => (
          <div key={unit.key} className="flex flex-wrap items-center gap-2">
            {unit.visibleSteps.map((step) => (
              <button key={`-${unit.key}-${step}`} type="button" onClick={() => nudge(unit.key, -step)} className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground hover:border-foreground hover:text-foreground">
                - {step} {unit.label}
              </button>
            ))}
            {unit.steps.map((step) => (
              <button key={`+${unit.key}-${step}`} type="button" onClick={() => nudge(unit.key, step)} className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground hover:border-foreground hover:text-foreground">
                + {step} {unit.label}
              </button>
            ))}
          </div>
        ))}
      </div>

      {errorMessage && <p className="text-sm font-medium text-destructive">{errorMessage}</p>}
    </div>
  );
}
