import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './RestablecerContraseña.css';

const passwordRules = [
    {
        id: 'length',
        label: 'Mínimo 8 caracteres',
        test: (value: string) => value.length >= 8
    },
    {
        id: 'upper',
        label: 'Al menos una mayúscula',
        test: (value: string) => /[A-Z]/.test(value)
    },
    {
        id: 'lower',
        label: 'Al menos una minúscula',
        test: (value: string) => /[a-z]/.test(value)
    },
    {
        id: 'number',
        label: 'Al menos un número',
        test: (value: string) => /[0-9]/.test(value)
    },
    {
        id: 'special',
        label: 'Al menos un carácter especial (!@#$...)',
        test: (value: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value)
    }
];

export default function RestablecerContraseña() {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const checks = useMemo(() => (
        passwordRules.map(rule => ({
            id: rule.id,
            label: rule.label,
            valid: rule.test(password)
        }))
    ), [password]);

    const allValid = checks.every(check => check.valid);
    const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
    const canSubmit = allValid && password.length > 0 && password === confirmPassword;

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        if (!canSubmit) return;
        setShowSuccess(true);
    };

    return (
        <div className="auth-container restablecer-container">
            <div className="auth-left-panel"></div>

            <div className="auth-right-panel">
                <div className="auth-content">
                    <h1 className="auth-title">Restablecer contraseña</h1>
                    <p className="auth-subtitle">Crea una nueva contraseña para volver a ingresar.</p>

                    <form className="auth-form" onSubmit={handleSubmit}>
                        <div className="form-group password-group">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="form-input"
                                placeholder="Nueva contraseña"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                required
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword((prev) => !prev)}
                                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                            >
                                {showPassword ? (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                        <line x1="1" y1="1" x2="23" y2="23"></line>
                                    </svg>
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                )}
                            </button>
                        </div>

                        <div className="password-checklist">
                            <span className="password-checklist-title">Requisitos de contraseña</span>
                            <div className="password-checklist-grid">
                                {checks.map((check) => (
                                    <div key={check.id} className={`password-check ${check.valid ? 'is-valid' : 'is-invalid'}`}>
                                        <span className="password-check-indicator" aria-hidden="true">
                                            {check.valid ? '✓' : '•'}
                                        </span>
                                        <span>{check.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="form-group password-group">
                            <input
                                type={showConfirm ? 'text' : 'password'}
                                className="form-input"
                                placeholder="Confirmar nueva contraseña"
                                value={confirmPassword}
                                onChange={(event) => setConfirmPassword(event.target.value)}
                                required
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowConfirm((prev) => !prev)}
                                aria-label={showConfirm ? 'Ocultar confirmación' : 'Mostrar confirmación'}
                            >
                                {showConfirm ? (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                        <line x1="1" y1="1" x2="23" y2="23"></line>
                                    </svg>
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                )}
                            </button>
                            {confirmPassword.length > 0 ? (
                                <div className={passwordsMatch ? 'validation-success' : 'validation-error'}>
                                    {passwordsMatch ? 'Las contraseñas coinciden.' : 'Las contraseñas no coinciden.'}
                                </div>
                            ) : null}
                        </div>

                        <button type="submit" className="btn-primary" disabled={!canSubmit}>
                            Guardar contraseña
                        </button>

                        <Link to="/inicio-sesion" className="forgot-password-link">
                            Volver a inicio de sesión
                        </Link>
                    </form>
                </div>
            </div>

            {showSuccess ? (
                <div className="reset-modal-overlay" role="dialog" aria-modal="true">
                    <div className="reset-modal-content">
                        <p className="reset-modal-text">Contraseña actualizada. Ya puedes iniciar sesión.</p>
                        <button
                            type="button"
                            className="btn-primary"
                            onClick={() => navigate('/inicio-sesion')}
                        >
                            Ir a inicio de sesión
                        </button>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
