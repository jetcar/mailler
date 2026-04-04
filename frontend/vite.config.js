import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function normalizeBasePath(value, fallback = '/mailler') {
  const rawValue = value ?? fallback;

  if (!rawValue || rawValue === '/') {
    return '';
  }

  const normalizedValue = rawValue.startsWith('/') ? rawValue : `/${rawValue}`;
  return normalizedValue.replace(/\/+$/, '');
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const appBasePath = normalizeBasePath(env.VITE_APP_BASE_PATH);
  const assetBase = env.VITE_ASSET_BASE || (appBasePath ? `${appBasePath}/` : '/');

  return {
    base: assetBase,
    plugins: [react()],
    server: {
      port: 5173,
      host: '0.0.0.0',
      allowedHosts: true
    }
  };
})
