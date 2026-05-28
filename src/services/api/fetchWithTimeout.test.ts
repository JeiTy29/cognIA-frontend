import { afterEach, describe, expect, it, vi } from 'vitest';
import { RequestTimeoutError, fetchWithTimeout } from './fetchWithTimeout';

describe('fetchWithTimeout', () => {
    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('aborta solicitudes que no responden para evitar loading infinito', async () => {
        vi.useFakeTimers();
        vi.stubGlobal('fetch', vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
            new Promise((_resolve, reject) => {
                init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
            })
        ));

        const expectation = expect(fetchWithTimeout('/api/test', {}, 100)).rejects.toBeInstanceOf(RequestTimeoutError);
        await vi.advanceTimersByTimeAsync(120);

        await expectation;
    });
});
