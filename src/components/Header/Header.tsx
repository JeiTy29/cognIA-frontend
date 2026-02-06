import { Link, NavLink } from 'react-router-dom';
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
                <NavLink to="/nuestro-sistema" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                    Nuestro Sistema
                </NavLink>
                <NavLink to="/sobre-nosotros" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                    Sobre Nosotros
                </NavLink>
                <NavLink to="/trastornos" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                    Trastornos
                </NavLink>
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
