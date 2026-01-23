import './Header.css';

export default function Header() {
    return (
        <header className="header">
            <div className="logo">cognIA</div>

            <nav className="nav">
                <a href="/" className="nav-link">Nuestro Sistema</a>
                <a href="/sobre-nosotros" className="nav-link">Sobre Nosotros</a>
                <a href="/trastornos" className="nav-link">Trastornos</a>
            </nav>

            <div className="auth-buttons">
                <a href="/inicio-sesion">
                    <button className="login">Iniciar sesión</button>
                </a>
                <a href="/registro">
                    <button className="register">Registrarse</button>
                </a>
            </div>
        </header>
    );
}
