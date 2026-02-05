import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import './Registro.css';
import { Modal } from '../../../components/Modal/Modal';
import { TermsContent } from '../../../components/Legal/TermsContent';
import { PrivacyContent } from '../../../components/Legal/PrivacyContent';
import { validatePassword } from '../../../utils/passwordValidation';
import { useRegister } from '../../../hooks/auth/useRegister';
import { ApiError } from '../../../services/api/httpClient';
import { useAuth } from '../../../hooks/auth/useAuth';
import { getDefaultRouteForRoles } from '../../../utils/auth/roles';

const usernamePattern = /^[A-Za-z0-9._-]{3,32}$/;

type TipoUsuario = 'padre' | 'psicologo' | null;

type ErrorMessage = string | null;

export default function Registro() {
    const navigate = useNavigate();
    const { submit, loading } = useRegister();
    const { isAuthenticated, roles, devAuthActive } = useAuth();
    const [rolSeleccionado, setRolSeleccionado] = useState<TipoUsuario>(null);
    const [aceptaTerminos, setAceptaTerminos] = useState(false);

    // Estados para Modals
    const [showTerms, setShowTerms] = useState(false);
    const [showPrivacy, setShowPrivacy] = useState(false);
    const [hasOpenedTerms, setHasOpenedTerms] = useState(false);
    const [hasOpenedPrivacy, setHasOpenedPrivacy] = useState(false);

    // Estados de formulario
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [numeroOperador, setNumeroOperador] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [confirmarContrasena, setConfirmarContrasena] = useState('');
    const [mostrarContrasena, setMostrarContrasena] = useState(false);
    const [mostrarConfirmar, setMostrarConfirmar] = useState(false);

    // Estados de validación
    const [errorContrasena, setErrorContrasena] = useState('');
    const [errorConfirmar, setErrorConfirmar] = useState('');
    const [errorTerminos, setErrorTerminos] = useState('');
    const [submitError, setSubmitError] = useState<ErrorMessage>(null);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    if (isAuthenticated && !devAuthActive) {
        return <Navigate to={getDefaultRouteForRoles(roles)} replace />;
    }

    const handleContrasenaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const valor = e.target.value;
        setContrasena(valor);
        setErrorContrasena(validatePassword(valor));

        if (confirmarContrasena && valor !== confirmarContrasena) {
            setErrorConfirmar('Las contraseñas no coinciden');
        } else {
            setErrorConfirmar('');
        }
    };

    const handleConfirmarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const valor = e.target.value;
        setConfirmarContrasena(valor);

        if (valor !== contrasena) {
            setErrorConfirmar('Las contraseñas no coinciden');
        } else {
            setErrorConfirmar('');
        }
    };

    const handleRolSelect = (rol: TipoUsuario) => {
        setRolSeleccionado(rol);
    };

    const handleRolTagClick = () => {
        setRolSeleccionado(null);
        // Resetear form
        setFullName('');
        setUsername('');
        setEmail('');
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError(null);
        setSubmitSuccess(false);

        if (!rolSeleccionado) return;

        // Validar términos
        if (!aceptaTerminos) {
            setErrorTerminos('Debes aceptar los términos de uso y políticas de privacidad');
            return;
        }

        // Validar que haya abierto los modales
        if (!hasOpenedTerms || !hasOpenedPrivacy) {
            setErrorTerminos('Debes leer los términos de uso y políticas de privacidad antes de continuar');
            return;
        }

        if (!usernamePattern.test(username)) {
            setSubmitError('Revisa el nombre de usuario. Debe tener entre 3 y 32 caracteres válidos.');
            return;
        }

        // Validar contraseña
        const errorPass = validatePassword(contrasena);
        if (errorPass) {
            setErrorContrasena(errorPass);
            return;
        }

        // Validar coincidencia
        if (contrasena !== confirmarContrasena) {
            setErrorConfirmar('Las contraseñas no coinciden');
            return;
        }

        try {
            const payloadBase = {
                username,
                email,
                password: contrasena
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
                    full_name: fullName,
                    professional_card_number: numeroOperador
                });
            }

            setSubmitSuccess(true);
            setTimeout(() => {
                navigate('/inicio-sesion');
            }, 1200);
        } catch (error) {
            if (error instanceof ApiError) {
                if (error.status === 400) {
                    setSubmitError('Revisa los datos ingresados. Verifica correo/usuario y el formato de la contraseña.');
                } else if (error.status === 500) {
                    setSubmitError('Ocurrió un error en el servidor. Intenta nuevamente en unos minutos.');
                } else {
                    setSubmitError('Ocurrió un error al registrar. Intenta nuevamente.');
                }
            } else {
                setSubmitError('Ocurrió un error al registrar. Intenta nuevamente.');
            }
        }
    };

    return (
        <div className="auth-container registro-container">
            <div className="auth-left-panel"></div>

            <div className="auth-right-panel">
                <div className="auth-content">
                    <div className="header-brand">
                        <Link to="/" className="brand-link">
                            <div className="brand-icon">c</div>
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

                    {!rolSeleccionado ? (
                        <div className="role-selection-horizontal">
                            <div
                                className="role-card-vertical"
                                onClick={() => handleRolSelect('padre')}
                            >
                                <div className="role-image-placeholder"></div>
                                <h3 className="role-text">Soy padre o docente</h3>
                            </div>

                            <div
                                className="role-card-vertical"
                                onClick={() => handleRolSelect('psicologo')}
                            >
                                <div className="role-image-placeholder"></div>
                                <h3 className="role-text">Soy psicólogo</h3>
                            </div>
                        </div>
                    ) : (
                        <div className="form-container-animated">
                            <button
                                type="button"
                                className="role-tag clickeable"
                                onClick={handleRolTagClick}
                                title="Click para cambiar rol"
                            >
                                {rolSeleccionado === 'padre' ? 'Soy padre o docente' : 'Soy psicólogo'}
                                <span className="change-hint">cambiar rol</span>
                            </button>

                            {rolSeleccionado === 'padre' ? (
                                <form className="auth-form" onSubmit={handleSubmit}>
                                    <div className="form-group">
                                        <input
                                            id="username-padre"
                                            type="text"
                                            className="form-input"
                                            placeholder="Nombre de usuario"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
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
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="form-group password-group">
                                        <input
                                            type={mostrarContrasena ? 'text' : 'password'}
                                            className="form-input"
                                            placeholder="Contraseña"
                                            value={contrasena}
                                            onChange={handleContrasenaChange}
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="password-toggle"
                                            onClick={() => setMostrarContrasena(!mostrarContrasena)}
                                        >
                                            {mostrarContrasena ? (
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
                                        {errorContrasena && <div className="validation-error">{errorContrasena}</div>}
                                    </div>

                                    <div className="form-group password-group">
                                        <input
                                            type={mostrarConfirmar ? 'text' : 'password'}
                                            className="form-input"
                                            placeholder="Confirmar contraseña"
                                            value={confirmarContrasena}
                                            onChange={handleConfirmarChange}
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="password-toggle"
                                            onClick={() => setMostrarConfirmar(!mostrarConfirmar)}
                                        >
                                            {mostrarConfirmar ? (
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
                                        {errorConfirmar && <div className="validation-error">{errorConfirmar}</div>}
                                    </div>

                                    <div className="terms-checkbox">
                                        <input
                                            type="checkbox"
                                            id="terms"
                                            checked={aceptaTerminos}
                                            disabled={!hasOpenedTerms || !hasOpenedPrivacy}
                                            onChange={(e) => {
                                                setAceptaTerminos(e.target.checked);
                                                setErrorTerminos('');
                                            }}
                                        />
                                        <div className="terms-text-wrapper">
                                            <label htmlFor="terms">
                                                Confirmo haber leído y acepto los{' '}
                                                <a href="#" className="link-highlight" onClick={(e) => { e.preventDefault(); setShowTerms(true); setHasOpenedTerms(true); }}>Términos de uso</a>
                                                {' '}y{' '}
                                                <a href="#" className="link-highlight" onClick={(e) => { e.preventDefault(); setShowPrivacy(true); setHasOpenedPrivacy(true); }}>Políticas de privacidad</a>
                                            </label>
                                            {!hasOpenedTerms || !hasOpenedPrivacy ? (
                                                <p className="checkbox-hint">Por favor, lee los términos de uso y las políticas de privacidad antes de continuar</p>
                                            ) : null}
                                        </div>
                                    </div>
                                    {errorTerminos && <div className="validation-error" style={{ marginTop: '-12px', marginBottom: '16px' }}>{errorTerminos}</div>}
                                    {submitError && <div className="validation-error" style={{ marginBottom: '16px' }}>{submitError}</div>}
                                    {submitSuccess && <div className="validation-success" style={{ marginBottom: '16px' }}>Cuenta creada correctamente. Redirigiendo...</div>}

                                    <button type="submit" className="btn-primary" disabled={!aceptaTerminos || loading}>
                                        {loading ? 'Creando cuenta...' : 'Crear cuenta'}
                                    </button>
                                </form>
                            ) : (
                                <form className="auth-form" onSubmit={handleSubmit}>
                                    <div className="form-group">
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Nombre completo"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
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
                                            onChange={(e) => setUsername(e.target.value)}
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
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Número de tarjeta profesional"
                                            value={numeroOperador}
                                            onChange={(e) => setNumeroOperador(e.target.value)}
                                            required
                                        />
                                    </div>

                                    <div className="form-group password-group">
                                        <input
                                            type={mostrarContrasena ? 'text' : 'password'}
                                            className="form-input"
                                            placeholder="Contraseña"
                                            value={contrasena}
                                            onChange={handleContrasenaChange}
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="password-toggle"
                                            onClick={() => setMostrarContrasena(!mostrarContrasena)}
                                        >
                                            {mostrarContrasena ? (
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
                                        {errorContrasena && <div className="validation-error">{errorContrasena}</div>}
                                    </div>

                                    <div className="form-group password-group">
                                        <input
                                            type={mostrarConfirmar ? 'text' : 'password'}
                                            className="form-input"
                                            placeholder="Confirmar contraseña"
                                            value={confirmarContrasena}
                                            onChange={handleConfirmarChange}
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="password-toggle"
                                            onClick={() => setMostrarConfirmar(!mostrarConfirmar)}
                                        >
                                            {mostrarConfirmar ? (
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
                                        {errorConfirmar && <div className="validation-error">{errorConfirmar}</div>}
                                    </div>

                                    <div className="terms-checkbox">
                                        <input
                                            type="checkbox"
                                            id="terms"
                                            checked={aceptaTerminos}
                                            disabled={!hasOpenedTerms || !hasOpenedPrivacy}
                                            onChange={(e) => {
                                                setAceptaTerminos(e.target.checked);
                                                setErrorTerminos('');
                                            }}
                                        />
                                        <div className="terms-text-wrapper">
                                            <label htmlFor="terms">
                                                Confirmo haber leído y acepto los{' '}
                                                <a href="#" className="link-highlight" onClick={(e) => { e.preventDefault(); setShowTerms(true); setHasOpenedTerms(true); }}>Términos de uso</a>
                                                {' '}y{' '}
                                                <a href="#" className="link-highlight" onClick={(e) => { e.preventDefault(); setShowPrivacy(true); setHasOpenedPrivacy(true); }}>Políticas de privacidad</a>
                                            </label>
                                            {!hasOpenedTerms || !hasOpenedPrivacy ? (
                                                <p className="checkbox-hint">Por favor, lee los términos de uso y las políticas de privacidad antes de continuar</p>
                                            ) : null}
                                        </div>
                                    </div>
                                    {errorTerminos && <div className="validation-error" style={{ marginTop: '-12px', marginBottom: '16px' }}>{errorTerminos}</div>}
                                    {submitError && <div className="validation-error" style={{ marginBottom: '16px' }}>{submitError}</div>}
                                    {submitSuccess && <div className="validation-success" style={{ marginBottom: '16px' }}>Cuenta creada correctamente. Redirigiendo...</div>}

                                    <button type="submit" className="btn-primary" disabled={!aceptaTerminos || loading}>
                                        {loading ? 'Creando cuenta...' : 'Crear cuenta'}
                                    </button>
                                </form>
                            )}
                        </div>
                    )}

                    <div className="version-footer">
                        cognIA v1.0.0
                    </div>

                    {/* Modals para términos y privacidad */}
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
