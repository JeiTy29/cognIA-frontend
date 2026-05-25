import { useEffect, useState } from 'react';

export function useDebouncedValue<T>(value: T, delayMs = 300) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timeoutId = globalThis.setTimeout(() => {
            setDebouncedValue(value);
        }, delayMs);

        return () => {
            globalThis.clearTimeout(timeoutId);
        };
    }, [delayMs, value]);

    return debouncedValue;
}

