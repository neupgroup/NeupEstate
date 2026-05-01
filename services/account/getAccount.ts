export type AuthAccount = {
  aid: string;
  sid: string;
  skey: string;
  def: number;
  nid?: string;
};

export type ActiveAccount = {
  aid: string;
  sid: string;
  skey: string;
};

/**
 * Parses the `auth_accounts` cookie string and returns the active account
 * (the one with def === 1 that has aid, sid, and skey).
 */
export function getActiveAccount(cookieValue: string | null | undefined): ActiveAccount | null {
  if (!cookieValue) return null;
  try {
    const accounts: AuthAccount[] = JSON.parse(cookieValue);
    const active = accounts.find((a) => a?.def === 1 && a?.aid && a?.sid && a?.skey);
    if (!active) return null;
    return { aid: active.aid, sid: active.sid, skey: active.skey };
  } catch {
    return null;
  }
}
