/**
 * Location cleaner utility to prevent organisation name repetition in location fields.
 */

export function cleanLocation(
  rawLocation?: string | null,
  organization?: string | null,
  fallbackCityState?: string | null
): string {
  const loc = (rawLocation || '').trim();
  const org = (organization || '').trim();

  if (!loc) {
    return (fallbackCityState || '').trim();
  }

  if (!org) {
    return loc;
  }

  const cleanOrg = org.toLowerCase();
  let result = loc;

  // 1. If location starts with or contains the exact organisation name, strip it
  const locLower = result.toLowerCase();
  const orgIdx = locLower.indexOf(cleanOrg);
  if (orgIdx !== -1) {
    result = result.slice(0, orgIdx) + ' ' + result.slice(orgIdx + cleanOrg.length);
  } else {
    // Check if substantial parts of org name (e.g. "Pt. Madan Mohan Malaviya Hospital" -> "Pt. Madan Mohan Malaviya") match
    const orgWords = cleanOrg.split(/\s+/).filter((w) => w.length > 2);
    if (orgWords.length >= 2) {
      const acronymOrPhrase = orgWords.slice(0, Math.min(3, orgWords.length)).join(' ');
      const phraseIdx = result.toLowerCase().indexOf(acronymOrPhrase);
      if (phraseIdx !== -1) {
        // Strip everything from phraseIdx up to the next comma or dash if followed by location
        const afterMatch = result.slice(phraseIdx + acronymOrPhrase.length);
        const commaIdx = afterMatch.indexOf(',');
        if (commaIdx !== -1) {
          result = result.slice(0, phraseIdx) + afterMatch.slice(commaIdx + 1);
        }
      }
    }
  }

  // 2. Clean up any leading/trailing commas, dashes, colons, or double spaces
  result = result
    .replace(/^[\s,;:\-|–—]+/, '')
    .replace(/[\s,;:\-|–—]+$/, '')
    .replace(/\s*,\s*,+/g, ',')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // 3. If stripping left empty or something trivial (like just a dash or numbers), fallback to city/state or clean original
  if (!result || result.length < 2) {
    if (fallbackCityState && fallbackCityState.trim()) {
      return fallbackCityState.trim();
    }
    // If the original location was ONLY the organization name, avoid repeating it
    if (locLower === cleanOrg) {
      return fallbackCityState?.trim() || 'India';
    }
    return loc;
  }

  return result;
}
