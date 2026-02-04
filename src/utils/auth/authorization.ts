export function buildAuthorizationHeader(token?: string | null) {
    if (!token) return null;
    return `Bearer ${token}`;
}
