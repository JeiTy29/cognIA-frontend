import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Registro.css';

type TipoUsuario = 'padre' | 'psicologo' | null;

export default function Registro() {
    const navigate = useNavigate();
    const [rolSeleccionado, setRolSeleccionado] = useState<TipoUsuario>(null);
    const [aceptaTerminos, setAceptaTerminos] = useState(false);

    // Estados de formulario
    const [nombre, setNombre] = useState('');
    const [apellido, setApellido] = useState('');
    const [email, setEmail] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [confirmarContrasena, setConfirmarContrasena] = useState('');
    const [mostrarContrasena, setMostrarContrasena] = useState(false);
    const [mostrarConfirmar, setMostrarConfirmar] = useState(false);

    // Estados de validación
    const [errorContrasena, setErrorContrasena] = useState('');
    const [errorConfirmar, setErrorConfirmar] = useState('');
    const [errorTerminos, setErrorTerminos] = useState('');

    // Cargar datos guardados al volver de terms/privacy
    useEffect(() => {
        const savedData = sessionStorage.getItem('registroFormData');
        if (savedData) {
            const data = JSON.parse(savedData);
            setRolSeleccionado(data.rol);
            setNombre(data.nombre || '');
            setApellido(data.apellido || '');
            setEmail(data.email || '');
            setContrasena(data.contrasena || '');
            setConfirmarContrasena(data.confirmarContrasena || '');
            setAceptaTerminos(data.aceptaTerminos || false);
        }
    }, []);

    // Guardar datos antes de navegar a terms/privacy
    const handleTermsClick = () => {
        const formData = {
            rol: rolSeleccionado,
            nombre,
            apellido,
            email,
            contrasena,
            confirmarContrasena,
            aceptaTerminos
        };
        sessionStorage.setItem('registroFormData', JSON.stringify(formData));
    };

    // Limpiar datos al enviar formulario exitosamente
    const clearFormData = () => {
        sessionStorage.removeItem('registroFormData');
    };

    const validarContrasena = (pass: string): string => {
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
    };

    const handleContrasenaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const valor = e.target.value;
        setContrasena(valor);
        setErrorContrasena(validarContrasena(valor));

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
        setNombre('');
        setApellido('');
        setEmail('');
        setContrasena('');
        setConfirmarContrasena('');
        setErrorContrasena('');
        setErrorConfirmar('');
        setErrorTerminos('');
        setAceptaTerminos(false);
        sessionStorage.removeItem('registroFormData');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Validar términos
        if (!aceptaTerminos) {
            setErrorTerminos('Debes aceptar los términos de uso y políticas de privacidad');
            return;
        }

        // Validar contraseña
        const errorPass = validarContrasena(contrasena);
        if (errorPass) {
            setErrorContrasena(errorPass);
            return;
        }

        // Validar coincidencia
        if (contrasena !== confirmarContrasena) {
            setErrorConfirmar('Las contraseñas no coinciden');
            return;
        }

        // Todo válido, limpiar datos y navegar a activación
        clearFormData();
        navigate('/activar-cuenta');
    };

    return (
        <div className="auth-container">
            <div className="auth-left-panel"></div>

            <div className="auth-right-panel">
                <div className="auth-content">
                    <Link to="/" className="auth-logo-link">
                        <div className="auth-header">
                            <div className="auth-logo-icon"></div>
                            <span className="auth-system-name">cognIA</span>
                        </div>
                    </Link>

                    <h1 className="auth-title">Regístrate</h1>

                    <p className="auth-subtitle">
                        ¿Ya tienes una cuenta?{' '}
                        <Link to="/inicio-sesion" className="link-highlight">Inicia sesión</Link>
                    </p>

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
                                            type={mostrarContrasena ? "text" : "password"}
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
                                            type={mostrarConfirmar ? "text" : "password"}
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
                                            onChange={(e) => {
                                                setAceptaTerminos(e.target.checked);
                                                setErrorTerminos('');
                                            }}
                                        />
                                        <label htmlFor="terms">
                                            Confirmo haber leído los{' '}
                                            <Link to="/terms?from=registro" className="link-highlight" onClick={handleTermsClick}>Términos de uso</Link>
                                            {' '}y{' '}
                                            <Link to="/privacy?from=registro" className="link-highlight" onClick={handleTermsClick}>Políticas de privacidad</Link>
                                        </label>
                                    </div>
                                    {errorTerminos && <div className="validation-error" style={{ marginTop: '-12px', marginBottom: '16px' }}>{errorTerminos}</div>}

                                    <button type="submit" className="btn-primary">
                                        Crear cuenta
                                    </button>
                                </form>
                            ) : (
                                <form className="auth-form" onSubmit={handleSubmit}>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="Nombre"
                                                value={nombre}
                                                onChange={(e) => setNombre(e.target.value)}
                                                required
                                            />
                                        </div>

                                        <div className="form-group">
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="Apellido"
                                                value={apellido}
                                                onChange={(e) => setApellido(e.target.value)}
                                                required
                                            />
                                        </div>
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
                                            type={mostrarContrasena ? "text" : "password"}
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
                                            type={mostrarConfirmar ? "text" : "password"}
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
                                            onChange={(e) => {
                                                setAceptaTerminos(e.target.checked);
                                                setErrorTerminos('');
                                            }}
                                        />
                                        <label htmlFor="terms">
                                            Confirmo haber leído los{' '}
                                            <Link to="/terms?from=registro" className="link-highlight" onClick={handleTermsClick}>Términos de uso</Link>
                                            {' '}y{' '}
                                            <Link to="/privacy?from=registro" className="link-highlight" onClick={handleTermsClick}>Políticas de privacidad</Link>
                                        </label>
                                    </div>
                                    {errorTerminos && <div className="validation-error" style={{ marginTop: '-12px', marginBottom: '16px' }}>{errorTerminos}</div>}

                                    <button type="submit" className="btn-primary">
                                        Crear cuenta
                                    </button>
                                </form>
                            )}
                        </div>
                    )}

                    <div className="version-footer">
                        cognIA v1.0.0
                    </div>
                </div>
            </div>
        </div>
    );
}
