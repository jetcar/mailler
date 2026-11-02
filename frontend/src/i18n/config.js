import { resources } from './catalogs.js';
import { fallbackLocale } from './locale.js';

export function createI18nOptions(locale) {
  return {
    resources,
    lng: locale,
    fallbackLng: fallbackLocale,
    supportedLngs: Object.keys(resources),
    load: 'languageOnly',
    initImmediate: false,
    interpolation: { escapeValue: false },
    returnNull: false
  };
}
