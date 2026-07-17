import type { Property } from '@/types';

function hasPositivePrice(value: number | null | undefined): value is number {
  return typeof value === 'number' && !Number.isNaN(value) && value > 0;
}

export function getHiddenPriceLabel(property: Pick<Property, 'pricing'>): string | null {
  const mode = property.pricing?.priceDisplayMode;

  if (mode === 'price-on-call') return 'Price on call';
  if (mode === 'offer-yours-first') return 'Offer yours first';

  return null;
}

export function getPrimaryCurrency(property: Pick<Property, 'pricing'>): string {
  return property.pricing?.currency || 'USD';
}

export function getPrimaryPrice(property: Pick<Property, 'price' | 'pricing'>): number {
  if (hasPositivePrice(property.pricing?.listed)) {
    return property.pricing.listed;
  }

  return property.price || 0;
}

export function formatPricingBasisSuffix({
  basis,
  frequency,
  unit,
}: {
  basis?: string | null;
  frequency?: string | null;
  unit?: string | null;
}): string | null {
  const normalizedBasis = basis?.trim().toLowerCase() || '';
  const normalizedFrequency = frequency?.trim();
  const normalizedUnit = unit?.trim();
  const hasPerUnitBasis = normalizedBasis.includes('unit') || normalizedBasis.includes('per-aana') || normalizedBasis.includes('per-ropani') || normalizedBasis.includes('per-sqft');
  const hasFlatBasis = normalizedBasis.includes('flat') || normalizedBasis === 'flat-price';

  if (normalizedFrequency && normalizedUnit) {
    return `per ${normalizedUnit} per ${normalizedFrequency}`;
  }

  if (normalizedUnit && hasPerUnitBasis) {
    return `per ${normalizedUnit}`;
  }

  if (normalizedFrequency && (!hasFlatBasis || normalizedBasis.includes('rent'))) {
    return `per ${normalizedFrequency}`;
  }

  return null;
}

export function getPrimaryPricingSuffix(property: Pick<Property, 'pricing'>): string | null {
  const basis = property.pricing?.basis;

  return formatPricingBasisSuffix({
    basis,
    frequency: basis ? property.pricing?.basisFrequencies?.[basis] ?? null : null,
    unit: basis ? property.pricing?.basisUnits?.[basis] ?? null : null,
  });
}
