type BackendBaseConfig =
    | {
        raw: string;
        normalized: string;
        kind: 'absolute';
        url: URL;
        pathname: string;
    }
    | {
        raw: string;
        normalized: string;
        kind: 'relative';
        pathname: string;
    };

interface ApiClientConfigAssertion {
    ok: boolean;
    message: string | null;
    baseUrl: string | null;
    relative: boolean;
}

const API_SUFFIX = '/api';
const DEBUG_FLAG = import.meta.env.VITE_DEBUG_API_CLIENT;

let configErrorLogged = false;

function getRawBackendBaseUrl() {
    const directValue = import.meta.env.VITE_API_BASE_URL;
    const alternativeValue = import.meta.env.VITE_COGNIA_API_BASE_URL;
    const value = typeof directValue === 'string' && directValue.trim().length > 0
        ? directValue
        : alternativeValue;

    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new Error('VITE_API_BASE_URL no esta configurado.');
    }

    return value.trim();
}

function normalizeTrailingSlash(value: string) {
    if (value === '/') return value;
    return value.replace(/\/+$/u, '');
}

function normalizeRelativeBase(value: string) {
    if (!value.startsWith('/')) {
        throw new Error(`VITE_API_BASE_URL no es una ruta relativa valida: ${value}`);
    }

    const normalized = normalizeTrailingSlash(value) || '/';
    return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

function isAbsoluteBaseUrl(value: string) {
    return /^[a-z][a-z\d+\-.]*:\/\//iu.test(value);
}

function parseBackendBaseConfig(): BackendBaseConfig {
    const raw = getRawBackendBaseUrl();

    if (raw.startsWith('/')) {
        const normalized = normalizeRelativeBase(raw);
        return {
            raw,
            normalized,
            kind: 'relative',
            pathname: normalized
        };
    }

    if (!isAbsoluteBaseUrl(raw)) {
        throw new Error(`VITE_API_BASE_URL no es una URL valida: ${raw}`);
    }

    let parsed: URL;
    try {
        parsed = new URL(normalizeTrailingSlash(raw));
    } catch {
        throw new Error(`VITE_API_BASE_URL no es una URL valida: ${raw}`);
    }

    return {
        raw,
        normalized: normalizeTrailingSlash(parsed.toString()),
        kind: 'absolute',
        url: parsed,
        pathname: parsed.pathname || '/'
    };
}

function stripApiSuffix(pathname: string) {
    if (pathname === API_SUFFIX) return '/';
    if (pathname.endsWith(API_SUFFIX)) {
        const stripped = pathname.slice(0, -API_SUFFIX.length);
        return stripped.length > 0 ? stripped : '/';
    }
    return pathname || '/';
}

function ensureApiSuffix(pathname: string) {
    if (pathname === API_SUFFIX || pathname.endsWith(API_SUFFIX)) return pathname;
    if (pathname === '/') return API_SUFFIX;
    return `${pathname}${API_SUFFIX}`;
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
    if (path === API_SUFFIX) return '/';
    if (path.startsWith(`${API_SUFFIX}/`)) {
        const stripped = path.slice(API_SUFFIX.length);
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

function toUrlString(
    baseConfig: BackendBaseConfig,
    pathname: string,
    search = '',
    hash = ''
) {
    if (baseConfig.kind === 'relative') {
        return `${pathname}${search}${hash}`;
    }

    const url = new URL(baseConfig.url.toString());
    url.pathname = pathname;
    url.search = search;
    url.hash = hash;
    return url.toString();
}

function safeLogConfigError(message: string) {
    if (configErrorLogged) return;
    configErrorLogged = true;
    console.error(`[CognIA API] ${message}`);
}

export function getConfiguredBackendBaseUrl() {
    return parseBackendBaseConfig().normalized;
}

export function assertApiClientConfig(): ApiClientConfigAssertion {
    try {
        const config = parseBackendBaseConfig();
        return {
            ok: true,
            message: null,
            baseUrl: config.normalized,
            relative: config.kind === 'relative'
        };
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Configuracion invalida del cliente API.';
        safeLogConfigError(message);
        return {
            ok: false,
            message,
            baseUrl: null,
            relative: false
        };
    }
}

export function isApiClientDebugEnabled() {
    return typeof DEBUG_FLAG === 'string' && DEBUG_FLAG.trim().toLowerCase() === 'true';
}

export function debugApiClient(message: string) {
    if (!isApiClientDebugEnabled()) return;
    console.info(`[CognIA API] ${message}`);
}

export function joinApiUrl(path: string) {
    const base = parseBackendBaseConfig();
    const apiBasePath = ensureApiSuffix(stripApiSuffix(base.pathname));
    const relative = parseRelativePath(path);
    const relativePath = stripApiPrefix(relative.pathname);
    const pathname = joinPath(apiBasePath, relativePath);
    return toUrlString(base, pathname, relative.search, relative.hash);
}

export function joinBackendRootUrl(path: string) {
    const base = parseBackendBaseConfig();
    const rootBasePath = stripApiSuffix(base.pathname);
    const relative = parseRelativePath(path);
    const pathname = joinPath(rootBasePath, relative.pathname);
    return toUrlString(base, pathname, relative.search, relative.hash);
}
