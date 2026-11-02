const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);
const emailSanitizeConfig = {
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
};

function splitHtmlDoctype(html) {
  const trimmed = html.trimStart();
  const prefix = '<!doctype html';
  const candidate = trimmed.slice(0, 1024);
  const lowerCandidate = candidate.toLowerCase();
  const boundary = lowerCandidate[prefix.length];
  const hasPrefix = lowerCandidate.startsWith(prefix)
    && (boundary === '>' || [' ', '\t', '\r', '\n', '\f'].includes(boundary));

  if (!hasPrefix) {
    return { hasHtmlDoctype: false, html };
  }

  const end = candidate.indexOf('>');
  if (end < 0) {
    return { hasHtmlDoctype: false, html };
  }

  return {
    hasHtmlDoctype: true,
    html: trimmed.slice(end + 1)
  };
}

function addNormalizedDoctype(html, hasHtmlDoctype) {
  return hasHtmlDoctype ? `<!DOCTYPE html>\n${html}` : html;
}

function sanitizeEmailHtml(html) {
  const parts = splitHtmlDoctype(html);
  const sanitized = DOMPurify.sanitize(parts.html, emailSanitizeConfig);
  return addNormalizedDoctype(sanitized, parts.hasHtmlDoctype);
}

async function sendSanitizedEmail(transporter, mailOptions) {
  let safeHtml = mailOptions.html;
  if (typeof mailOptions.html === 'string') {
    const parts = splitHtmlDoctype(mailOptions.html);
    const sanitized = DOMPurify.sanitize(parts.html, emailSanitizeConfig);
    safeHtml = addNormalizedDoctype(sanitized, parts.hasHtmlDoctype);
  }
  const info = await transporter.sendMail({
    ...mailOptions,
    html: safeHtml,
    disableFileAccess: true,
    disableUrlAccess: true
  });

  return { info, safeHtml };
}

module.exports = { sanitizeEmailHtml, sendSanitizedEmail };
