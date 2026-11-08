'use client';

import { DisplayCurrency } from '@/components/display-preferences';

/** Render scraped competitor prices using the account currency when the value is numeric. */
export function CompetitorPrice({ value, fallbackCurrency = 'NPR' }: { value: unknown; fallbackCurrency?: string }) {
  const price = parseCompetitorPrice(value, fallbackCurrency);
  if (price == null) return <>Not provided</>;
  if (typeof price === 'string') return <>{price}</>;
  return <DisplayCurrency amount={price.amount} sourceCurrency={price.currency} />;
}

/** Extract a numeric amount and optional currency from common scraper payload shapes. */
function parseCompetitorPrice(value: unknown, fallbackCurrency: string): { amount: number; currency: string } | string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return { amount: value, currency: fallbackCurrency };
  if (typeof value === 'string') {
    const numeric = Number(value.replace(/[,_\s]/g, ''));
    return Number.isFinite(numeric) ? { amount: numeric, currency: fallbackCurrency } : value;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const record = value as Record<string, unknown>;
  const amount = Number(record.amount ?? record.value ?? record.price);
  if (!Number.isFinite(amount)) return JSON.stringify(value);
  const currency = typeof record.currency === 'string' ? record.currency : fallbackCurrency;
  return { amount, currency };
}
