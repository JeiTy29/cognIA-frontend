import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Privacy.css';

export default function Privacy() {
    const location = useLocation();
    const navigate = useNavigate();
    const fromRegistro = location.search.includes('from=registro');

    return (
        <div className="privacy-page">
            <div className="privacy-container">

                {fromRegistro && (
                    <button
                        onClick={() => navigate(-1)}
                        className="back-to-form-button"
                        title="Volver al formulario"
                    >
                        ← Volver al formulario de registro
                    </button>
                )}

                <PrivacyContent />

                {/* Enlace de navegación inferior */}
                <div className="privacy-actions">
                    <Link to="/" className="back-home-link">
                        ← Volver al inicio
                    </Link>
                </div>

            </div>
        </div>
    );
}

export function PrivacyContent() {
    return (
        <>
            <h1 className="privacy-title">Políticas de Privacidad</h1>
            <p className="privacy-subtitle">Protegemos tu información personal</p>

            <div className="content-card">
                <p>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit...
                </p>

                <p>
                    Puedes consultar también nuestros{' '}
                    <Link to="/terms" className="privacy-link">
                        Términos y Condiciones
                    </Link>.
                </p>
            </div>
        </>
    );
}
