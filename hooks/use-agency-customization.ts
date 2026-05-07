'use client';

import { useEffect, useState } from 'react';
import type { AgencyCustomizationRule, AgencyCustomizeFor } from '@/types';
import { getCustomizationForAccount } from '@/services/agency-customization-service';

interface UseAgencyCustomizationResult {
  rule: AgencyCustomizationRule | null;
  loading: boolean;
}

/**
 * Fetches the AgencyCustomizationRule for the currently logged-in account
 * and the given customizeFor target ("property" | "lead").
 *
 * Returns null if the user has no agency mapping or no customization is configured.
 */
export function useAgencyCustomization(
  accountId: string | null | undefined,
  customizeFor: AgencyCustomizeFor,
): UseAgencyCustomizationResult {
  const [rule, setRule] = useState<AgencyCustomizationRule | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!accountId) return;
    let cancelled = false;
    setLoading(true);
    getCustomizationForAccount(accountId, customizeFor)
      .then((r) => { if (!cancelled) setRule(r); })
      .catch(() => { if (!cancelled) setRule(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [accountId, customizeFor]);

  return { rule, loading };
}
