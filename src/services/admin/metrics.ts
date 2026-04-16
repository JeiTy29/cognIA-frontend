import { apiGet } from '../api/httpClient';

const requestOptions = {
    auth: true,
    credentials: 'include' as const
};

export function getAdminMetrics() {
    return apiGet<unknown>('/api/admin/metrics', requestOptions);
}
