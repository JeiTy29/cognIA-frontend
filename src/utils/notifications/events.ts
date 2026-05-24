const NOTIFICATIONS_REFRESH_EVENT = 'cognia:notifications-refresh';

export function emitNotificationsRefresh() {
    if (typeof globalThis.dispatchEvent !== 'function') return;
    globalThis.dispatchEvent(new Event(NOTIFICATIONS_REFRESH_EVENT));
}

export function onNotificationsRefresh(listener: () => void) {
    const handler = () => listener();
    globalThis.addEventListener(NOTIFICATIONS_REFRESH_EVENT, handler);
    return () => globalThis.removeEventListener(NOTIFICATIONS_REFRESH_EVENT, handler);
}
