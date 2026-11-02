export const supportedLocales = ['en', 'et', 'ru', 'de', 'fr', 'es'];
export const fallbackLocale = 'en';
export const localeStorageKey = 'passi.locale';

export function getSupportedLocale(value) {
  if (typeof value !== 'string') return null;

  const locale = value.trim().toLowerCase().split(/[-_]/)[0];
  return supportedLocales.includes(locale) ? locale : null;
}

export function detectLocale({ storage = globalThis.localStorage, navigator = globalThis.navigator } = {}) {
  try {
    const storedLocale = getSupportedLocale(storage?.getItem(localeStorageKey));
    if (storedLocale) return storedLocale;
  } catch {
    // Storage can be unavailable in private or restricted browser contexts.
  }

  const browserLocales = navigator?.languages?.length
    ? navigator.languages
    : [navigator?.language];

  for (const browserLocale of browserLocales) {
    const locale = getSupportedLocale(browserLocale);
    if (locale) return locale;
  }

  return fallbackLocale;
}

export function persistLocale(value, storage = globalThis.localStorage) {
  const locale = getSupportedLocale(value) || fallbackLocale;

  try {
    storage?.setItem(localeStorageKey, locale);
  } catch {
    // Keep the selected language for this session even when storage is unavailable.
  }

  return locale;
}
