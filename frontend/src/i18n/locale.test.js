import assert from 'node:assert/strict';
import test from 'node:test';
import { detectLocale, fallbackLocale, localeStorageKey, persistLocale } from './locale.js';

function storageWith(value) {
  return {
    value,
    getItem(key) { return key === localeStorageKey ? this.value : null; },
    setItem(key, nextValue) { if (key === localeStorageKey) this.value = nextValue; }
  };
}

test('stored locale takes precedence over browser languages', () => {
  assert.equal(detectLocale({ storage: storageWith('fr'), navigator: { languages: ['de-DE'] } }), 'fr');
});

test('browser locale is detected by base language', () => {
  assert.equal(detectLocale({ storage: storageWith(null), navigator: { languages: ['pt-BR', 'et-EE'] } }), 'et');
});

test('unsupported locale falls back to English', () => {
  assert.equal(detectLocale({ storage: storageWith('pt'), navigator: { languages: ['ja-JP'] } }), fallbackLocale);
});

test('selected locale persists under the shared Passi key', () => {
  const storage = storageWith(null);
  assert.equal(persistLocale('de-DE', storage), 'de');
  assert.equal(storage.value, 'de');
  assert.equal(persistLocale('unknown', storage), fallbackLocale);
  assert.equal(storage.value, fallbackLocale);
});

test('storage failures do not prevent locale detection or selection', () => {
  const storage = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); }
  };

  assert.equal(detectLocale({ storage, navigator: { language: 'es-MX' } }), 'es');
  assert.equal(persistLocale('ru', storage), 'ru');
});
