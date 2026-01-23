import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Autenticacion.css';

export default function Autenticacion() {
    const [codigo, setCodigo] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
    };

    return (
        <div className="auth-container auth-2fa">
            <div className="auth-left-panel"></div>

            <div className="auth-right-panel">
                <div className="auth-content">
                    <div className="header-brand">
                        <Link to="/" className="brand-link">
                            <div className="brand-icon">c</div>
                            <span className="brand-text">cognIA</span>
                        </Link>
                    </div>

                    <h1 className="auth-title">Autenticación</h1>

                    <p className="auth-subtitle">
                        Escanea el código QR con tu app de autenticación y luego ingresa el código de 6 dígitos.
                    </p>

                    <div className="qr-card">
                        <div className="qr-placeholder">QR</div>
                    </div>

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
                            Verificar
                        </button>
                    </form>

                    <div className="version-footer">
                        cognIA v1.0.0
                    </div>
                </div>
            </div>
        </div>
    );
}
