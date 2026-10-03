/**
 * Resolves notification PDF URLs so they reliably open in the browser.
 * Handles local backend paths, VPS Nginx paths, external government portals, and prevents broken '#' links.
 */
export function resolveNotificationPdfUrl(url?: string | null): string {
  if (!url) return '';
  const clean = String(url).trim();
  if (
    !clean ||
    clean === '#' ||
    clean.toLowerCase() === 'null' ||
    clean.toLowerCase() === 'undefined'
  ) {
    return '';
  }

  // Normalize any internal uploads path to the unified /api/uploads/ endpoint
  if (clean.includes('/uploads/')) {
    const afterUploads = clean.substring(clean.indexOf('/uploads/') + '/uploads/'.length);
    return `/api/uploads/${afterUploads}`;
  }

  if (clean.includes('/api/uploads/')) {
    const afterApi = clean.substring(clean.indexOf('/api/uploads/'));
    return afterApi;
  }

  // For external links (e.g. .gov.in, .nic.in, university sites)
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }

  // If starting with slash
  if (clean.startsWith('/')) {
    return clean;
  }

  return clean;
}

/**
 * Ensures any external URL (Official Website, Apply Portal, etc.) has a valid absolute protocol (https://)
 * and strips accidental surrounding punctuation, brackets, quotes, or trailing dots/colons from PDF text extraction.
 */
export function ensureAbsoluteUrl(url?: string | null): string {
  if (!url) return '';
  let clean = String(url).trim();
  if (
    !clean ||
    clean === '#' ||
    clean.toLowerCase() === 'null' ||
    clean.toLowerCase() === 'undefined' ||
    clean.toLowerCase() === 'javascript:void(0)'
  ) {
    return '';
  }

  // Remove leading/trailing quotes, parentheses, brackets, commas, semicolons, and dots
  clean = clean.replace(/^["'(\[<]+|["')\]>.,;:]+$/g, '').trim();
  clean = clean.replace(/\s+/g, '');

  if (!clean) return '';

  // Internal absolute path
  if (clean.startsWith('/')) {
    return clean;
  }

  // Already http:// or https://
  if (/^https?:\/\//i.test(clean)) {
    return clean;
  }

  // Protocol-relative //example.com
  if (clean.startsWith('//')) {
    return `https:${clean}`;
  }

  // Valid domain format: add https://
  return `https://${clean}`;
}

/**
 * Safely opens an external link in a new browser tab without being blocked by mobile popup blockers.
 */
export function safeOpenExternal(url?: string | null, e?: any): void {
  if (e && typeof e.stopPropagation === 'function') {
    e.stopPropagation();
  }
  const target = ensureAbsoluteUrl(url);
  if (!target) return;

  if (typeof window !== 'undefined') {
    const newWin = window.open(target, '_blank', 'noopener,noreferrer');
    if (!newWin || newWin.closed || typeof newWin.closed === 'undefined') {
      // Fallback if window.open was blocked: create temporary hidden link
      const a = document.createElement('a');
      a.href = target;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }
}
