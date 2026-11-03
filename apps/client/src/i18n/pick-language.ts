/**
 * Chooses the interface language (Q9): the player's saved choice, else the first browser
 * language we have (exact match, then base language: "fr-CA" → "fr"), else English.
 */
export function pickLanguage(
  available: readonly string[],
  saved: string | null,
  browser: readonly string[],
  fallback = 'en',
): string {
  if (saved && available.includes(saved)) return saved;
  for (const tag of browser) {
    const lower = tag.toLowerCase();
    const exact = available.find((code) => code.toLowerCase() === lower);
    if (exact) return exact;
    const base = available.find((code) => code.toLowerCase() === lower.split('-')[0]);
    if (base) return base;
  }
  return available.includes(fallback) ? fallback : (available[0] ?? fallback);
}
