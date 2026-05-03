export type JwtPayload = {
    sub?: string;
    exp?: number;
    roles?: string[];
    [key: string]: unknown;
};

function normalizeBase64(input: string) {
    const base64 = input.replaceAll('-', '+').replaceAll('_', '/');
    const pad = base64.length % 4;
    if (pad === 0) return base64;
    return base64 + '='.repeat(4 - pad);
}

export function decodeJwtPayload<T extends JwtPayload = JwtPayload>(token: string): T | null {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;
        const payload = normalizeBase64(parts[1]);
        const json = atob(payload);
        return JSON.parse(json) as T;
    } catch {
        return null;
    }
}

export function isJwtExpired(exp?: number) {
    if (!exp) return false;
    return Date.now() >= exp * 1000;
}
