'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@neup/core/database/prisma';
import { requireAuth } from '@/services/auth/account';

const AREA_UNITS = ['aana', 'ropani', 'paisa', 'daam', 'sqft', 'sqm', 'bigha', 'kattha', 'dhur'] as const;
const CURRENCIES = ['NPR', 'USD', 'INR'] as const;
const NUMBER_SYSTEMS = [
  'Indian', 'Nepali', 'Indian.readable', 'Nepali.readable', 'Indian.readable2', 'Nepali.readable2',
  'Indian.readable.devanagari', 'Nepali.readable.devanagari', 'Chinese', 'Japanese', 'Korean',
  'France', 'Germany', 'Switzerland', 'International',
] as const;

/** Validate preference values against options supported by the UI. */
function validateDisplayPreferences(input: FormData) {
  const areaUnit = String(input.get('areaUnit') ?? '');
  const currency = String(input.get('currency') ?? '');
  const numberSystem = String(input.get('numberSystem') ?? '');

  if (!AREA_UNITS.includes(areaUnit as (typeof AREA_UNITS)[number])) throw new Error('Invalid area unit');
  if (!CURRENCIES.includes(currency as (typeof CURRENCIES)[number])) throw new Error('Invalid currency');
  if (!NUMBER_SYSTEMS.includes(numberSystem as (typeof NUMBER_SYSTEMS)[number])) throw new Error('Invalid number system');

  return { areaUnit, currency, numberSystem };
}

/** Save the signed-in account's default display formats. */
export async function saveDisplayPreferences(input: FormData) {
  const account = await requireAuth();
  const display = validateDisplayPreferences(input);
  const record = await prisma.userPreference.findUnique({ where: { accountId: account.aid }, select: { preferences: true } });
  const preferences = record?.preferences && typeof record.preferences === 'object' && !Array.isArray(record.preferences)
    ? record.preferences as Record<string, unknown>
    : {};

  await prisma.userPreference.upsert({
    where: { accountId: account.aid },
    create: { accountId: account.aid, preferences: { ...preferences, display } },
    update: { preferences: { ...preferences, display } },
  });

  revalidatePath('/preferences');
}
