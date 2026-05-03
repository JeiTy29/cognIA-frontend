export const AUTH_REFRESH_EVENT = 'cognia:auth-refresh';

type RefreshDetail = {
    accessToken: string;
    expiresIn: number;
};

export function emitAuthRefresh(detail: RefreshDetail) {
    globalThis.dispatchEvent(new CustomEvent<RefreshDetail>(AUTH_REFRESH_EVENT, { detail }));
}

export function onAuthRefresh(handler: (detail: RefreshDetail) => void) {
    const listener = (event: Event) => {
        const custom = event as CustomEvent<RefreshDetail>;
        if (custom.detail) {
            handler(custom.detail);
        }
    };
    globalThis.addEventListener(AUTH_REFRESH_EVENT, listener);
    return () => globalThis.removeEventListener(AUTH_REFRESH_EVENT, listener);
}
