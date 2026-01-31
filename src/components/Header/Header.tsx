import { Link } from 'react-router-dom';
import './Header.css';
import { useAuth } from '../../hooks/auth/useAuth';
import { getDefaultRouteForRoles } from '../../utils/auth/roles';

export default function Header() {
    const { isAuthenticated, roles } = useAuth();
    const platformRoute = getDefaultRouteForRoles(roles);

    return (
        <header className="header">
            <Link to="/" className="logo">cognIA</Link>

            <nav className="nav">
                <Link to="/nuestro-sistema" className="nav-link">Nuestro Sistema</Link>
                <Link to="/sobre-nosotros" className="nav-link">Sobre Nosotros</Link>
                <Link to="/trastornos" className="nav-link">Trastornos</Link>
            </nav>

            <div className="auth-buttons">
                {isAuthenticated ? (
                    <Link to={platformRoute}>
                        <button className="register">Empezar cuestionario</button>
                    </Link>
                ) : (
                    <>
                        <Link to="/inicio-sesion">
                            <button className="login">Iniciar sesión</button>
                        </Link>
                        <Link to="/registro">
                            <button className="register">Registrarse</button>
                        </Link>
                    </>
                )}
            </div>
        </header>
    );
}
