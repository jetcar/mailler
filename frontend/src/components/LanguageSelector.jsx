import React from 'react';
import { useTranslation } from 'react-i18next';
import { changeLocale } from '../i18n/index.js';
import { fallbackLocale, getSupportedLocale, supportedLocales } from '../i18n/locale.js';

export default function LanguageSelector() {
  const { i18n, t } = useTranslation();
  const locale = getSupportedLocale(i18n.resolvedLanguage || i18n.language) || fallbackLocale;

  return (
    <label className="language-selector">
      <span>{t('language.label')}</span>
      <select
        aria-label={t('language.label')}
        value={locale}
        onChange={(event) => void changeLocale(event.target.value)}
      >
        {supportedLocales.map((option) => (
          <option key={option} value={option}>
            {t(`language.names.${option}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
