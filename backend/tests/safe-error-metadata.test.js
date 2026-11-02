const { safeErrorMetadata } = require('../src/utils/safeErrorMetadata');

test('does not expose error messages, stacks, or response bodies', () => {
  const secret = 'sensitive-oidc-state';
  const error = new Error(`state mismatch, expected ${secret}`);
  error.response = {
    status: 400,
    data: { state: secret }
  };

  const metadata = safeErrorMetadata(error, { path: '/auth/callback', method: 'GET' });
  expect(metadata).toEqual({
    errorType: 'Error',
    status: 400,
    path: '/auth/callback',
    method: 'GET'
  });
  expect(JSON.stringify(metadata)).not.toContain(secret);
});
