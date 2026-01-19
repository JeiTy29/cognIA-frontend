import { Link } from 'react-router-dom';
import './Login.css';

export default function Login() {
    return (
        <div className="login-container">
            <div className="login-left-panel">
                {/* Left panel with light blue background - image placeholder */}
            </div>

            <div className="login-right-panel">
                <div className="login-content">
                    <div className="login-header">
                        <div className="logo-container">
                            <div className="logo-icon"></div>
                            <span className="system-name">cognIA</span>
                        </div>
                    </div>

                    <h1 className="login-title">Iniciar sesión</h1>

                    <p className="login-subtitle">
                        ¿Aún no tienes una cuenta?{' '}
                        <Link to="/register" className="link-highlight">Regístrate</Link>
                    </p>

                    <form className="login-form">
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

                        <button type="submit" className="btn-primary">
                            Ingresar
                        </button>

                        <Link to="/forgot-password" className="forgot-password-link">
                            ¿Olvidaste tu contraseña?
                        </Link>
                    </form>

                    <div className="version-footer">
                        cognIA v1.0.0
                    </div>
                </div>
            </div>
        </div>
    );
}
