import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { createI18nOptions } from './config.js';
import { detectLocale, fallbackLocale, getSupportedLocale, persistLocale } from './locale.js';

function setDocumentLanguage(locale) {
  if (globalThis.document?.documentElement) {
    globalThis.document.documentElement.lang = locale;
  }
}

const initialLocale = detectLocale();

i18n
  .use(initReactI18next)
  .init(createI18nOptions(initialLocale));

setDocumentLanguage(initialLocale);

export async function changeLocale(value) {
  const locale = persistLocale(getSupportedLocale(value) || fallbackLocale);
  setDocumentLanguage(locale);
  await i18n.changeLanguage(locale);
  return locale;
}

export default i18n;
