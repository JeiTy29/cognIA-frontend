import { useCallback, useState } from 'react';
import { registerUser } from '../../services/auth/auth.api';
import type { RegisterPayload, RegisterResponse } from '../../services/auth/auth.types';

interface RegisterState {
    loading: boolean;
    error: unknown;
    data: RegisterResponse | null;
}

export function useRegister() {
    const [state, setState] = useState<RegisterState>({
        loading: false,
        error: null,
        data: null
    });

    const submit = useCallback(async (payload: RegisterPayload) => {
        setState({ loading: true, error: null, data: null });
        try {
            const response = await registerUser(payload);
            setState({ loading: false, error: null, data: response });
            return response;
        } catch (error) {
            setState({ loading: false, error, data: null });
            throw error;
        }
    }, []);

    return {
        ...state,
        submit
    };
}
