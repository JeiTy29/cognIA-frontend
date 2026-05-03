import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    buildEncryptedEnvelope,
    clearTransportKeyCache,
    decodeBase64Url,
    decryptJsonPayload,
    encodeBase64Url,
    encryptAesKeyWithRsa,
    encryptJsonPayload,
    encryptedJsonFetch,
    exportAesRawKey,
    generateAesKey,
    importBackendPublicKey
} from './encryptedTransport';

async function createTransportKeyFixture() {
    const keyPair = await globalThis.crypto.subtle.generateKey(
        {
            name: 'RSA-OAEP',
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: 'SHA-256'
        },
        true,
        ['encrypt', 'decrypt']
    );

    const publicKeyJwk = await globalThis.crypto.subtle.exportKey('jwk', keyPair.publicKey);
    return {
        privateKey: keyPair.privateKey,
        transportKey: {
            algorithm: 'RSA-OAEP-256+AES-256-GCM',
            expires_at: '2099-01-01T00:00:00Z',
            key_id: 'transport-key-v1',
            public_key_jwk: publicKeyJwk,
            version: 'transport_envelope_v1'
        }
    };
}

function toHex(value: Uint8Array | ArrayBuffer) {
    const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

describe('encryptedTransport', () => {
    beforeEach(() => {
        clearTransportKeyCache();
        vi.restoreAllMocks();
        vi.unstubAllEnvs();
        vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com');
    });

    it('codifica y decodifica base64url sin padding', () => {
        const source = new TextEncoder().encode('cognia-secure-payload');
        const encoded = encodeBase64Url(source);

        expect(encoded.includes('+')).toBe(false);
        expect(encoded.includes('/')).toBe(false);
        expect(encoded.includes('=')).toBe(false);
        expect(new TextDecoder().decode(decodeBase64Url(encoded))).toBe('cognia-secure-payload');
    });

    it('importa la public key JWK y cifra la AES key con RSA-OAEP', async () => {
        const fixture = await createTransportKeyFixture();
        const importedPublicKey = await importBackendPublicKey(fixture.transportKey.public_key_jwk);
        const aesKey = await generateAesKey();
        const rawAesKey = await exportAesRawKey(aesKey);
        const encryptedAesKey = await encryptAesKeyWithRsa(rawAesKey, importedPublicKey);
        const decryptedAesKey = await globalThis.crypto.subtle.decrypt(
            { name: 'RSA-OAEP' },
            fixture.privateKey,
            encryptedAesKey
        );

        expect(toHex(decryptedAesKey)).toBe(toHex(rawAesKey));
    });

    it('cifra y descifra un payload AES-GCM local con aad', async () => {
        const aesKey = await generateAesKey();
        const encrypted = await encryptJsonPayload(
            { session_id: 'sess-1', domains: ['adhd'] },
            aesKey,
            'transport_envelope_v1|frontend'
        );
        const decrypted = await decryptJsonPayload(encrypted, aesKey);

        expect(decrypted).toEqual({ session_id: 'sess-1', domains: ['adhd'] });
    });

    it('construye un envelope cifrado con la forma esperada', async () => {
        const fixture = await createTransportKeyFixture();
        const fetchMock = vi.fn(async () =>
            new Response(JSON.stringify(fixture.transportKey), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            })
        );
        vi.stubGlobal('fetch', fetchMock);

        const built = await buildEncryptedEnvelope({ answer: 'orientativo' });

        expect(fetchMock).toHaveBeenCalledWith(
            'https://api.example.com/api/v2/security/transport-key',
            expect.objectContaining({ method: 'GET', credentials: 'include' })
        );
        expect(built.keyId).toBe('transport-key-v1');
        expect(built.envelope).toMatchObject({
            encrypted: true,
            version: 'transport_envelope_v1',
            key_id: 'transport-key-v1',
            alg: 'AES-256-GCM'
        });
        expect(built.envelope.encrypted_key).toBeTruthy();
        expect(built.envelope.iv).toBeTruthy();
        expect(built.envelope.ciphertext).toBeTruthy();
    });

    it('llama transport-key, envia headers cifrados y descifra la respuesta', async () => {
        const fixture = await createTransportKeyFixture();
        const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
            const url = String(input);

            if (url.endsWith('/api/v2/security/transport-key')) {
                return new Response(JSON.stringify(fixture.transportKey), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const envelope = JSON.parse(String(init?.body));
            expect(init?.headers).toMatchObject({
                'X-CognIA-Encrypted': '1',
                'X-CognIA-Crypto-Version': 'transport_envelope_v1'
            });
            expect(JSON.stringify(envelope)).not.toContain('secret');

            const decryptedRawKey = await globalThis.crypto.subtle.decrypt(
                { name: 'RSA-OAEP' },
                fixture.privateKey,
                decodeBase64Url(envelope.encrypted_key)
            );
            const aesKey = await globalThis.crypto.subtle.importKey(
                'raw',
                decryptedRawKey,
                { name: 'AES-GCM' },
                false,
                ['encrypt', 'decrypt']
            );
            const decryptedRequest = await decryptJsonPayload(envelope, aesKey);
            expect(decryptedRequest).toEqual({ answer: 'secret' });

            const encryptedResponse = await encryptJsonPayload(
                { ok: true, session_id: 'sess-1' },
                aesKey,
                envelope.aad
            );

            return new Response(JSON.stringify({
                encrypted: true,
                version: 'transport_envelope_v1',
                key_id: 'transport-key-v1',
                alg: 'AES-256-GCM',
                iv: encryptedResponse.iv,
                ciphertext: encryptedResponse.ciphertext,
                aad: encryptedResponse.aad
            }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'X-CognIA-Encrypted': '1'
                }
            });
        });
        vi.stubGlobal('fetch', fetchMock);

        const result = await encryptedJsonFetch<{ ok: boolean; session_id: string }>(
            'https://api.example.com/api/v2/questionnaires/sessions',
            {
                method: 'POST',
                body: { answer: 'secret' },
                credentials: 'include'
            }
        );

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(result.data).toEqual({ ok: true, session_id: 'sess-1' });
    });

    it('refresca transport-key y reintenta una vez cuando el backend responde key_expired', async () => {
        const fixture = await createTransportKeyFixture();
        let secureAttempt = 0;

        const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
            const url = String(input);

            if (url.endsWith('/api/v2/security/transport-key')) {
                return new Response(JSON.stringify(fixture.transportKey), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            secureAttempt += 1;
            if (secureAttempt === 1) {
                return new Response(JSON.stringify({ error: 'key_expired', msg: 'key_expired' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const envelope = JSON.parse(String(init?.body));
            const decryptedRawKey = await globalThis.crypto.subtle.decrypt(
                { name: 'RSA-OAEP' },
                fixture.privateKey,
                decodeBase64Url(envelope.encrypted_key)
            );
            const aesKey = await globalThis.crypto.subtle.importKey(
                'raw',
                decryptedRawKey,
                { name: 'AES-GCM' },
                false,
                ['encrypt', 'decrypt']
            );
            const encryptedResponse = await encryptJsonPayload({ ok: true }, aesKey, envelope.aad);

            return new Response(JSON.stringify({
                encrypted: true,
                version: 'transport_envelope_v1',
                key_id: 'transport-key-v1',
                alg: 'AES-256-GCM',
                iv: encryptedResponse.iv,
                ciphertext: encryptedResponse.ciphertext,
                aad: encryptedResponse.aad
            }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'X-CognIA-Encrypted': '1'
                }
            });
        });
        vi.stubGlobal('fetch', fetchMock);

        const result = await encryptedJsonFetch<{ ok: boolean }>(
            'https://api.example.com/api/v2/questionnaires/history/sess-1/results-secure',
            {
                method: 'POST',
                body: {}
            }
        );

        expect(result.data).toEqual({ ok: true });
        expect(fetchMock).toHaveBeenCalledTimes(4);
    });
});
