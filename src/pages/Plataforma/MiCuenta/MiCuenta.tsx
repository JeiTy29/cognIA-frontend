import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Modal } from '../../../components/Modal/Modal';
import { TermsContent } from '../../Inicio/Terms/Terms';
import { PrivacyContent } from '../../Inicio/Privacy/Privacy';
import { validatePassword } from '../../../utils/passwordValidation';
import './MiCuenta.css';

type AccountRole = 'padre' | 'psicologo';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function MiCuenta() {
    const navigate = useNavigate();
    const location = useLocation();
    const role: AccountRole = location.pathname.includes('/psicologo') ? 'psicologo' : 'padre';
    const correo = role === 'psicologo' ? 'psicologo@cognia.com' : 'tutor@cognia.com';
    const nombre = role === 'psicologo' ? 'Dra. Camila Pérez' : undefined;
    const [openPanel, setOpenPanel] = useState<'correo' | 'contrasena' | null>(null);
    const [showTerms, setShowTerms] = useState(false);
    const [showPrivacy, setShowPrivacy] = useState(false);

    const [nuevoCorreo, setNuevoCorreo] = useState('');
    const [confirmarCorreo, setConfirmarCorreo] = useState('');
    const [passwordCorreo, setPasswordCorreo] = useState('');
    const [emailSaved, setEmailSaved] = useState(false);

    const [contrasenaActual, setContrasenaActual] = useState('');
    const [nuevaContrasena, setNuevaContrasena] = useState('');
    const [confirmarNueva, setConfirmarNueva] = useState('');
    const [mostrarActual, setMostrarActual] = useState(false);
    const [mostrarNueva, setMostrarNueva] = useState(false);
    const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
    const [passwordSaved, setPasswordSaved] = useState(false);

    const tipoCuenta = role === 'psicologo' ? 'Psicólogo' : 'Padre o tutor';
    const soportePath = role === 'psicologo' ? '/psicologo/soporte' : '/padre/soporte';

    useEffect(() => {
        if (openPanel !== 'correo') {
            setEmailSaved(false);
        }
        if (openPanel !== 'contrasena') {
            setPasswordSaved(false);
        }
    }, [openPanel]);

    const emailError = useMemo(() => {
        if (!nuevoCorreo) return '';
        return emailPattern.test(nuevoCorreo) ? '' : 'Ingresa un correo válido.';
    }, [nuevoCorreo]);

    const confirmEmailError = useMemo(() => {
        if (!confirmarCorreo) return '';
        return nuevoCorreo === confirmarCorreo ? '' : 'Los correos no coinciden.';
    }, [nuevoCorreo, confirmarCorreo]);

    const passwordCorreoError = useMemo(() => {
        if (!passwordCorreo && (nuevoCorreo || confirmarCorreo)) {
            return 'Ingresa tu contraseña actual.';
        }
        return '';
    }, [passwordCorreo, nuevoCorreo, confirmarCorreo]);

    const canSaveEmail =
        emailPattern.test(nuevoCorreo) &&
        confirmarCorreo.length > 0 &&
        nuevoCorreo === confirmarCorreo &&
        passwordCorreo.trim().length > 0;

    const nuevaContrasenaError = useMemo(() => {
        if (!nuevaContrasena) return '';
        return validatePassword(nuevaContrasena);
    }, [nuevaContrasena]);

    const confirmarContrasenaError = useMemo(() => {
        if (!confirmarNueva) return '';
        return nuevaContrasena === confirmarNueva ? '' : 'Las contraseñas no coinciden.';
    }, [nuevaContrasena, confirmarNueva]);

    const contrasenaActualError = useMemo(() => {
        if (!contrasenaActual && (nuevaContrasena || confirmarNueva)) {
            return 'Ingresa tu contraseña actual.';
        }
        return '';
    }, [contrasenaActual, nuevaContrasena, confirmarNueva]);

    const canSavePassword =
        !!contrasenaActual &&
        !!nuevaContrasena &&
        !!confirmarNueva &&
        !nuevaContrasenaError &&
        !confirmarContrasenaError &&
        nuevaContrasena === confirmarNueva;

    const togglePanel = (panel: 'correo' | 'contrasena') => {
        setOpenPanel((prev) => (prev === panel ? null : panel));
    };

    const handleEmailSubmit = (event: FormEvent) => {
        event.preventDefault();
        if (!canSaveEmail) return;
        setEmailSaved(true);
    };

    const handlePasswordSubmit = (event: FormEvent) => {
        event.preventDefault();
        if (!canSavePassword) return;
        setPasswordSaved(true);
    };

    const handleLogout = () => {
        navigate('/inicio-sesion');
    };

    return (
        <div className="mi-cuenta-container">
            <h1 className="mi-cuenta-title">Mi cuenta</h1>

            <div className="mi-cuenta-grid">
                <section className="info-card mi-cuenta-section">
                    <h2 className="mi-cuenta-section-title">Información de la cuenta</h2>
                    <div className="mi-cuenta-field">
                        <span className="mi-cuenta-label">Tipo de cuenta</span>
                        <span className="mi-cuenta-value">{tipoCuenta}</span>
                    </div>
                    {role === 'psicologo' && (
                        <div className="mi-cuenta-field">
                            <span className="mi-cuenta-label">Nombre</span>
                            <span className="mi-cuenta-value">{nombre || 'Nombre del psicólogo'}</span>
                        </div>
                    )}
                    <div className="mi-cuenta-field">
                        <span className="mi-cuenta-label">Correo</span>
                        <span className="mi-cuenta-value">{correo}</span>
                    </div>
                </section>

                <section className="info-card mi-cuenta-section">
                    <h2 className="mi-cuenta-section-title">Seguridad</h2>
                    <p className="mi-cuenta-section-note">Actualiza tu correo o tu contraseña de acceso.</p>

                    <button
                        type="button"
                        className={`mi-cuenta-toggle ${openPanel === 'correo' ? 'is-open' : ''}`}
                        onClick={() => togglePanel('correo')}
                        aria-expanded={openPanel === 'correo'}
                        aria-controls="panel-correo"
                    >
                        <span>Cambiar correo</span>
                        <span className="mi-cuenta-toggle-icon" aria-hidden="true">
                            {openPanel === 'correo' ? <ChevronIcon /> : <EditIcon />}
                        </span>
                    </button>
                    <div
                        id="panel-correo"
                        className={`mi-cuenta-panel ${openPanel === 'correo' ? 'is-open' : ''}`}
                    >
                        <div className="mi-cuenta-panel-inner">
                            <form className="mi-cuenta-form" onSubmit={handleEmailSubmit}>
                                <label className="mi-cuenta-input-group">
                                    <span className="mi-cuenta-input-label">Correo actual</span>
                                    <input className="mi-cuenta-input is-readonly" type="email" value={correo} readOnly />
                                </label>
                                <label className="mi-cuenta-input-group">
                                    <span className="mi-cuenta-input-label">Nuevo correo</span>
                                    <input
                                        className="mi-cuenta-input"
                                        type="email"
                                        value={nuevoCorreo}
                                        onChange={(event) => {
                                            setNuevoCorreo(event.target.value);
                                            setEmailSaved(false);
                                        }}
                                    />
                                    {emailError && <span className="mi-cuenta-error">{emailError}</span>}
                                </label>
                                <label className="mi-cuenta-input-group">
                                    <span className="mi-cuenta-input-label">Confirmar nuevo correo</span>
                                    <input
                                        className="mi-cuenta-input"
                                        type="email"
                                        value={confirmarCorreo}
                                        onChange={(event) => {
                                            setConfirmarCorreo(event.target.value);
                                            setEmailSaved(false);
                                        }}
                                    />
                                    {confirmEmailError && <span className="mi-cuenta-error">{confirmEmailError}</span>}
                                </label>
                                <label className="mi-cuenta-input-group">
                                    <span className="mi-cuenta-input-label">Contraseña</span>
                                    <input
                                        className="mi-cuenta-input"
                                        type="password"
                                        value={passwordCorreo}
                                        onChange={(event) => {
                                            setPasswordCorreo(event.target.value);
                                            setEmailSaved(false);
                                        }}
                                    />
                                    {passwordCorreoError && <span className="mi-cuenta-error">{passwordCorreoError}</span>}
                                </label>

                                {emailSaved && (
                                    <div className="mi-cuenta-success">Cambios guardados correctamente.</div>
                                )}

                                <div className="mi-cuenta-actions">
                                    <button
                                        type="button"
                                        className="mi-cuenta-btn ghost"
                                        onClick={() => setOpenPanel(null)}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="mi-cuenta-btn primary"
                                        disabled={!canSaveEmail}
                                    >
                                        Guardar cambios
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    <button
                        type="button"
                        className={`mi-cuenta-toggle ${openPanel === 'contrasena' ? 'is-open' : ''}`}
                        onClick={() => togglePanel('contrasena')}
                        aria-expanded={openPanel === 'contrasena'}
                        aria-controls="panel-contrasena"
                    >
                        <span>Cambiar contraseña</span>
                        <span className="mi-cuenta-toggle-icon" aria-hidden="true">
                            {openPanel === 'contrasena' ? <ChevronIcon /> : <EditIcon />}
                        </span>
                    </button>
                    <div
                        id="panel-contrasena"
                        className={`mi-cuenta-panel ${openPanel === 'contrasena' ? 'is-open' : ''}`}
                    >
                        <div className="mi-cuenta-panel-inner">
                            <form className="mi-cuenta-form" onSubmit={handlePasswordSubmit}>
                                <label className="mi-cuenta-input-group">
                                    <span className="mi-cuenta-input-label">Contraseña actual</span>
                                    <div className="mi-cuenta-input-wrapper">
                                        <input
                                            className="mi-cuenta-input"
                                            type={mostrarActual ? 'text' : 'password'}
                                            value={contrasenaActual}
                                            onChange={(event) => {
                                                setContrasenaActual(event.target.value);
                                                setPasswordSaved(false);
                                            }}
                                        />
                                        <button
                                            type="button"
                                            className="mi-cuenta-toggle-visibility"
                                            onClick={() => setMostrarActual((prev) => !prev)}
                                            aria-label={mostrarActual ? 'Ocultar contraseña actual' : 'Mostrar contraseña actual'}
                                        >
                                            <VisibilityIcon isVisible={mostrarActual} />
                                        </button>
                                    </div>
                                    {contrasenaActualError && <span className="mi-cuenta-error">{contrasenaActualError}</span>}
                                </label>
                                <label className="mi-cuenta-input-group">
                                    <span className="mi-cuenta-input-label">Nueva contraseña</span>
                                    <div className="mi-cuenta-input-wrapper">
                                        <input
                                            className="mi-cuenta-input"
                                            type={mostrarNueva ? 'text' : 'password'}
                                            value={nuevaContrasena}
                                            onChange={(event) => {
                                                setNuevaContrasena(event.target.value);
                                                setPasswordSaved(false);
                                            }}
                                        />
                                        <button
                                            type="button"
                                            className="mi-cuenta-toggle-visibility"
                                            onClick={() => setMostrarNueva((prev) => !prev)}
                                            aria-label={mostrarNueva ? 'Ocultar nueva contraseña' : 'Mostrar nueva contraseña'}
                                        >
                                            <VisibilityIcon isVisible={mostrarNueva} />
                                        </button>
                                    </div>
                                    {nuevaContrasenaError && <span className="mi-cuenta-error">{nuevaContrasenaError}</span>}
                                </label>
                                <label className="mi-cuenta-input-group">
                                    <span className="mi-cuenta-input-label">Confirmar nueva contraseña</span>
                                    <div className="mi-cuenta-input-wrapper">
                                        <input
                                            className="mi-cuenta-input"
                                            type={mostrarConfirmar ? 'text' : 'password'}
                                            value={confirmarNueva}
                                            onChange={(event) => {
                                                setConfirmarNueva(event.target.value);
                                                setPasswordSaved(false);
                                            }}
                                        />
                                        <button
                                            type="button"
                                            className="mi-cuenta-toggle-visibility"
                                            onClick={() => setMostrarConfirmar((prev) => !prev)}
                                            aria-label={mostrarConfirmar ? 'Ocultar confirmación de contraseña' : 'Mostrar confirmación de contraseña'}
                                        >
                                            <VisibilityIcon isVisible={mostrarConfirmar} />
                                        </button>
                                    </div>
                                    {confirmarContrasenaError && <span className="mi-cuenta-error">{confirmarContrasenaError}</span>}
                                </label>

                                {passwordSaved && (
                                    <div className="mi-cuenta-success">Cambios guardados correctamente.</div>
                                )}

                                <div className="mi-cuenta-actions">
                                    <button
                                        type="button"
                                        className="mi-cuenta-btn ghost"
                                        onClick={() => setOpenPanel(null)}
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="mi-cuenta-btn primary"
                                        disabled={!canSavePassword}
                                    >
                                        Guardar cambios
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </section>

                <section className="info-card mi-cuenta-section">
                    <h2 className="mi-cuenta-section-title">Legal</h2>
                    <div className="mi-cuenta-legal">
                        <button type="button" className="mi-cuenta-link" onClick={() => setShowPrivacy(true)}>
                            Política de privacidad
                        </button>
                        <button type="button" className="mi-cuenta-link" onClick={() => setShowTerms(true)}>
                            Términos de uso
                        </button>
                    </div>
                </section>

                <section className="info-card mi-cuenta-section">
                    <h2 className="mi-cuenta-section-title">Ayuda / Soporte</h2>
                    <p className="mi-cuenta-section-note">
                        ¿Necesitas ayuda o quieres reportar un problema? Escríbenos desde la sección de soporte.
                    </p>
                    <Link to={soportePath} className="mi-cuenta-btn primary mi-cuenta-support-btn">
                        Ir a soporte
                    </Link>
                </section>
            </div>

            <div className="mi-cuenta-logout">
                <span>¿Quieres salir de tu cuenta?</span>
                <button type="button" className="mi-cuenta-btn ghost" onClick={handleLogout}>
                    Cerrar sesión
                </button>
            </div>

            <Modal isOpen={showTerms} onClose={() => setShowTerms(false)}>
                <TermsContent />
            </Modal>
            <Modal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)}>
                <PrivacyContent />
            </Modal>
        </div>
    );
}

interface VisibilityIconProps {
    isVisible: boolean;
}

function VisibilityIcon({ isVisible }: VisibilityIconProps) {
    return isVisible ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5c4.97 0 9.27 3.03 11 7-1.73 3.97-6.03 7-11 7S2.73 15.97 1 12c1.73-3.97 6.03-7 11-7Zm0 2C8.14 7 4.83 9.46 3.2 12c1.63 2.54 4.94 5 8.8 5s7.17-2.46 8.8-5c-1.63-2.54-4.94-5-8.8-5Zm0 2.5a2.5 2.5 0 1 1-2.5 2.5A2.5 2.5 0 0 1 12 9.5Z" />
        </svg>
    ) : (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m4.27 3 16.73 16.73-1.27 1.27-3.06-3.06A11.85 11.85 0 0 1 12 19C7.03 19 2.73 15.97 1 12a12.7 12.7 0 0 1 4.16-4.95L3 4.27 4.27 3Zm7.73 4A5 5 0 0 1 17 12a5 5 0 0 1-.59 2.4l-1.51-1.51A3 3 0 0 0 12 9c-.27 0-.54.04-.79.1L9.68 7.57A4.98 4.98 0 0 1 12 7Zm-7 5a10.46 10.46 0 0 0 2.97 3.2A9.77 9.77 0 0 0 12 17a9.7 9.7 0 0 0 3.32-.6l-1.6-1.6a5 5 0 0 1-5.92-5.92L5 12Z" />
        </svg>
    );
}

function EditIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 17.25V20h2.75L17.81 8.94l-2.75-2.75L4 17.25Zm14.71-9.04a1 1 0 0 0 0-1.41l-1.5-1.5a1 1 0 0 0-1.41 0l-1.17 1.17 2.75 2.75 1.33-1.01Z" />
        </svg>
    );
}

function ChevronIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m7.41 14.59 4.59-4.59 4.59 4.59L18 13.17l-6-6-6 6z" />
        </svg>
    );
}
