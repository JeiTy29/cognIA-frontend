export function getCookie(name: string) {
    if (typeof document === 'undefined') return null;
    const parts = document.cookie.split(';').map((part) => part.trim());
    const prefix = `${name}=`;
    for (const part of parts) {
        if (part.startsWith(prefix)) {
            return decodeURIComponent(part.slice(prefix.length));
        }
    }
    return null;
}
