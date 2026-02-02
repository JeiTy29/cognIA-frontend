export const AUTH_REFRESH_EVENT = 'cognia:auth-refresh';

type RefreshDetail = {
    accessToken: string;
    expiresIn: number;
};

export function emitAuthRefresh(detail: RefreshDetail) {
    window.dispatchEvent(new CustomEvent<RefreshDetail>(AUTH_REFRESH_EVENT, { detail }));
}

export function onAuthRefresh(handler: (detail: RefreshDetail) => void) {
    const listener = (event: Event) => {
        const custom = event as CustomEvent<RefreshDetail>;
        if (custom.detail) {
            handler(custom.detail);
        }
    };
    window.addEventListener(AUTH_REFRESH_EVENT, listener);
    return () => window.removeEventListener(AUTH_REFRESH_EVENT, listener);
}
