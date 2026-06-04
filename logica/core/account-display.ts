export const ACCOUNT_FALLBACK_NAME = 'Guest Account';
export const ACCOUNT_FALLBACK_NEUPID = 'guest';

export function getAccountDisplayName(displayName?: string | null): string {
  return displayName?.trim() ? displayName : ACCOUNT_FALLBACK_NAME;
}

export function getAccountHandle(neupId?: string | null): string {
  return neupId?.trim() ? `@${neupId}` : `@${ACCOUNT_FALLBACK_NEUPID}`;
}