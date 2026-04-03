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

const appBasePath = normalizeBasePath(process.env.APP_BASE_PATH);

function buildAppPath(pathname = '/') {
    const normalizedPathname = pathname.startsWith('/') ? pathname : `/${pathname}`;
    return `${appBasePath}${normalizedPathname}` || normalizedPathname;
}

function buildFrontendUrl(pathname = '/') {
    const frontendOrigin = stripTrailingSlash(process.env.FRONTEND_URL || 'https://host.docker.internal');
    return `${frontendOrigin}${buildAppPath(pathname)}`;
}

module.exports = {
    appBasePath,
    buildAppPath,
    buildFrontendUrl,
};