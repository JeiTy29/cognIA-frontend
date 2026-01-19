import { Link } from 'react-router-dom';
import './Header.css';

export default function Header() {
    return (
        <header className="header">
            <div className="logo">cognIA</div>

            <nav className="nav">
                <Link to="/" className="nav-link">Nuestro Sistema</Link>
                <Link to="/sobre-nosotros" className="nav-link">Sobre Nosotros</Link>
                <Link to="/trastornos" className="nav-link">Trastornos</Link>
            </nav>

            <div className="auth-buttons">
                <Link to="/inicio-sesion">
                    <button className="login">Iniciar sesión</button>
                </Link>
                <Link to="/registro">
                    <button className="register">Registrarse</button>
                </Link>
            </div>
        </header>
    );
}
