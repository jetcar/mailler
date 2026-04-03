const DEFAULT_APP_BASE_PATH = '/mailler';

function normalizeBasePath(value, fallback = DEFAULT_APP_BASE_PATH) {
    const rawValue = value ?? fallback;

    if (!rawValue || rawValue === '/') {
        return '';
    }

    const normalizedValue = rawValue.startsWith('/') ? rawValue : `/${rawValue}`;
    return normalizedValue.replace(/\/+$/, '');
}

function stripTrailingSlash(value) {
    return value.replace(/\/+$/, '');
}

export const appBasePath = normalizeBasePath(import.meta.env.VITE_APP_BASE_PATH);
export const routerBasename = appBasePath || '/';

export function buildAppPath(pathname = '/') {
    const normalizedPathname = pathname.startsWith('/') ? pathname : `/${pathname}`;
    return `${appBasePath}${normalizedPathname}` || normalizedPathname;
}

export function getApiBaseUrl() {
    if (import.meta.env.VITE_API_URL) {
        return `${stripTrailingSlash(import.meta.env.VITE_API_URL)}/`;
    }

    return appBasePath ? `${appBasePath}/` : '/';
}

export function isAppPath(pathname) {
    return pathname === routerBasename || pathname.startsWith(`${appBasePath}/`);
}