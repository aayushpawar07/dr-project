/**
 * Checks whether a JWT token is expired or malformed.
 * Returns true if expired or invalid, false if still valid.
 */
export function isJwtExpired(token: string | null | undefined): boolean {
  if (!token || typeof token !== 'string') return true;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;

    // Decode payload (base64url)
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );

    const payload = JSON.parse(jsonPayload);
    if (!payload || typeof payload !== 'object') return true;

    // If there is no exp claim, assume valid
    if (typeof payload.exp !== 'number') return false;

    // Add a 10-second margin for client-server clock skew
    const expiryMs = payload.exp * 1000;
    return Date.now() >= (expiryMs - 10000);
  } catch {
    return true;
  }
}

/**
 * Dispatches an event when authentication expires or returns 401.
 */
export function notifyAuthExpired(message = 'Your session has expired. Please log in again.'): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('auth:expired', { detail: { message } }));
  }
}
