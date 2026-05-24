const NOTIFICATIONS_REFRESH_EVENT = 'cognia:notifications-refresh';

export type NotificationsRefreshDetail = {
    removeGrantIds?: string[];
};

export function emitNotificationsRefresh(detail?: NotificationsRefreshDetail) {
    if (typeof globalThis.dispatchEvent !== 'function') return;
    globalThis.dispatchEvent(new CustomEvent<NotificationsRefreshDetail>(NOTIFICATIONS_REFRESH_EVENT, { detail }));
}

export function onNotificationsRefresh(listener: (detail?: NotificationsRefreshDetail) => void) {
    const handler = (event: Event) => {
        const customEvent = event as CustomEvent<NotificationsRefreshDetail>;
        listener(customEvent.detail);
    };
    globalThis.addEventListener(NOTIFICATIONS_REFRESH_EVENT, handler);
    return () => globalThis.removeEventListener(NOTIFICATIONS_REFRESH_EVENT, handler);
}
