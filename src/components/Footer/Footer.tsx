import { Link } from 'react-router-dom';
import './Footer.css';

export default function Footer() {
    return (
        <footer className="footer">
            <div className="footer-content">
                <p className="footer-copyright">
                    © 2026 cognIA - Universidad de Cundinamarca
                </p>
                <p className="footer-contact">
                    Contacto: <a href="mailto:contacto@cognia.edu.co">contacto@cognia.edu.co</a>
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
