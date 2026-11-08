import { prisma } from '@neup/core/database/prisma';

export type DisplayPreferences = {
  areaUnit: string;
  currency: string;
  numberSystem: string;
};

export type DisplayConfiguration = {
  preferences: DisplayPreferences;
  usdRates: Record<string, number>;
};

const DEFAULT_PREFERENCES: DisplayPreferences = {
  areaUnit: 'aana',
  currency: 'NPR',
  numberSystem: 'Nepali',
};

type ExchangeRateResponse = {
  result?: string;
  rates?: Record<string, number>;
};

/** Load supported display settings from the signed-in account's JSON preferences. */
export async function getDisplayConfiguration(accountId?: string | null): Promise<DisplayConfiguration> {
  const [preferences, usdRates] = await Promise.all([
    getAccountDisplayPreferences(accountId),
    getLatestUsdRates(),
  ]);

  return { preferences, usdRates };
}

/** Read and validate display settings stored in accounts.more_details.preferences.display. */
async function getAccountDisplayPreferences(accountId?: string | null): Promise<DisplayPreferences> {
  if (!accountId) return DEFAULT_PREFERENCES;

  let moreDetailsValue: unknown;
  try {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
      select: { moreDetails: true },
    });
    moreDetailsValue = account?.moreDetails;
  } catch {
    return DEFAULT_PREFERENCES;
  }
  const moreDetails = asRecord(moreDetailsValue);
  const preferences = asRecord(moreDetails.preferences);
  const display = asRecord(preferences.display);

  return {
    areaUnit: typeof display.areaUnit === 'string' ? display.areaUnit : DEFAULT_PREFERENCES.areaUnit,
    currency: typeof display.currency === 'string' ? display.currency : DEFAULT_PREFERENCES.currency,
    numberSystem: typeof display.numberSystem === 'string' ? display.numberSystem : DEFAULT_PREFERENCES.numberSystem,
  };
}

/** Fetch the provider's daily USD reference rates; keep pages usable during provider outages. */
async function getLatestUsdRates(): Promise<Record<string, number>> {
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD', {
      next: { revalidate: 86_400 },
    });
    if (!response.ok) return { USD: 1 };

    const data = await response.json() as ExchangeRateResponse;
    if (data.result !== 'success' || !data.rates) return { USD: 1 };
    return { USD: 1, ...data.rates };
  } catch {
    return { USD: 1 };
  }
}

/** Return a plain record for safely reading JSON values. */
function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}
