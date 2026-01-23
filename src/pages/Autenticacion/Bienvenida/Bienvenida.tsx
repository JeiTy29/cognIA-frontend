import { Link } from 'react-router-dom';
import './Bienvenida.css';

export default function Bienvenida() {
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

                    <h1 className="auth-title">Bienvenido</h1>

                    <p className="auth-support-text">
                        Tu cuenta ya ha sido activada exitosamente. Ya puedes iniciar sesión, o volver a la página principal para conocer más sobre nosotros.
                    </p>

                    <div className="button-group-horizontal">
                        <Link to="/inicio-sesion" className="btn-primary-link">
                            <button className="btn-primary btn-login-color">
                                Iniciar sesión
                            </button>
                        </Link>

                        <Link to="/" className="btn-primary-link">
                            <button className="btn-primary btn-home-color">
                                Volver al inicio
                            </button>
                        </Link>
                    </div>

                    <div className="version-footer">
                        cognIA v1.0.0
                    </div>
                </div>
            </div>
        </div>
    );
}
