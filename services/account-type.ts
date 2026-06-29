export type StoredAccountType =
  | 'brand'
  | 'brand.agency'
  | 'subbrand'
  | 'subbrand.agency'
  | 'individual'
  | 'individual.worker'
  | 'individual.agent'
  | 'dependent'
  | 'guest';

export function normalizeBaseAccountType(accountType?: string | null): StoredAccountType {
  const normalized = accountType?.trim().toLowerCase();

  if (normalized === 'guest') return 'guest';
  if (normalized === 'dependent') return 'dependent';
  if (normalized === 'brand' || normalized === 'brand.agency') return 'brand';
  if (normalized === 'branch' || normalized === 'branch.agency') return 'subbrand';
  if (normalized === 'subbrand' || normalized === 'subbrand.agency') return 'subbrand';
  if (normalized === 'individual.worker') return 'individual.worker';
  if (normalized === 'individual.agent') return 'individual.agent';
  if (normalized === 'individual') return 'individual';

  return 'individual';
}

export function resolveStoredAccountType(args: {
  remoteAccountType?: string | null;
  existingAccountType?: string | null;
}): StoredAccountType {
  const baseType = normalizeBaseAccountType(args.remoteAccountType);
  const existingType = args.existingAccountType?.trim().toLowerCase();

  if (existingType === 'brand.agency' && baseType === 'brand') {
    return 'brand.agency';
  }

  if (existingType === 'subbrand.agency' && baseType === 'subbrand') {
    return 'subbrand.agency';
  }

  if (existingType === 'individual.agent' && baseType === 'individual') {
    return 'individual.agent';
  }

  if (existingType === 'individual.worker' && baseType === 'individual') {
    return 'individual.worker';
  }

  return baseType;
}

export function promoteStoredAccountType(
  currentType: string | null | undefined,
  target: 'agency' | 'worker' | 'agent',
): StoredAccountType {
  const normalized = currentType?.trim().toLowerCase();

  if (target === 'agency') {
    if (
      normalized === 'branch' ||
      normalized === 'branch.agency' ||
      normalized === 'subbrand' ||
      normalized === 'subbrand.agency'
    ) {
      return 'subbrand.agency';
    }
    return 'brand.agency';
  }

  if (target === 'agent') {
    return 'individual.agent';
  }

  if (normalized === 'individual.agent') {
    return 'individual.agent';
  }

  return 'individual.worker';
}

export function isAgencyLikeAccountType(accountType?: string | null): boolean {
  const normalized = accountType?.trim().toLowerCase();
  return (
    normalized === 'brand' ||
    normalized === 'brand.agency' ||
    normalized === 'subbrand' ||
    normalized === 'subbrand.agency'
  );
}
