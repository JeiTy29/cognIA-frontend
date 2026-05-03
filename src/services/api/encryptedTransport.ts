import { assertApiClientConfig, debugApiClient, joinApiUrl } from './url';

const TRANSPORT_VERSION = 'transport_envelope_v1';
const TRANSPORT_ALGORITHM = 'AES-256-GCM';
const TRANSPORT_REQUEST_AAD = `${TRANSPORT_VERSION}|frontend`;
const ENCRYPTED_HEADER = 'X-CognIA-Encrypted';
const CRYPTO_VERSION_HEADER = 'X-CognIA-Crypto-Version';

const RETRYABLE_CRYPTO_ERRORS = new Set([
    'key_expired',
    'decryption_failed',
    'encrypted_payload_invalid',
    'invalid_crypto_version',
    'transport_key_failed',
    'key_id_mismatch'
]);

export interface TransportKeyResponse {
    algorithm: string;
    expires_at: string;
    key_id: string;
    public_key_jwk: JsonWebKey;
    version: typeof TRANSPORT_VERSION | string;
}

export interface TransportEncryptedRequestEnvelope {
    encrypted: true;
    version: typeof TRANSPORT_VERSION | string;
    key_id: string;
    alg: string;
    encrypted_key: string;
    iv: string;
    ciphertext: string;
    aad?: string;
}

export interface TransportEncryptedResponseEnvelope {
    encrypted: true;
    version: typeof TRANSPORT_VERSION | string;
    key_id: string;
    alg: string;
    iv: string;
    ciphertext: string;
    aad?: string;
}

interface CachedTransportKey extends TransportKeyResponse {
    cryptoKey: CryptoKey;
    expiresAtMs: number;
}

export interface BuiltEncryptedEnvelope {
    envelope: TransportEncryptedRequestEnvelope;
    aesKey: CryptoKey;
    keyId: string;
}

export interface EncryptedFetchOptions {
    method?: 'POST' | 'PATCH' | 'PUT';
    body?: unknown;
    headers?: Record<string, string>;
    credentials?: RequestCredentials;
    requireEncryptedResponse?: boolean;
}

export interface EncryptedFetchResult<T> {
    response: Response;
    data: T | null;
}

let cachedTransportKey: CachedTransportKey | null = null;

function getWebCrypto() {
    if (!globalThis.crypto?.subtle) {
        throw new Error('Web Crypto API no esta disponible en este entorno.');
    }
    return globalThis.crypto;
}

function normalizeExpiry(value: string) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function isTransportKeyExpired(key: CachedTransportKey) {
    if (!key.expiresAtMs) return false;
    return Date.now() >= key.expiresAtMs - 5_000;
}

function addBase64Padding(value: string) {
    const remainder = value.length % 4;
    if (remainder === 0) return value;
    return `${value}${'='.repeat(4 - remainder)}`;
}

function encodeBinaryToBase64(binary: string) {
    if (typeof globalThis.btoa === 'function') {
        return globalThis.btoa(binary);
    }

    throw new Error('No hay soporte para base64 en este entorno.');
}

function decodeBase64ToBinary(base64: string) {
    if (typeof globalThis.atob === 'function') {
        return globalThis.atob(base64);
    }

    throw new Error('No hay soporte para base64 en este entorno.');
}

export function encodeBase64Url(value: ArrayBuffer | Uint8Array) {
    const bytes = value instanceof Uint8Array ? value : new Uint8Array(value);
    let binary = '';
    for (let index = 0; index < bytes.length; index += 1) {
        binary += String.fromCharCode(bytes[index]);
    }

    return encodeBinaryToBase64(binary)
        .replaceAll('+', '-')
        .replaceAll('/', '_')
        .replaceAll('=', '');
}

export function decodeBase64Url(value: string) {
    const base64 = addBase64Padding(value.replaceAll('-', '+').replaceAll('_', '/'));
    const binary = decodeBase64ToBinary(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
        bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
}

function isEncryptedResponseEnvelope(value: unknown): value is TransportEncryptedResponseEnvelope {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const record = value as Record<string, unknown>;
    return record.encrypted === true &&
        typeof record.version === 'string' &&
        typeof record.key_id === 'string' &&
        typeof record.alg === 'string' &&
        typeof record.iv === 'string' &&
        typeof record.ciphertext === 'string';
}

async function parseResponseJson(response: Response) {
    const text = await response.text();
    if (!text.trim()) return null;
    try {
        return JSON.parse(text) as unknown;
    } catch {
        return text;
    }
}

export async function importBackendPublicKey(publicKeyJwk: JsonWebKey) {
    return getWebCrypto().subtle.importKey(
        'jwk',
        publicKeyJwk,
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        false,
        ['encrypt']
    );
}

export async function generateAesKey() {
    return getWebCrypto().subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );
}

export async function exportAesRawKey(aesKey: CryptoKey) {
    return getWebCrypto().subtle.exportKey('raw', aesKey);
}

export async function encryptAesKeyWithRsa(rawAesKey: ArrayBuffer, publicKey: CryptoKey) {
    return getWebCrypto().subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, rawAesKey);
}

export async function encryptJsonPayload(body: unknown, aesKey: CryptoKey, aad?: string) {
    const iv = getWebCrypto().getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(JSON.stringify(body));
    const additionalData = typeof aad === 'string' && aad.length > 0
        ? new TextEncoder().encode(aad)
        : undefined;

    const ciphertext = await getWebCrypto().subtle.encrypt(
        {
            name: 'AES-GCM',
            iv,
            additionalData
        },
        aesKey,
        encoded
    );

    return {
        iv: encodeBase64Url(iv),
        ciphertext: encodeBase64Url(ciphertext),
        aad
    };
}

export async function decryptJsonPayload(
    envelope: Pick<TransportEncryptedResponseEnvelope, 'iv' | 'ciphertext' | 'aad'>,
    aesKey: CryptoKey
) {
    const iv = decodeBase64Url(envelope.iv);
    const ciphertext = decodeBase64Url(envelope.ciphertext);
    const additionalData = typeof envelope.aad === 'string' && envelope.aad.length > 0
        ? new TextEncoder().encode(envelope.aad)
        : undefined;

    const decrypted = await getWebCrypto().subtle.decrypt(
        {
            name: 'AES-GCM',
            iv,
            additionalData
        },
        aesKey,
        ciphertext
    );

    return JSON.parse(new TextDecoder().decode(decrypted)) as unknown;
}

export function clearTransportKeyCache() {
    cachedTransportKey = null;
}

export async function fetchTransportKey(forceRefresh = false): Promise<CachedTransportKey> {
    if (!forceRefresh && cachedTransportKey && !isTransportKeyExpired(cachedTransportKey)) {
        return cachedTransportKey;
    }

    const assertion = assertApiClientConfig();
    if (!assertion.ok) {
        throw new Error(assertion.message ?? 'No fue posible validar la configuracion del API client.');
    }

    debugApiClient('request GET /api/v2/security/transport-key');

    const response = await fetch(joinApiUrl('/api/v2/security/transport-key'), {
        method: 'GET',
        headers: {
            Accept: 'application/json'
        },
        credentials: 'include'
    });

    const payload = await parseResponseJson(response);
    if (!response.ok) {
        throw new Error('transport_key_failed');
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new Error('transport_key_failed');
    }

    const record = payload as Record<string, unknown>;
    const keyId = typeof record.key_id === 'string' ? record.key_id.trim() : '';
    const version = typeof record.version === 'string' ? record.version.trim() : '';
    const algorithm = typeof record.algorithm === 'string' ? record.algorithm.trim() : '';
    const expiresAt = typeof record.expires_at === 'string' ? record.expires_at : '';
    const publicKeyJwk = record.public_key_jwk;

    if (!keyId || !version || !algorithm || !expiresAt || !publicKeyJwk || typeof publicKeyJwk !== 'object') {
        throw new Error('transport_key_failed');
    }

    const cryptoKey = await importBackendPublicKey(publicKeyJwk as JsonWebKey);
    cachedTransportKey = {
        algorithm,
        expires_at: expiresAt,
        key_id: keyId,
        public_key_jwk: publicKeyJwk as JsonWebKey,
        version,
        cryptoKey,
        expiresAtMs: normalizeExpiry(expiresAt)
    };

    return cachedTransportKey;
}

export async function buildEncryptedEnvelope(body: unknown): Promise<BuiltEncryptedEnvelope> {
    const transportKey = await fetchTransportKey();
    const aesKey = await generateAesKey();
    const rawAesKey = await exportAesRawKey(aesKey);
    const encryptedAesKey = await encryptAesKeyWithRsa(rawAesKey, transportKey.cryptoKey);
    const encryptedPayload = await encryptJsonPayload(body, aesKey, TRANSPORT_REQUEST_AAD);

    return {
        envelope: {
            encrypted: true,
            version: transportKey.version,
            key_id: transportKey.key_id,
            alg: TRANSPORT_ALGORITHM,
            encrypted_key: encodeBase64Url(encryptedAesKey),
            iv: encryptedPayload.iv,
            ciphertext: encryptedPayload.ciphertext,
            aad: encryptedPayload.aad
        },
        aesKey,
        keyId: transportKey.key_id
    };
}

function getEnvelopeHeaders(version: string, headers?: Record<string, string>) {
    return {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        [ENCRYPTED_HEADER]: '1',
        [CRYPTO_VERSION_HEADER]: version,
        ...headers
    };
}

async function executeEncryptedJsonFetch<T>(
    url: string,
    options: EncryptedFetchOptions,
    hasRetried = false
): Promise<EncryptedFetchResult<T>> {
    const { envelope, aesKey } = await buildEncryptedEnvelope(options.body ?? {});
    debugApiClient(`request ${options.method ?? 'POST'} ${url}`);
    debugApiClient(`encrypted request enabled=true cryptoVersion=${envelope.version}`);

    const response = await fetch(url, {
        method: options.method ?? 'POST',
        headers: getEnvelopeHeaders(envelope.version, options.headers),
        credentials: options.credentials ?? 'include',
        body: JSON.stringify(envelope)
    });

    const payload = await parseResponseJson(response);
    const encryptedHeader = response.headers.get(ENCRYPTED_HEADER) === '1';
    const encryptedBody = isEncryptedResponseEnvelope(payload);
    const shouldDecrypt = encryptedHeader || encryptedBody;

    if (!response.ok) {
        const errorRecord = payload && typeof payload === 'object' && !Array.isArray(payload)
            ? payload as Record<string, unknown>
            : null;
        const errorCode = typeof errorRecord?.error === 'string' ? errorRecord.error : null;

        if (!hasRetried && errorCode && RETRYABLE_CRYPTO_ERRORS.has(errorCode)) {
            clearTransportKeyCache();
            return executeEncryptedJsonFetch<T>(url, options, true);
        }

        return {
            response,
            data: payload as T
        };
    }

    if (shouldDecrypt) {
        try {
            const decrypted = await decryptJsonPayload(
                encryptedBody
                    ? payload
                    : payload as TransportEncryptedResponseEnvelope,
                aesKey
            );

            return {
                response,
                data: decrypted as T
            };
        } catch (error) {
            if (!hasRetried) {
                clearTransportKeyCache();
                return executeEncryptedJsonFetch<T>(url, options, true);
            }
            throw error;
        }
    }

    if (options.requireEncryptedResponse !== false) {
        throw new Error('plaintext_not_allowed');
    }

    return {
        response,
        data: payload as T
    };
}

export async function encryptedJsonFetch<T>(url: string, options: EncryptedFetchOptions) {
    return executeEncryptedJsonFetch<T>(url, options);
}

export {
    CRYPTO_VERSION_HEADER,
    ENCRYPTED_HEADER,
    TRANSPORT_REQUEST_AAD,
    TRANSPORT_VERSION
};
