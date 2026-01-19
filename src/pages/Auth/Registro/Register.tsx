import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Register.css';

type UserRole = 'parent' | 'psychologist' | null;

export default function Register() {
    const [selectedRole, setSelectedRole] = useState<UserRole>(null);

    const handleRoleSelect = (role: UserRole) => {
        setSelectedRole(role);
    };

    return (
        <div className="register-container">
            <div className="register-content">
                <div className="register-header">
                    <div className="logo-container">
                        <div className="logo-icon"></div>
                        <span className="system-name">cognIA</span>
                    </div>
                </div>

                <h1 className="register-title">Regístrate</h1>

                <p className="register-subtitle">
                    ¿Ya tienes una cuenta?{' '}
                    <Link to="/login" className="link-highlight">Inicia sesión</Link>
                </p>

                {!selectedRole ? (
                    <div className="role-selection">
                        <div
                            className="role-card"
                            onClick={() => handleRoleSelect('parent')}
                        >
                            <div className="role-image-placeholder"></div>
                            <h3 className="role-text">Soy padre o docente</h3>
                        </div>

                        <div
                            className="role-card"
                            onClick={() => handleRoleSelect('psychologist')}
                        >
                            <div className="role-image-placeholder"></div>
                            <h3 className="role-text">Soy psicólogo</h3>
                        </div>
                    </div>
                ) : (
                    <div className="form-container">
                        <button
                            className="back-button"
                            onClick={() => setSelectedRole(null)}
                        >
                            ← Cambiar rol
                        </button>

                        {selectedRole === 'parent' ? (
                            <form className="register-form">
                                <div className="form-group">
                                    <input
                                        type="email"
                                        className="form-input"
                                        placeholder="Correo electrónico"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <input
                                        type="password"
                                        className="form-input"
                                        placeholder="Contraseña"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <input
                                        type="password"
                                        className="form-input"
                                        placeholder="Confirmar contraseña"
                                        required
                                    />
                                </div>

                                <button type="submit" className="btn-primary">
                                    Registrarse
                                </button>
                            </form>
                        ) : (
                            <form className="register-form">
                                <div className="form-row">
                                    <div className="form-group">
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Nombre"
                                            required
                                        />
                                    </div>

                                    <div className="form-group">
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Apellido"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <input
                                        type="email"
                                        className="form-input"
                                        placeholder="Correo electrónico"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <input
                                        type="password"
                                        className="form-input"
                                        placeholder="Contraseña"
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <input
                                        type="password"
                                        className="form-input"
                                        placeholder="Confirmar contraseña"
                                        required
                                    />
                                </div>

                                <button type="submit" className="btn-primary">
                                    Registrarse
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
    );
}
