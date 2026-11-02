import assert from 'node:assert/strict';
import test from 'node:test';
import { catalogs } from './catalogs.js';
import { supportedLocales } from './locale.js';

function flattenKeys(value, prefix = '') {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return child && typeof child === 'object' ? flattenKeys(child, path) : [path];
  });
}

test('all supported locales have the same non-empty keys as English', () => {
  assert.deepEqual(Object.keys(catalogs), supportedLocales);
  const englishKeys = flattenKeys(catalogs.en).sort();

  for (const locale of supportedLocales) {
    assert.deepEqual(flattenKeys(catalogs[locale]).sort(), englishKeys, `${locale} catalog keys`);
    for (const key of englishKeys) {
      const value = key.split('.').reduce((catalog, part) => catalog[part], catalogs[locale]);
      assert.equal(typeof value, 'string', `${locale}:${key} must be a string`);
      assert.notEqual(value.trim(), '', `${locale}:${key} must not be empty`);
    }
  }
});
