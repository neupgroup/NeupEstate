'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { formatNumber, type NumberingSystem } from '@neup/numbering-system';
import type { DisplayConfiguration, DisplayPreferences } from '@/services/preferences/display';

const DEFAULT_PREFERENCES: DisplayPreferences = {
  areaUnit: 'aana',
  currency: 'NPR',
  numberSystem: 'Nepali',
};

const DEFAULT_CONFIGURATION: DisplayConfiguration = {
  preferences: DEFAULT_PREFERENCES,
  usdRates: { USD: 1 },
};

const DisplayConfigurationContext = createContext<DisplayConfiguration>(DEFAULT_CONFIGURATION);

/** Share account display settings with every client component in the app shell. */
export function DisplayPreferencesProvider({
  children,
  configuration,
}: {
  children: ReactNode;
  configuration: DisplayConfiguration;
}) {
  return (
    <DisplayConfigurationContext.Provider value={configuration}>
      {children}
    </DisplayConfigurationContext.Provider>
  );
}

/** Return the current account's display preferences and cached exchange rates. */
export function useDisplayConfiguration(): DisplayConfiguration {
  return useContext(DisplayConfigurationContext);
}

/** Format a numeric value with the account's selected numbering system. */
export function DisplayNumber({
  value,
  maximumFractionDigits = 2,
}: {
  value: number | null | undefined;
  maximumFractionDigits?: number;
}) {
  const { preferences } = useDisplayConfiguration();
  if (value == null || !Number.isFinite(Number(value))) return null;
  return formatNumberWithPrecision(Number(value), preferences.numberSystem, maximumFractionDigits);
}

/** Convert and format a price using the account's preferred currency. */
export function DisplayCurrency({
  amount,
  sourceCurrency,
  maximumFractionDigits = 0,
}: {
  amount: number | null | undefined;
  sourceCurrency?: string | null;
  maximumFractionDigits?: number;
}) {
  const numericAmount = Number(amount);
  const configuration = useDisplayConfiguration();
  if (amount == null || !Number.isFinite(numericAmount)) return null;
  return formatDisplayCurrency(numericAmount, sourceCurrency, configuration, maximumFractionDigits);
}

/** Render a listing amount with its source currency and preferred price basis units. */
export function DisplayListingPrice({
  amount,
  sourceCurrency,
  basis,
}: {
  amount: number | null | undefined;
  sourceCurrency?: string | null;
  basis?: string | null;
}) {
  const configuration = useDisplayConfiguration();
  const numericAmount = Number(amount);
  if (amount == null || !Number.isFinite(numericAmount)) return null;
  const sourceAreaUnit = getBasisAreaUnit(basis);
  const targetAreaUnit = configuration.preferences.areaUnit;
  const adjustedAmount = sourceAreaUnit
    ? numericAmount * getSquareMetresPerAreaUnit(targetAreaUnit) / getSquareMetresPerAreaUnit(sourceAreaUnit)
    : numericAmount;
  const suffix = getPriceBasisSuffix(basis, targetAreaUnit);

  return <>{formatDisplayCurrency(adjustedAmount, sourceCurrency, configuration)}{suffix ? ` ${suffix}` : ''}</>;
}

/** Convert square metre based price basis labels into the selected area unit. */
export function DisplayPriceBasis({ basis }: { basis?: string | null }) {
  const { preferences } = useDisplayConfiguration();
  const suffix = getPriceBasisSuffix(basis, preferences.areaUnit);
  if (suffix) return suffix;
  if (basis === 'total') return 'Total price';
  if (basis === 'perMonth') return 'Price per month';
  if (basis === 'perYear') return 'Price per year';
  return basis?.trim() || 'Not specified';
}

/** Convert and format an amount using a display configuration without React state. */
export function formatDisplayCurrency(
  amount: number,
  sourceCurrency: string | null | undefined,
  configuration: DisplayConfiguration,
  maximumFractionDigits = 0,
): string {
  const { preferences, usdRates } = configuration;
  const source = (sourceCurrency || preferences.currency).toUpperCase();
  const target = preferences.currency.toUpperCase();
  const sourceRate = usdRates[source];
  const targetRate = usdRates[target];
  const hasConversionRate = Boolean(sourceRate && targetRate);
  const convertedAmount = source === target ? amount : hasConversionRate ? amount / sourceRate! * targetRate! : amount;
  const currency = source === target || hasConversionRate ? target : source;
  const formatter = new Intl.NumberFormat(getLocale(preferences.numberSystem), {
    style: 'currency',
    currency,
    maximumFractionDigits,
  });
  if (!preferences.numberSystem.includes('.readable')) return formatter.format(convertedAmount);

  const parts = formatter.formatToParts(0);
  const numberStart = parts.findIndex((part) => part.type === 'integer');
  const numberEnd = parts.findIndex((part) => part.type === 'fraction');
  const prefix = parts.slice(0, numberStart).map((part) => part.value).join('');
  const suffix = parts.slice(numberEnd >= 0 ? numberEnd + 1 : numberStart + 1).map((part) => part.value).join('');
  return `${prefix}${formatNumberWithPrecision(convertedAmount, preferences.numberSystem, maximumFractionDigits)}${suffix}`;
}

/** Format a number with a selected numbering system for client calculations and charts. */
export function formatDisplayNumber(value: number, numberSystem: string, maximumFractionDigits = 2): string {
  return formatNumberWithPrecision(value, numberSystem, maximumFractionDigits);
}

/** Format an optional minimum and maximum budget in the selected currency. */
export function DisplayBudget({
  minimum,
  maximum,
  sourceCurrency = 'NPR',
}: {
  minimum?: number | null;
  maximum?: number | null;
  sourceCurrency?: string;
}) {
  if (minimum != null && maximum != null) {
    return <>{<DisplayCurrency amount={minimum} sourceCurrency={sourceCurrency} />} – {<DisplayCurrency amount={maximum} sourceCurrency={sourceCurrency} />}</>;
  }
  if (minimum != null) return <>From <DisplayCurrency amount={minimum} sourceCurrency={sourceCurrency} /></>;
  if (maximum != null) return <>Up to <DisplayCurrency amount={maximum} sourceCurrency={sourceCurrency} /></>;
  return null;
}

/** Convert square metres into the selected property unit and format the result. */
export function DisplayArea({
  squareMetres,
  maximumFractionDigits = 2,
}: {
  squareMetres: number | null | undefined;
  maximumFractionDigits?: number;
}) {
  const { preferences } = useDisplayConfiguration();
  const area = Number(squareMetres);
  if (squareMetres == null || !Number.isFinite(area) || area <= 0) return null;

  const unit = preferences.areaUnit;
  const factor = SQUARE_METRES_PER_UNIT[unit] ?? 1;
  const converted = area / factor;
  const suffix = AREA_SUFFIX[unit] ?? 'm²';
  return `${formatNumberWithPrecision(converted, preferences.numberSystem, maximumFractionDigits)} ${suffix}`;
}

/** Normalize common scraped area values before displaying them in the preferred property unit. */
export function DisplayAreaValue({ value }: { value: unknown }) {
  const squareMetres = parseAreaValue(value);
  return <DisplayArea squareMetres={squareMetres} />;
}

const SQUARE_METRES_PER_UNIT: Record<string, number> = {
  aana: 31.8,
  ropani: 508.72,
  paisa: 7.95,
  daam: 1.9875,
  bigha: 6772.63,
  kattha: 338.63,
  dhur: 16.93,
  sqft: 0.092903,
  sqm: 1,
};

/** Return the square metre factor for a supported property area unit. */
function getSquareMetresPerAreaUnit(unit: string): number {
  return SQUARE_METRES_PER_UNIT[unit] ?? 1;
}

/** Convert numeric, labelled, or structured area values into square metres. */
function parseAreaValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  let rawValue: unknown = value;
  let unit = 'sqm';
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    rawValue = record.value ?? record.amount ?? record.area;
    if (typeof record.unit === 'string') unit = normalizeAreaUnit(record.unit);
  }
  if (typeof rawValue !== 'string' && typeof rawValue !== 'number') return null;
  const text = String(rawValue).trim();
  const unitMatch = text.match(/(sq\.?\s*ft|sq\.?\s*m|square\s*feet|square\s*met(?:er|re)s?|ft²|m²|sqft|sqm|ropani|aana|paisa|daam|bigha|kattha|dhur)/i);
  if (unitMatch) unit = normalizeAreaUnit(unitMatch[0]);
  const numeric = Number(text.replace(/[^\d,.-]/g, '').replace(/,/g, ''));
  if (!Number.isFinite(numeric)) return null;
  return numeric * getSquareMetresPerAreaUnit(unit);
}

/** Map common scraped area unit labels to this app's area unit names. */
function normalizeAreaUnit(unit: string): string {
  const normalized = unit.toLowerCase().replace(/[.\s]/g, '');
  if (['sqft', 'ft²', 'squarefeet'].includes(normalized)) return 'sqft';
  if (['sqm', 'm²', 'squaremeters', 'squaremetres'].includes(normalized)) return 'sqm';
  if (['ropani', 'aana', 'paisa', 'daam', 'bigha', 'kattha', 'dhur'].includes(normalized)) return normalized;
  return 'sqm';
}

/** Identify the unit in which a stored per-area price is denominated. */
function getBasisAreaUnit(basis?: string | null): string | null {
  const normalized = basis?.trim().toLowerCase() ?? '';
  if (normalized === 'perunit' || normalized === 'perunitpermonth' || normalized === 'perunitperyear') return 'sqm';
  if (normalized.includes('per-sqft') || normalized.includes('persqft')) return 'sqft';
  if (normalized.includes('per-aana') || normalized.includes('peraana')) return 'aana';
  if (normalized.includes('per-ropani') || normalized.includes('perropani')) return 'ropani';
  return null;
}

/** Build the displayed pricing frequency and area unit from the stored basis. */
function getPriceBasisSuffix(basis: string | null | undefined, areaUnit: string): string | null {
  const normalized = basis?.trim().toLowerCase() ?? '';
  const perAreaUnit = getBasisAreaUnit(basis);
  const frequency = normalized.includes('month') ? 'per month' : normalized.includes('year') || normalized.includes('annum') ? 'per year' : null;
  if (perAreaUnit) return [
    `per ${AREA_SUFFIX[areaUnit] ?? areaUnit}`,
    frequency,
  ].filter(Boolean).join(' ');
  if (frequency) return frequency;
  return null;
}

const AREA_SUFFIX: Record<string, string> = {
  aana: 'aana',
  ropani: 'ropani',
  paisa: 'paisa',
  daam: 'daam',
  bigha: 'bigha',
  kattha: 'kattha',
  dhur: 'dhur',
  sqft: 'ft²',
  sqm: 'm²',
};

/** Pick a grouping locale for standard Indian and Nepali numbering styles. */
function getLocale(numberSystem: string): string {
  if (numberSystem.startsWith('Indian')) return 'en-IN';
  if (numberSystem.startsWith('Nepali')) return 'ne-NP';
  if (numberSystem === 'France') return 'fr-FR';
  if (numberSystem === 'Germany') return 'de-DE';
  if (numberSystem === 'Switzerland') return 'de-CH';
  if (numberSystem === 'Chinese') return 'zh-CN';
  if (numberSystem === 'Japanese') return 'ja-JP';
  if (numberSystem === 'Korean') return 'ko-KR';
  return 'en-US';
}

/** Format a value to the requested precision before applying its numbering style. */
function formatNumberWithPrecision(value: number, numberSystem: string, maximumFractionDigits: number): string {
  const fixed = value.toFixed(maximumFractionDigits).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  return formatNumber(fixed, numberSystem as NumberingSystem);
}
