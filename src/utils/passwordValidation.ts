export function validatePassword(pass: string): string {
    if (pass.length < 8) {
        return 'La contraseña debe tener al menos 8 caracteres';
    }
    if (!/[A-Z]/.test(pass)) {
        return 'Debe contener al menos una mayúscula';
    }
    if (!/[a-z]/.test(pass)) {
        return 'Debe contener al menos una minúscula';
    }
    if (!/[0-9]/.test(pass)) {
        return 'Debe contener al menos un número';
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(pass)) {
        return 'Debe contener al menos un carácter especial (!@#$%^&*...)';
    }
    return '';
}
