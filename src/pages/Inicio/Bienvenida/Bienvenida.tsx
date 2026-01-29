import { Link } from 'react-router-dom';
import './Bienvenida.css';

export default function BienvenidaInicio() {
    return (
        <main className="bienvenida-page">
            <div className="blueArea" aria-hidden="true">
                <div className="waveLayer waveLayer--1" />
                <div className="waveLayer waveLayer--2" />
                <div className="waveLayer waveLayer--3" />
            </div>

            <div className="bienvenida-content">
                <div className="bienvenida-brand">
                    <div className="logo-placeholder">Logo aqu&iacute;</div>
                    <span className="brand-text">cognIA</span>
                </div>

                <h1 className="bienvenida-title">&iexcl;Bienvenido!</h1>
                <p className="bienvenida-description">
                    CognIA es un aplicativo web que, a partir de un cuestionario sobre el comportamiento de ni&ntilde;os de 6 a 11 a&ntilde;os,
                    utiliza Random Forest para generar una alerta temprana sobre la posible presencia de cinco trastornos frecuentes. La herramienta
                    no diagnostica: busca apoyar a padres, docentes y profesionales en la identificaci&oacute;n oportuna de se&ntilde;ales para una evaluaci&oacute;n adecuada.
                </p>

                <div className="cta-grid">
                    <article className="cta-card">
                        <div className="cta-image-placeholder">Imagen aqu&iacute;</div>
                        <h2 className="cta-title">Conocer m&aacute;s</h2>
                        <p className="cta-text">
                            Explora c&oacute;mo funciona el sistema, nuestro equipo de trabajo y los trastornos relacionados.
                        </p>
                        <Link to="/nuestro-sistema" className="cta-button">
                            <span className="cta-button-text">Explorar</span>
                            <span className="cta-button-icon">&gt;</span>
                        </Link>
                    </article>

                    <article className="cta-card">
                        <div className="cta-image-placeholder">Imagen aqu&iacute;</div>
                        <h2 className="cta-title">Empezar cuestionario</h2>
                        <p className="cta-text">
                            Inicia sesi&oacute;n para diligenciar el cuestionario y consultar tus resultados.
                        </p>
                        <Link to="/inicio-sesion" className="cta-button">
                            <span className="cta-button-text">Empezar</span>
                            <span className="cta-button-icon">&gt;</span>
                        </Link>
                    </article>
                </div>
            </div>
        </main>
    );
}
