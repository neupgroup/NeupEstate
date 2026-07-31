/**
 * auth/index.ts
 *
 * Centralized authentication service exports.
 * Import from here for all authentication needs.
 */

// Main authentication functions (server-side, verified)
export {
  getAuthenticatedAccount,
  getAccountId,
  getSessionTriplet,
  isAuthenticated,
  isIdentified,
  isGuest,
  getAccountInfo,
  requireAuth,
  requireRegisteredAuth,
  // Client-side functions (unverified)
  getClientAccount,
  getClientAccountId,
  isClientAuthenticated,
  isClientIdentified,
  // Types
  type AuthAccountPayload,
  type AuthResult,
  type AccountInfo,
} from './account';

// Cookie reading (if needed separately)
export {
  getAuthCookieClient,
  getAuthCookieServer,
} from './cookie';

export {
  buildAuthCallbackUrl,
  buildHandshakeGrantUrl,
  buildWhoamiUrl,
  buildAccessUrl,
  fetchWhoami,
  fetchAccessInfo,
} from './bridge';

// Logging functions
export {
  logAuthError,
  logAuthWarning,
  logAuthInfo,
  logJWTVerificationError,
  logJWTDecodingError,
  logCookieError,
  readAuthLogs,
  clearAuthLogs,
} from './logger';
