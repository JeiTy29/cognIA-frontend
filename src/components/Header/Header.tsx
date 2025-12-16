import './Header.css';

export default function Header() {
    return (
        <header className="header">
            <div className="logo">cognIA</div>

            <nav className="nav">
                <span className="active">Nuestro Sistema</span>
                <span>Sobre Nosotros</span>
                <span>Trastornos</span>
            </nav>

            <div className="auth-buttons">
                <button className="login">Iniciar sesión</button>
                <button className="register">Registrarse</button>
            </div>
        </header>
    );
}
