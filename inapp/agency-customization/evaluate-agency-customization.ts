/*
::neup.documentation::inapp-agency-customization-evaluator
::title Inapp Agency Customization Evaluator

Evaluates required agency customization fields against property form values.

::public

Use this helper in client-side property forms to enforce agency-required fields
before submit or step advance.

::public end

::end
*/

import type { AgencyCustomizationRule, CreatePropertyFormValues } from '@/types';

type AgencyCustomizationValues = Partial<CreatePropertyFormValues> & Record<string, unknown>;

function getValueAtPath(source: unknown, path: string): unknown {
  if (!source || typeof source !== 'object' || !path.trim()) return undefined;

  let current: unknown = source;
  for (const segment of path.split('.').filter(Boolean)) {
    if (!current || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function isFilledValue(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return Number.isFinite(value) && value > 0;
  if (typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.some((entry) => isFilledValue(entry));
  if (typeof value === 'object') return Object.values(value).some((entry) => isFilledValue(entry));
  return true;
}

function toFieldLabel(path: string): string {
  const last = path.split('.').filter(Boolean).pop() || path;
  return last
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

export function evaluateAgencyCustomization(
  rule: AgencyCustomizationRule | null | undefined,
  values: AgencyCustomizationValues,
): Record<string, string> {
  if (!rule) return {};

  const errors: Record<string, string> = {};

  for (const fieldPath of rule.required) {
    const value = getValueAtPath(values, fieldPath);
    if (!isFilledValue(value)) {
      errors[fieldPath] = `${toFieldLabel(fieldPath)} is required by your agency customization.`;
    }
  }

  return errors;
}
