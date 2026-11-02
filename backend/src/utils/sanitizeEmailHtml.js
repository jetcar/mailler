const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

function sanitizeEmailHtml(html) {
  const hasHtmlDoctype = /<!doctype\s+html(?:\s+[^>]*)?>/i.test(html);
  const withoutDoctype = html.replace(/<!doctype[^>]*>/gi, '');
  const sanitized = DOMPurify.sanitize(withoutDoctype, {
    WHOLE_DOCUMENT: true,
    USE_PROFILES: { html: true },
    ADD_TAGS: ['title', 'meta', 'style'],
    ADD_ATTR: [
      'xmlns',
      'bgcolor',
      'text',
      'link',
      'vlink',
      'alink',
      'cellpadding',
      'cellspacing',
      'border',
      'align',
      'valign'
    ]
  });

  return hasHtmlDoctype ? `<!DOCTYPE html>\n${sanitized}` : sanitized;
}

module.exports = { sanitizeEmailHtml };
