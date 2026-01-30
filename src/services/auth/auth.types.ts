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
