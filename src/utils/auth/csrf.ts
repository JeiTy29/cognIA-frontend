import { getCookie } from './cookies';

export const csrfCookieName = 'csrf_refresh_token';

export function getCsrfToken() {
    return getCookie(csrfCookieName);
}
