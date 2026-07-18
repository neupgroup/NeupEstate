/*
::neup.documentation::inapp-agency-customization-hook
::title Inapp Agency Customization Hook

Client hook for loading the active account's agency customization rule.

::public

Use this hook inside client property or lead forms when agency-level required
fields need to be enforced in the UI.

::public end

::end
*/

'use client';

import { useEffect, useState } from 'react';
import type { AgencyCustomizationRule, AgencyCustomizeFor } from '@/types';
import { getCustomizationForAccount } from '@/services/agency-customization-service';

type UseAgencyCustomizationResult = {
  rule: AgencyCustomizationRule | null;
  isLoading: boolean;
};

export function useAgencyCustomization(
  accountId: string | null | undefined,
  customizeFor: AgencyCustomizeFor,
): UseAgencyCustomizationResult {
  const [rule, setRule] = useState<AgencyCustomizationRule | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function loadRule() {
      if (!accountId?.trim()) {
        setRule(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const nextRule = await getCustomizationForAccount(accountId.trim(), customizeFor);
        if (!isCancelled) {
          setRule(nextRule);
        }
      } catch {
        if (!isCancelled) {
          setRule(null);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadRule();

    return () => {
      isCancelled = true;
    };
  }, [accountId, customizeFor]);

  return { rule, isLoading };
}
