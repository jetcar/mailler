const { sanitizeEmailHtml, sendSanitizedEmail } = require('../src/utils/sanitizeEmailHtml');

describe('sanitizeEmailHtml', () => {
  test('removes executable markup and unsafe URLs', () => {
    const result = sanitizeEmailHtml(
      '<script>alert(1)</script><a href="javascript:alert(2)">link</a>'
    );

    expect(result).not.toContain('<script');
    expect(result).not.toContain('javascript:');
  });

  test('preserves filtered styles and CID images used by HTML email', () => {
    const result = sanitizeEmailHtml(
      '<div style="color: red; position: fixed"><img src="cid:logo@example" alt="Logo"></div>'
    );

    expect(result).toContain('style="color: red; position: fixed"');
    expect(result).toContain('src="cid:logo@example"');
  });

  test('preserves the structure of a full HTML email document', () => {
    const result = sanitizeEmailHtml(`<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
      <html xmlns="http://www.w3.org/1999/xhtml" lang="en">
        <head>
          <meta charset="utf-8">
          <title>Example</title>
          <style>.hero { color: blue; }</style>
        </head>
        <body class="email" bgcolor="#ffffff">
          <table cellpadding="8" cellspacing="0" bgcolor="#ffffff">
            <tr><td class="hero" style="font-weight: bold">Hello</td></tr>
          </table>
          <script>alert(1)</script>
        </body>
      </html>`);

    expect(result).toContain('<!DOCTYPE html>');
    expect(result).toContain('<html');
    expect(result).toContain('lang="en"');
    expect(result).toContain('<style>.hero { color: blue; }</style>');
    expect(result).toContain('<body class="email" bgcolor="#ffffff">');
    expect(result).toContain('cellpadding="8"');
    expect(result).toContain('class="hero"');
    expect(result).not.toContain('<script');
  });

  test('sends only sanitized HTML with external content access disabled', async () => {
    const transporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message' })
    };

    const result = await sendSanitizedEmail(transporter, {
      to: 'recipient@example.com',
      html: '<p onclick="alert(1)">Hello</p><script>alert(2)</script>'
    });

    expect(result.info.messageId).toBe('test-message');
    expect(result.safeHtml).not.toContain('onclick');
    expect(result.safeHtml).not.toContain('<script');
    expect(transporter.sendMail).toHaveBeenCalledWith(expect.objectContaining({
      html: result.safeHtml,
      disableFileAccess: true,
      disableUrlAccess: true
    }));
  });
});
