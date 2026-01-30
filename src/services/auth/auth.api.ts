import { apiPost } from '../api/httpClient';
import type { RegisterPayload, RegisterResponse } from './auth.types';

export function registerUser(payload: RegisterPayload): Promise<RegisterResponse> {
    return apiPost<RegisterResponse, RegisterPayload>('/api/auth/register', payload);
}
