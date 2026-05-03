function getBooleanEnv(value: unknown, fallback: boolean) {
    if (typeof value !== 'string' || value.trim().length === 0) {
        return fallback;
    }

    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
    return fallback;
}

export function getEncryptedTransportEnabled() {
    return getBooleanEnv(import.meta.env.VITE_COGNIA_ENCRYPTED_TRANSPORT, true);
}

export function getRequireEncryptedSensitivePayloads() {
    return getBooleanEnv(import.meta.env.VITE_COGNIA_REQUIRE_ENCRYPTED_SENSITIVE_PAYLOADS, true);
}

export function getApiClientDebugEnabled() {
    return getBooleanEnv(import.meta.env.VITE_DEBUG_API_CLIENT, false);
}
