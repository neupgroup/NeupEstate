type AccountPayload = {
  aid?: string;
  sid?: string;
  skey?: string;
  guest?: number;
  nid?: string;
};

type GetAccountResult =
  | { success: false; reason: "keyNotFound" | "invalidSignature" | "cookieNotFound" }
  | { success: true; aid?: string; sid?: string; skey?: string; guest?: number; nid?: string };

const ACCOUNT_COOKIE_NAME = "auth_account";
const AUTH_PUBLIC_KEY_ENV_NAME = "AUTH_PUBLIC_KEY";

// Converts a base64url-encoded JWT segment into raw bytes.
function b64urlToBytes(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  const padded = pad ? base64 + "=".repeat(4 - pad) : base64;
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

// Decodes a base64url-encoded JWT segment into a UTF-8 string.
function b64urlDecode(str: string): string {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  return atob(pad ? base64 + "=".repeat(4 - pad) : base64);
}

// Extracts and parses the JWT payload without verifying the signature.
function decodePayload(token: string): AccountPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    return JSON.parse(b64urlDecode(parts[1])) as AccountPayload;
  } catch {
    return null;
  }
}

// Reads a cookie value from document.cookie on the client.
function getCookieClient(name: string): string | null {
  if (typeof document === "undefined") return null;
  const nameEq = `${name}=`;
  for (let cookie of document.cookie.split(";")) {
    cookie = cookie.trim();
    if (cookie.startsWith(nameEq)) {
      return decodeURIComponent(cookie.slice(nameEq.length));
    }
  }
  return null;
}

// Imports the RSA public key from the env var configured in this file.
async function importPublicKey(): Promise<CryptoKey | null> {
  const pem = process.env[AUTH_PUBLIC_KEY_ENV_NAME];
  if (!pem) return null;

  try {
    const pemBody = pem
      .replace(/-----BEGIN PUBLIC KEY-----/g, "")
      .replace(/-----END PUBLIC KEY-----/g, "")
      .replace(/\\n/g, "")
      .replace(/\n/g, "")
      .replace(/\r/g, "")
      .trim();

    const derBuffer = Uint8Array.from(atob(pemBody), (char) => char.charCodeAt(0));

    return await crypto.subtle.importKey(
      "spki",
      derBuffer,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );
  } catch {
    return null;
  }
}

// Verifies JWT signature with RS256 and returns a structured auth result.
async function verifyAndDecode(token: string): Promise<GetAccountResult> {
  const parts = token.split(".");
  if (parts.length !== 3) return { success: false, reason: "invalidSignature" };

  const payload = decodePayload(token);
  if (!payload) return { success: false, reason: "invalidSignature" };

  const publicKey = await importPublicKey();
  if (!publicKey) return { success: false, reason: "keyNotFound" };

  try {
    const signingInput = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const signature = b64urlToBytes(parts[2]);
    const valid = await crypto.subtle.verify(
      { name: "RSASSA-PKCS1-v1_5" },
      publicKey,
      signature,
      signingInput
    );

    if (!valid) {
      return { success: false, reason: "invalidSignature" };
    }

    return {
      success: true,
      aid: payload.aid,
      sid: payload.sid,
      skey: payload.skey,
      guest: payload.guest,
      nid: payload.nid,
    };
  } catch {
    return { success: false, reason: "invalidSignature" };
  }
}

// Reads auth_account cookie, verifies it, and returns the account payload.
export async function getAccount(): Promise<GetAccountResult> {
  const token = getCookieClient(ACCOUNT_COOKIE_NAME);
  if (!token) return { success: false, reason: "cookieNotFound" };
  return verifyAndDecode(token);
}
