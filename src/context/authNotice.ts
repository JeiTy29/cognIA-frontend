import { AUTH_NOTICE_KEY } from '../utils/auth/sessionLifecycle';

export function consumeAuthNotice() {
    const notice = sessionStorage.getItem(AUTH_NOTICE_KEY);
    if (notice) {
        sessionStorage.removeItem(AUTH_NOTICE_KEY);
    }
    return notice;
}
