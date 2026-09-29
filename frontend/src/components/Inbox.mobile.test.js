import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const inbox = readFileSync(new URL('./Inbox.jsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../App.css', import.meta.url), 'utf8');

test('inbox switches to a stacked layout on phone-sized screens', () => {
  assert.match(inbox, /className="inbox-header"/);
  assert.match(inbox, /className="inbox-main"/);
  assert.match(inbox, /className="inbox-sidebar"/);
  assert.match(inbox, /className="inbox-content"/);

  assert.match(css, /@media\s*\(max-width:\s*640px\)/);
  assert.match(css, /\.inbox-main\s*\{[^}]*flex-direction:\s*column/s);
  assert.match(css, /\.inbox-sidebar\s*\{[^}]*width:\s*100%/s);
  assert.match(css, /\.inbox-content\s*\{[^}]*min-width:\s*0/s);
});

test('inbox header actions wrap instead of overflowing the viewport', () => {
  assert.match(inbox, /className="inbox-header-actions"/);
  assert.match(css, /\.inbox-header\s*\{[^}]*flex-wrap:\s*wrap/s);
  assert.match(css, /\.inbox-header-actions\s*\{[^}]*flex-wrap:\s*wrap/s);
});
