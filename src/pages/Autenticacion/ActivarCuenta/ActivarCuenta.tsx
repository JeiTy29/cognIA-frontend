import { useState } from 'react';
import { Link } from 'react-router-dom';
import './ActivarCuenta.css';

export default function ActivarCuenta() {
    const [codigo, setCodigo] = useState(['', '', '', '', '', '']);

    const handleCodigoChange = (index: number, value: string) => {
        if (value.length <= 1 && /^[A-Za-z0-9]*$/.test(value)) {
            const nuevoCodigo = [...codigo];
            nuevoCodigo[index] = value.toUpperCase();
            setCodigo(nuevoCodigo);

            // Auto-focus next input
            if (value && index < 5) {
                const nextInput = document.getElementById(`codigo-${index + 1}`);
                nextInput?.focus();
            }
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !codigo[index] && index > 0) {
            const prevInput = document.getElementById(`codigo-${index - 1}`);
            prevInput?.focus();
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-left-panel"></div>

            <div className="auth-right-panel">
                <div className="auth-content">
                    <div className="header-brand">
                        <Link to="/" className="brand-link">
                            <div className="brand-icon">c</div>
                            <span className="brand-text">cognIA</span>
                        </Link>
                    </div>

                    <h1 className="auth-title">Activa tu cuenta</h1>

                    <p className="auth-support-text">
                        Para poder activar tu cuenta, escribe a continuación el código que fue enviado a tu correo electrónico
                    </p>

                    <div className="codigo-card">
                        <div className="codigo-inputs">
                            {codigo.map((digito, index) => (
                                <input
                                    key={index}
                                    id={`codigo-${index}`}
                                    type="text"
                                    maxLength={1}
                                    value={digito}
                                    onChange={(e) => handleCodigoChange(index, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(index, e)}
                                    className="codigo-input"
                                />
                            ))}
                        </div>
                    </div>

                    <button className="btn-primary">
                        Confirmar
                    </button>

                    <div className="version-footer">
                        cognIA v1.0.0
                    </div>
                </div>
            </div>
        </div>
    );
}
