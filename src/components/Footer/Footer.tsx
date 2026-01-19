import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
    return (
        <footer className="footer">
            <div className="footer-content">
                <p className="footer-copyright">
                    © 2025 cognIA - Universidad de Cundinamarca
                </p>
                <div className="footer-links">
                    <Link to="/privacy" className="footer-link">
                        Políticas de privacidad
                    </Link>
                    <Link to="/terms" className="footer-link">
                        Términos de uso
                    </Link>
                </div>
            </div>
        </footer>
    );
}
