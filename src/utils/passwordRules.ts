export type PasswordRule = Readonly<{
    id: string;
    label: string;
    test: (value: string) => boolean;
}>;

export type PasswordCheck = Readonly<{
    id: string;
    label: string;
    valid: boolean;
}>;

export const PASSWORD_RULES: readonly PasswordRule[] = [
    { id: 'length', label: 'Mínimo 8 caracteres', test: (value: string) => value.length >= 8 },
    { id: 'upper', label: 'Al menos una mayúscula', test: (value: string) => /[A-Z]/.test(value) },
    { id: 'lower', label: 'Al menos una minúscula', test: (value: string) => /[a-z]/.test(value) },
    { id: 'number', label: 'Al menos un número', test: (value: string) => /[0-9]/.test(value) },
    {
        id: 'special',
        label: 'Al menos un carácter especial (!@#$...)',
        test: (value: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value)
    }
];

export function buildPasswordChecks(value: string): PasswordCheck[] {
    return PASSWORD_RULES.map((rule) => ({
        id: rule.id,
        label: rule.label,
        valid: rule.test(value)
    }));
}
