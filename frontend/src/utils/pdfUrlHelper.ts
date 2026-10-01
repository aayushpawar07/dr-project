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
    clean.toLowerCase() === 'undefined' ||
    clean.toLowerCase().includes('faculty-2026.pdf') // filter mock AIIMS test dummy link
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
