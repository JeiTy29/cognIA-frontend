import { useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import './Registro.css';
import '../../../styles/password-ui.css';
import { PasswordVisibilityIcon as SharedPasswordVisibilityIcon } from '../../../components/Auth/PasswordControls';
import { Modal } from '../../../components/Modal/Modal';
import { TermsContent } from '../../../components/Legal/TermsContent';
import { PrivacyContent } from '../../../components/Legal/PrivacyContent';
import { ColombiaLocationSelect } from '../../../components/Location/ColombiaLocationSelect';
import '../../../components/Location/ColombiaLocationSelect.css';
import { validatePassword } from '../../../utils/passwordValidation';
import { useRegister } from '../../../hooks/auth/useRegister';
import { ApiError } from '../../../services/api/httpClient';
import { useAuth } from '../../../hooks/auth/useAuth';
import { getDefaultRouteForRoles } from '../../../utils/auth/roles';
import cogniaLogo from '../../../assets/branding/cognia-logo-light.png';
import padreTutorImage from '../../../assets/Registro/Padre-tutor.png';
import psicologoImage from '../../../assets/Registro/Psicologo.png';

const usernamePattern = /^[A-Za-z0-9._-]{3,32}$/;
const passwordRules = [
    { id: 'length', label: 'Mínimo 8 caracteres', test: (value: string) => value.length >= 8 },
    { id: 'upper', label: 'Al menos una mayúscula', test: (value: string) => /[A-Z]/.test(value) },
    { id: 'lower', label: 'Al menos una minúscula', test: (value: string) => /[a-z]/.test(value) },
    { id: 'number', label: 'Al menos un número', test: (value: string) => /\d/.test(value) },
    {
        id: 'special',
        label: 'Al menos un carácter especial (!@#$...)',
        test: (value: string) => /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value)
    }
];

type TipoUsuario = 'padre' | 'psicologo' | null;
type ErrorMessage = string | null;
type PasswordCheck = Readonly<{
    id: string;
    label: string;
    valid: boolean;
}>;
type PasswordFieldProps = Readonly<{
    value: string;
    visible: boolean;
    placeholder: string;
    required?: boolean;
    error?: string;
    onChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onToggle: () => void;
}>;
type TermsConsentProps = Readonly<{
    accepted: boolean;
    disabled: boolean;
    hasOpenedTerms: boolean;
    hasOpenedPrivacy: boolean;
    error: string;
    onAcceptedChange: (event: ChangeEvent<HTMLInputElement>) => void;
    onOpenTerms: () => void;
    onOpenPrivacy: () => void;
}>;

const LEGAL_LINK_CLASS_NAME = 'link-highlight auth-inline-link';

type RegistrationValidationTarget = 'terms' | 'submit' | 'password' | 'confirm';

function getRegistrationValidationError(input: {
    role: TipoUsuario;
    acceptsTerms: boolean;
    openedTerms: boolean;
    openedPrivacy: boolean;
    fullName: string;
    username: string;
    department: string;
    city: string;
    password: string;
    confirmPassword: string;
}): { target: RegistrationValidationTarget; message: string } | null {
    if (!input.role) return null;

    if (!input.acceptsTerms) {
        return { target: 'terms', message: 'Debes aceptar los términos de uso y políticas de privacidad' };
    }

    if (!input.openedTerms || !input.openedPrivacy) {
        return { target: 'terms', message: 'Debes leer los términos de uso y políticas de privacidad antes de continuar' };
    }

    if (!input.fullName?.trim()) {
        return { target: 'submit', message: 'Ingresa tu nombre completo para continuar.' };
    }

    if (!usernamePattern.test(input.username)) {
        return { target: 'submit', message: 'Revisa el nombre de usuario. Debe tener entre 3 y 32 caracteres válidos.' };
    }

    const normalizedDepartment = input.department.trim();
    if (normalizedDepartment.length < 2) {
        return { target: 'submit', message: 'Selecciona un departamento.' };
    }

    const normalizedCity = input.city.trim();
    if (normalizedCity.length < 2 || normalizedCity.length > 120 || /^[\d\s]+$/u.test(normalizedCity)) {
        return { target: 'submit', message: 'Selecciona una ciudad.' };
    }

    const passwordError = validatePassword(input.password);
    if (passwordError) {
        return { target: 'password', message: passwordError };
    }

    if (input.password !== input.confirmPassword) {
        return { target: 'confirm', message: 'Las contraseñas no coinciden' };
    }

    return null;
}

function resolveRegisterSubmitError(error: unknown) {
    if (error instanceof ApiError && error.status === 400) {
        return 'Revisa los datos ingresados. Verifica correo/usuario y el formato de la contraseña.';
    }
    if (error instanceof ApiError && error.status === 500) {
        return 'Ocurrió un error en el servidor. Intenta nuevamente en unos minutos.';
    }
    return 'Ocurrió un error al registrar. Intenta nuevamente.';
}

function PasswordVisibilityIcon({ visible }: Readonly<{ visible: boolean }>) {
    return <SharedPasswordVisibilityIcon visible={visible} />;
}

function PasswordField({
    value,
    visible,
    placeholder,
    required = false,
    error = '',
    onChange,
    onToggle
}: PasswordFieldProps) {
    return (
        <div className="form-group password-group">
            <input
                type={visible ? 'text' : 'password'}
                className="form-input"
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                required={required}
            />
            <button type="button" className="password-toggle" onClick={onToggle}>
                <PasswordVisibilityIcon visible={visible} />
            </button>
            {error ? <div className="validation-error">{error}</div> : null}
        </div>
    );
}

function PasswordChecklist({ checks }: Readonly<{ checks: PasswordCheck[] }>) {
    return (
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
    );
}

function TermsConsent({
    accepted,
    disabled,
    hasOpenedTerms,
    hasOpenedPrivacy,
    error,
    onAcceptedChange,
    onOpenTerms,
    onOpenPrivacy
}: TermsConsentProps) {
    return (
        <>
            <div className="terms-checkbox">
                <input
                    type="checkbox"
                    id="terms"
                    checked={accepted}
                    disabled={disabled}
                    onChange={onAcceptedChange}
                />
                <div className="terms-text-wrapper">
                    <label htmlFor="terms">
                        Confirmo haber leído y acepto los{' '}
                        <button type="button" className={LEGAL_LINK_CLASS_NAME} onClick={onOpenTerms}>
                            Términos de uso
                        </button>
                        {' '}y{' '}
                        <button type="button" className={LEGAL_LINK_CLASS_NAME} onClick={onOpenPrivacy}>
                            Políticas de privacidad
                        </button>
                    </label>
                    {!hasOpenedTerms || !hasOpenedPrivacy ? (
                        <p className="checkbox-hint">
                            Por favor, lee los términos de uso y las políticas de privacidad antes de continuar
                        </p>
                    ) : null}
                </div>
            </div>
            {error ? <div className="validation-error registro-inline-error">{error}</div> : null}
        </>
    );
}

export default function Registro() {
    const navigate = useNavigate();
    const { submit, loading } = useRegister();
    const { isAuthenticated, roles, devAuthActive } = useAuth();
    const [rolSeleccionado, setRolSeleccionado] = useState<TipoUsuario>(null);
    const [aceptaTerminos, setAceptaTerminos] = useState(false);
    const [showTerms, setShowTerms] = useState(false);
    const [showPrivacy, setShowPrivacy] = useState(false);
    const [hasOpenedTerms, setHasOpenedTerms] = useState(false);
    const [hasOpenedPrivacy, setHasOpenedPrivacy] = useState(false);
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [department, setDepartment] = useState('');
    const [city, setCity] = useState('');
    const [numeroOperador, setNumeroOperador] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [confirmarContrasena, setConfirmarContrasena] = useState('');
    const [mostrarContrasena, setMostrarContrasena] = useState(false);
    const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
    const [errorContrasena, setErrorContrasena] = useState('');
    const [errorConfirmar, setErrorConfirmar] = useState('');
    const [errorTerminos, setErrorTerminos] = useState('');
    const [submitError, setSubmitError] = useState<ErrorMessage>(null);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    const passwordChecks = useMemo(
        () =>
            passwordRules.map((rule) => ({
                id: rule.id,
                label: rule.label,
                valid: rule.test(contrasena)
            })),
        [contrasena]
    );

    if (isAuthenticated && !devAuthActive) {
        return <Navigate to={getDefaultRouteForRoles(roles)} replace />;
    }

    const resetRegistrationState = () => {
        setFullName('');
        setUsername('');
        setEmail('');
        setDepartment('');
        setCity('');
        setNumeroOperador('');
        setContrasena('');
        setConfirmarContrasena('');
        setErrorContrasena('');
        setErrorConfirmar('');
        setErrorTerminos('');
        setSubmitError(null);
        setSubmitSuccess(false);
        setAceptaTerminos(false);
    };

    const handleContrasenaChange = (event: ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setContrasena(value);
        setErrorContrasena(validatePassword(value));

        if (confirmarContrasena && value !== confirmarContrasena) {
            setErrorConfirmar('Las contraseñas no coinciden');
            return;
        }

        setErrorConfirmar('');
    };

    const handleConfirmarChange = (event: ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;
        setConfirmarContrasena(value);
        setErrorConfirmar(value === contrasena ? '' : 'Las contraseñas no coinciden');
    };

    const handleRolTagClick = () => {
        setRolSeleccionado(null);
        resetRegistrationState();
    };

    const handleTermsOpen = () => {
        setShowTerms(true);
        setHasOpenedTerms(true);
    };

    const handlePrivacyOpen = () => {
        setShowPrivacy(true);
        setHasOpenedPrivacy(true);
    };

    const handleTermsChange = (event: ChangeEvent<HTMLInputElement>) => {
        setAceptaTerminos(event.target.checked);
        setErrorTerminos('');
    };

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setSubmitError(null);
        setSubmitSuccess(false);

        if (!rolSeleccionado) return;

        const validationError = getRegistrationValidationError({
            role: rolSeleccionado,
            acceptsTerms: aceptaTerminos,
            openedTerms: hasOpenedTerms,
            openedPrivacy: hasOpenedPrivacy,
            fullName,
            username,
            department,
            city,
            password: contrasena,
            confirmPassword: confirmarContrasena
        });
        if (validationError) {
            if (validationError.target === 'terms') {
                setErrorTerminos(validationError.message);
            } else if (validationError.target === 'password') {
                setErrorContrasena(validationError.message);
            } else if (validationError.target === 'confirm') {
                setErrorConfirmar(validationError.message);
            } else {
                setSubmitError(validationError.message);
            }
            return;
        }

        try {
            const payloadBase = {
                username,
                email,
                password: contrasena,
                full_name: fullName.trim(),
                department: department.trim(),
                city: city.trim()
            };

            if (rolSeleccionado === 'padre') {
                await submit({
                    ...payloadBase,
                    user_type: 'guardian'
                });
            } else {
                await submit({
                    ...payloadBase,
                    user_type: 'psychologist',
                    professional_card_number: numeroOperador
                });
            }

            setSubmitSuccess(true);
            globalThis.setTimeout(() => {
                navigate('/inicio-sesion');
            }, 1200);
        } catch (error) {
            setSubmitError(resolveRegisterSubmitError(error));
        }
    };

    const renderRegistrationForm = (roleSpecificFields: ReactNode) => (
        <form className="auth-form" onSubmit={handleSubmit}>
            {roleSpecificFields}
            <PasswordField
                value={contrasena}
                visible={mostrarContrasena}
                placeholder="Contraseña"
                required
                error={errorContrasena}
                onChange={handleContrasenaChange}
                onToggle={() => setMostrarContrasena((prev) => !prev)}
            />
            <PasswordChecklist checks={passwordChecks} />
            <PasswordField
                value={confirmarContrasena}
                visible={mostrarConfirmar}
                placeholder="Confirmar contraseña"
                required
                error={errorConfirmar}
                onChange={handleConfirmarChange}
                onToggle={() => setMostrarConfirmar((prev) => !prev)}
            />
            <TermsConsent
                accepted={aceptaTerminos}
                disabled={!hasOpenedTerms || !hasOpenedPrivacy}
                hasOpenedTerms={hasOpenedTerms}
                hasOpenedPrivacy={hasOpenedPrivacy}
                error={errorTerminos}
                onAcceptedChange={handleTermsChange}
                onOpenTerms={handleTermsOpen}
                onOpenPrivacy={handlePrivacyOpen}
            />
            {submitError ? <div className="validation-error registro-inline-message">{submitError}</div> : null}
            {submitSuccess ? (
                <div className="validation-success registro-inline-message">
                    Cuenta creada correctamente. Redirigiendo...
                </div>
            ) : null}
            <button type="submit" className="btn-primary" disabled={!aceptaTerminos || loading}>
                {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
        </form>
    );

    return (
        <div className="auth-container registro-container">
            <div className="auth-left-panel"></div>

            <div className="auth-right-panel">
                <div className="auth-content">
                    <div className="header-brand">
                        <Link to="/" className="brand-link">
                            <img className="auth-brand-logo" src={cogniaLogo} alt="CognIA" />
                            <span className="brand-text">cognIA</span>
                        </Link>
                    </div>

                    <h1 className="auth-title">Regístrate</h1>

                    <p className="auth-subtitle">
                        ¿Ya tienes una cuenta?{' '}
                        <Link to="/inicio-sesion" className="link-highlight">Inicia sesión</Link>
                    </p>

                    {devAuthActive ? (
                        <div className="validation-success">Modo desarrollo activo. Puedes registrarte normalmente.</div>
                    ) : null}

                    {rolSeleccionado === null ? (
                        <div className="role-selection-horizontal">
                            <button type="button" className="role-card-vertical" onClick={() => setRolSeleccionado('padre')}>
                                <div className="role-image-placeholder" aria-hidden="true">
                                    <img className="role-card-image" src={padreTutorImage} alt="" />
                                </div>
                                <h3 className="role-text">Soy padre, tutor o guardian</h3>
                            </button>

                            <button type="button" className="role-card-vertical" onClick={() => setRolSeleccionado('psicologo')}>
                                <div className="role-image-placeholder" aria-hidden="true">
                                    <img className="role-card-image" src={psicologoImage} alt="" />
                                </div>
                                <h3 className="role-text">Soy psicólogo</h3>
                            </button>
                        </div>
                    ) : (
                        <div className="form-container-animated">
                            <button
                                type="button"
                                className="role-tag clickeable"
                                onClick={handleRolTagClick}
                                title="Haz clic para cambiar rol"
                            >
                                {rolSeleccionado === 'padre' ? 'Soy padre, tutor o guardian' : 'Soy psicólogo'}
                                <span className="change-hint">cambiar rol</span>
                            </button>

                            {rolSeleccionado === 'padre'
                                ? renderRegistrationForm(
                                    <>
                                        <div className="form-group">
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="Nombre completo"
                                                value={fullName}
                                                onChange={(event) => setFullName(event.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <input
                                                id="username-padre"
                                                type="text"
                                                className="form-input"
                                                placeholder="Nombre de usuario"
                                                value={username}
                                                onChange={(event) => setUsername(event.target.value)}
                                                title="Debe tener entre 3 y 32 caracteres. Solo letras, números, punto, guion y guion bajo."
                                                autoCapitalize="none"
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <input
                                                type="email"
                                                className="form-input"
                                                placeholder="Correo electrónico"
                                                value={email}
                                                onChange={(event) => setEmail(event.target.value)}
                                                required
                                            />
                                        </div>
                                        <ColombiaLocationSelect
                                            value={{ department, city }}
                                            onChange={(nextValue) => {
                                                setDepartment(nextValue.department);
                                                setCity(nextValue.city);
                                            }}
                                            required
                                        />
                                    </>
                                )
                                : renderRegistrationForm(
                                    <>
                                        <div className="form-group">
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="Nombre completo"
                                                value={fullName}
                                                onChange={(event) => setFullName(event.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <input
                                                id="username-psico"
                                                type="text"
                                                className="form-input"
                                                placeholder="Nombre de usuario"
                                                value={username}
                                                onChange={(event) => setUsername(event.target.value)}
                                                title="Debe tener entre 3 y 32 caracteres. Solo letras, números, punto, guion y guion bajo."
                                                autoCapitalize="none"
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <input
                                                type="email"
                                                className="form-input"
                                                placeholder="Correo electrónico"
                                                value={email}
                                                onChange={(event) => setEmail(event.target.value)}
                                                required
                                            />
                                        </div>
                                        <ColombiaLocationSelect
                                            value={{ department, city }}
                                            onChange={(nextValue) => {
                                                setDepartment(nextValue.department);
                                                setCity(nextValue.city);
                                            }}
                                            required
                                        />
                                        <div className="form-group">
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="Número de tarjeta profesional"
                                                value={numeroOperador}
                                                onChange={(event) => setNumeroOperador(event.target.value)}
                                                required
                                            />
                                        </div>
                                    </>
                                )}
                        </div>
                    )}

                    <div className="version-footer">cognIA v1.0.0</div>

                    <Modal isOpen={showTerms} onClose={() => setShowTerms(false)}>
                        <TermsContent />
                    </Modal>

                    <Modal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)}>
                        <PrivacyContent />
                    </Modal>
                </div>
            </div>
        </div>
    );
}
