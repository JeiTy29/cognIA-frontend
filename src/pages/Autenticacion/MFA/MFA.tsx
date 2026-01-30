import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import './MFA.css';

type MFAMode = 'setup' | 'challenge';

export default function MFA() {
    const [codigo, setCodigo] = useState('');
    const { mode: modeParam } = useParams();
    const mode: MFAMode = useMemo(() => (modeParam === 'setup' ? 'setup' : 'challenge'), [modeParam]);
    const navigate = useNavigate();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        navigate('/padre/cuestionario');
    };

    return (
        <div className={`auth-container auth-2fa auth-mfa auth-mfa-${mode}`}>
            <div className="auth-left-panel"></div>

            <div className="auth-right-panel">
                <div className="auth-content">
                    <div className="header-brand">
                        <Link to="/" className="brand-link">
                            <div className="brand-icon">c</div>
                            <span className="brand-text">cognIA</span>
                        </Link>
                    </div>

                    <h1 className="auth-title">
                        {mode === 'setup' ? 'Configurar verificación en dos pasos' : 'Verificación requerida'}
                    </h1>

                    {mode === 'setup' ? (
                        <>
                            <p className="auth-subtitle">
                                Escanea el código QR con tu aplicación de autenticación y escribe el código de 6 dígitos.
                            </p>
                            <div className="qr-card">
                                <div className="qr-placeholder">QR</div>
                            </div>
                        </>
                    ) : (
                        <p className="auth-subtitle">
                            Ingresa el código de 6 dígitos de tu aplicación de autenticación.
                        </p>
                    )}

                    <form className="auth-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <input
                                type="text"
                                className="form-input auth-code-input"
                                placeholder="Código de 6 dígitos"
                                inputMode="numeric"
                                maxLength={6}
                                value={codigo}
                                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                                required
                            />
                        </div>

                        <button type="submit" className="btn-primary">
                            {mode === 'setup' ? 'Confirmar' : 'Verificar'}
                        </button>
                    </form>
                    {mode === 'setup' ? (
                        <p className="auth-mfa-note">
                            Si no puedes escanear el QR, utiliza la app para ingresar manualmente el código.
                        </p>
                    ) : null}

                    <div className="version-footer">
                        cognIA v1.0.0
                    </div>
                </div>
            </div>
        </div>
    );
}
