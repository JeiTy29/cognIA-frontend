const AUTH_NOTICE_KEY = 'cognia_auth_notice';

export function consumeAuthNotice() {
    const notice = sessionStorage.getItem(AUTH_NOTICE_KEY);
    if (notice) {
        sessionStorage.removeItem(AUTH_NOTICE_KEY);
    }
    return notice;
}
