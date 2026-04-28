function getRawBackendBaseUrl() {
    const value = import.meta.env.VITE_API_BASE_URL;
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new Error('VITE_API_BASE_URL no esta configurado.');
    }
    return value.trim();
}

function normalizeTrailingSlash(value: string) {
    return value.replace(/\/+$/, '');
}

function getConfiguredUrl() {
    const normalized = normalizeTrailingSlash(getRawBackendBaseUrl());
    try {
        return new URL(normalized);
    } catch {
        throw new Error(`VITE_API_BASE_URL no es una URL valida: ${normalized}`);
    }
}

function stripApiSuffix(pathname: string) {
    if (pathname === '/api') return '/';
    if (pathname.endsWith('/api')) {
        const stripped = pathname.slice(0, -4);
        return stripped.length > 0 ? stripped : '/';
    }
    return pathname || '/';
}

function ensureApiSuffix(pathname: string) {
    if (pathname === '/api' || pathname.endsWith('/api')) return pathname;
    if (pathname === '/') return '/api';
    return `${pathname}/api`;
}

function normalizePath(path: string) {
    if (!path || path.trim().length === 0) return '/';
    return path.startsWith('/') ? path : `/${path}`;
}

function parseRelativePath(path: string) {
    const normalizedPath = normalizePath(path);
    const parsed = new URL(normalizedPath, 'https://cognia.local');
    return {
        pathname: parsed.pathname,
        search: parsed.search,
        hash: parsed.hash
    };
}

function stripApiPrefix(path: string) {
    if (path === '/api') return '/';
    if (path.startsWith('/api/')) {
        const stripped = path.slice(4);
        return stripped.length > 0 ? stripped : '/';
    }
    return path;
}

function joinPath(basePathname: string, path: string) {
    const normalizedBase = basePathname.endsWith('/') ? basePathname.slice(0, -1) : basePathname;
    const normalizedPath = normalizePath(path);

    if (normalizedBase.length === 0 || normalizedBase === '/') {
        return normalizedPath;
    }

    if (normalizedPath === '/') {
        return normalizedBase;
    }

    return `${normalizedBase}${normalizedPath}`;
}

function toUrlString(base: URL, pathname: string, search = '', hash = '') {
    const url = new URL(base.toString());
    url.pathname = pathname;
    url.search = search;
    url.hash = hash;
    return url.toString();
}

export function getConfiguredBackendBaseUrl() {
    return normalizeTrailingSlash(getConfiguredUrl().toString());
}

export function joinApiUrl(path: string) {
    const base = getConfiguredUrl();
    const apiBasePath = ensureApiSuffix(stripApiSuffix(base.pathname));
    const relative = parseRelativePath(path);
    const relativePath = stripApiPrefix(relative.pathname);
    const pathname = joinPath(apiBasePath, relativePath);
    return toUrlString(base, pathname, relative.search, relative.hash);
}

export function joinBackendRootUrl(path: string) {
    const base = getConfiguredUrl();
    const rootBasePath = stripApiSuffix(base.pathname);
    const relative = parseRelativePath(path);
    const pathname = joinPath(rootBasePath, relative.pathname);
    return toUrlString(base, pathname, relative.search, relative.hash);
}
