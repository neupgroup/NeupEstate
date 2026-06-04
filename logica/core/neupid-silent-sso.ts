/**
 * neupid-silent-sso.ts
 *
 * Client-side Silent SSO integration for NeupID.
 * Embeds a hidden iframe that checks for an active NeupID session and returns
 * a signed JWT + authorization code via postMessage.
 */

const NEUPID_ORIGIN = 'https://neupgroup.com';
const NEUPID_BASE = 'https://neupgroup.com/account';
const TIMEOUT_MS = 10_000; // 10 seconds

export type SilentSSOResult =
  | { authenticated: true; token: string; code: string }
  | { authenticated: false; reason: string };

export interface SilentSSOOptions {
  appId: string;
  onResult: (result: SilentSSOResult) => void;
  codeChallenge?: string; // Optional PKCE challenge
}

/**
 * Initiates Silent SSO by embedding a hidden iframe and listening for the
 * postMessage response from NeupID.
 */
export function initSilentSSO({ appId, onResult, codeChallenge }: SilentSSOOptions): void {
  let timeout: NodeJS.Timeout;
  let iframe: HTMLIFrameElement | null = null;

  function cleanup() {
    clearTimeout(timeout);
    window.removeEventListener('message', onMessage);
    if (iframe) {
      iframe.remove();
      iframe = null;
    }
  }

  function onMessage(event: MessageEvent) {
    // Always validate the sender origin
    if (event.origin !== NEUPID_ORIGIN) return;

    const payload = event.data;
    // Only handle NeupID silent auth messages
    if (!payload || payload.type !== 'neupid:silent_auth') return;

    cleanup();
    onResult(payload);
  }

  // Set timeout in case iframe never responds
  timeout = setTimeout(() => {
    cleanup();
    onResult({ authenticated: false, reason: 'timeout' });
  }, TIMEOUT_MS);

  window.addEventListener('message', onMessage);

  // Create and append the iframe
  iframe = document.createElement('iframe');
  iframe.id = 'neupid-sso-frame';
  let src = `${NEUPID_BASE}/bridge/silent.v1/auth/whoisthis?appId=${appId}`;
  if (codeChallenge) {
    src += `&codeChallenge=${codeChallenge}&codeChallengeMethod=S256`;
  }
  iframe.src = src;
  iframe.style.cssText = 'display:none;width:0;height:0;border:0;position:absolute';
  document.body.appendChild(iframe);
}

/**
 * Redirects to the NeupID handshake flow for full authentication.
 */
export function redirectToNeupIDLogin(appId: string, returnUrl: string = window.location.href): void {
  window.location.href =
    `${NEUPID_BASE}/bridge/handshake.v1/auth/grant` +
    `?appId=${appId}&authenticatesTo=${encodeURIComponent(returnUrl)}`;
}

/**
 * Generates a PKCE verifier and challenge for secure authorization code exchange.
 */
export async function generatePKCE(): Promise<{ verifier: string; challenge: string }> {
  // Generate a random verifier
  const array = new Uint8Array(48);
  crypto.getRandomValues(array);
  const verifier = btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  // Hash it to get the challenge
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  const challenge = btoa(String.fromCharCode(...hashArray))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return { verifier, challenge };
}

/**
 * Parses the NeupID JWT (without verifying the signature — verification happens server-side).
 * Returns the decoded payload.
 */
export function parseNeupIDToken(token: string): {
  ssid: string;
  sid: string | null;
  originated_on: string;
  refreshes_on: string;
  expires_on: string;
} | null {
  try {
    const [, payloadB64] = token.split('.');
    if (!payloadB64) return null;
    const payload = JSON.parse(
      atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))
    );
    return {
      ssid: payload.ssid,
      sid: payload.sid,
      originated_on: payload.originated_on,
      refreshes_on: payload.refreshes_on,
      expires_on: payload.expires_on,
    };
  } catch {
    return null;
  }
}
