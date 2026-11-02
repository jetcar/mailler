const xss = require('xss');

const commonAttributes = ['class', 'id', 'style', 'dir', 'lang', 'role', 'aria-label'];
const emailAllowList = Object.fromEntries(
  Object.entries(xss.whiteList).map(([tag, attributes]) => [
    tag,
    [...new Set([...attributes, ...commonAttributes])]
  ])
);
Object.assign(emailAllowList, {
  html: ['lang', 'dir'],
  head: [],
  title: [],
  meta: ['charset', 'name', 'content'],
  style: ['type', 'media'],
  body: [...commonAttributes, 'bgcolor', 'text', 'link', 'vlink', 'alink']
});
emailAllowList.table.push('cellpadding', 'cellspacing', 'bgcolor');
emailAllowList.td.push('bgcolor');
emailAllowList.th.push('bgcolor');
emailAllowList.img.push('border', 'align');

const emailHtmlFilter = new xss.FilterXSS({
  whiteList: emailAllowList,
  onIgnoreTag(tag, html) {
    if (tag === '!doctype' && /^<!doctype\s+html(?:\s+[^>]*)?>$/i.test(html)) {
      return '<!DOCTYPE html>';
    }

    return undefined;
  },
  safeAttrValue(tag, name, value, cssFilter) {
    const trimmedValue = value.trim();
    if (tag === 'img' && name === 'src' && /^cid:[a-z0-9._@+-]+$/i.test(trimmedValue)) {
      return xss.escapeAttrValue(trimmedValue);
    }

    return xss.safeAttrValue(tag, name, value, cssFilter);
  }
});

function sanitizeEmailHtml(html) {
  return emailHtmlFilter.process(html);
}

module.exports = { sanitizeEmailHtml };
