export type UserType = 'guardian' | 'psychologist';

export interface RegisterPayload {
    username: string;
    email: string;
    password: string;
    user_type: UserType;
    full_name?: string;
    professional_card_number?: string;
}

export interface RegisterResponse {
    msg: string;
    user_id: string;
}

export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginSuccessResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
}

export interface MFALoginChallengeResponse {
    mfa_required: true;
    challenge_id: string;
    expires_in: number;
    msg?: string;
    error?: string;
}

export interface MFAEnrollmentRequiredResponse {
    mfa_enrollment_required: true;
    enrollment_token: string;
    token_type: string;
    expires_in: number;
    msg?: string;
    error?: string;
}

export type LoginResponse = LoginSuccessResponse | MFALoginChallengeResponse | MFAEnrollmentRequiredResponse;

export interface LoginErrorResponse {
    error: 'invalid_credentials' | 'request_failed';
    status: number;
}

export interface MFALoginRequest {
    challenge_id: string;
    code?: string;
    recovery_code?: string;
}

export interface MFALoginResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
}

export interface MFASetupResponse {
    otpauth_uri: string;
    secret?: string;
}

export interface MFAConfirmRequest {
    code: string;
}

export interface MFAConfirmResponse {
    code: string;
    recovery_codes?: string[];
    msg?: string;
}

export interface MFADisableRequest {
    password: string;
    code?: string;
    recovery_code?: string;
}

export interface MFADisableResponse {
    msg: string;
}

export interface LogoutResponse {
    message: string;
}

export interface LogoutErrorResponse {
    error: 'invalid_credentials';
    status: number;
}

export interface RefreshResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
}

export interface RefreshErrorResponse {
    error: 'invalid_session';
    status: number;
}
