import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getConfiguredBackendBaseUrl } from './url';

describe('api/url', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllEnvs();
    });

    it('usa el backend por defecto cuando VITE_API_BASE_URL no esta configurado', () => {
        vi.stubEnv('VITE_API_BASE_URL', '');
        vi.stubEnv('VITE_COGNIA_API_BASE_URL', '');

        expect(getConfiguredBackendBaseUrl()).toBe('https://cognia-api.onrender.com');
    });

    it('respeta VITE_API_BASE_URL cuando esta configurado', () => {
        vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');

        expect(getConfiguredBackendBaseUrl()).toBe('https://api.example.com');
    });
});
