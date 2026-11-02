import assert from 'node:assert/strict';
import test from 'node:test';
import { createInstance } from 'i18next';
import { createI18nOptions } from './config.js';

test('i18next loads the selected supported locale', async () => {
  const instance = createInstance();
  await instance.init(createI18nOptions('de-DE'));

  assert.equal(instance.resolvedLanguage, 'de');
  assert.equal(instance.t('login.action'), 'Mit OpenID Connect anmelden');
});

test('i18next falls back to English for an unsupported locale', async () => {
  const instance = createInstance();
  await instance.init(createI18nOptions('pt-BR'));

  assert.equal(instance.resolvedLanguage, 'en');
  assert.equal(instance.t('login.action'), 'Login with OpenID Connect');
});

test('i18next falls back to English when a locale entry is missing', async () => {
  const instance = createInstance();
  const options = createI18nOptions('et');
  options.resources = {
    ...options.resources,
    et: { translation: { login: {} } }
  };
  await instance.init(options);

  assert.equal(instance.t('login.action'), 'Login with OpenID Connect');
});
