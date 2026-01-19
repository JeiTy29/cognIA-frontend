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

                <h1 className="privacy-title">Políticas de Privacidad</h1>
                <p className="privacy-subtitle">Protegemos tu información personal</p>

                <div className="content-card">
                    <p>
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                        Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                        Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
                    </p>
                    <p>
                        Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
                        Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam,
                        eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
                    </p>
                    <p>
                        Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione
                        voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit,
                        sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.
                    </p>
                </div>
            </div>
        </div>
    );
}
