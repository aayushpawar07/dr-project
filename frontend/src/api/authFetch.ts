import { notifyAuthExpired } from '../utils/jwtUtils';

/**
 * A wrapper around window.fetch that detects 401 responses and notifies the AuthContext.
 */
export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status === 401) {
    notifyAuthExpired();
  }
  return res;
}
