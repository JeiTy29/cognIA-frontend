import './SobreNosotros.css';
import udecLogo from '../../../assets/Iconos/SobreNosotros/UDEC.png';

export default function SobreNosotros() {
    return (
        <div className="sobre-nosotros-container">
            <section className="team-section">
                <h2 className="section-title">Equipo de desarrollo</h2>
                <div className="team-description">
                    <p>
                        Somos un equipo académico de la Universidad de Cundinamarca (Extensión Facatativá), integrado por dos estudiantes de Ingeniería de Software y nuestro director de tesis. Nuestro objetivo es desarrollar una herramienta web que, a partir de un cuestionario y un modelo de aprendizaje automático, genere alertas tempranas que apoyen a padres, tutores y profesionales en la toma de decisiones.
                   </p>
                </div>

                <div className="team-grid">
                    {/* Developer 1 */}
                    <div className="team-card info-card">
                        <h3 className="dev-name">Oscar Gomez</h3>
                        <div className="dev-image-placeholder">
                            <span>Foto</span>
                        </div>
                        <div className="dev-info">
                            <p className="dev-role">Director</p>
                            <p className="dev-age">xx años</p>
                            <p className="dev-location">Facatativá, Colombia</p>
                        </div>
                    </div>

                    {/* Developer 2 */}
                    <div className="team-card info-card">
                        <h3 className="dev-name">Andres Melo</h3>
                        <div className="dev-image-placeholder">
                            <span>Foto</span>
                        </div>
                        <div className="dev-info">
                            <p className="dev-role">Desarrollador Backend</p>
                            <p className="dev-age">21 años</p>
                            <p className="dev-location">Subachoque, Colombia</p>
                        </div>
                    </div>

                    {/* Developer 3 */}
                    <div className="team-card info-card">
                        <h3 className="dev-name">Thomas Cristancho</h3>
                        <div className="dev-image-placeholder">
                            <span>Foto</span>
                        </div>
                        <div className="dev-info">
                            <p className="dev-role">Desarrollador Frontend</p>
                            <p className="dev-age">20 años</p>
                            <p className="dev-location">Mosquera, Colombia</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="contact-section">
                <h2 className="section-title">Contáctanos</h2>
                <div className="contact-grid">
                    {/* University Info */}
                    <div className="contact-card info-card">
                        <h3>Universidad de Cundinamarca - Sede Facatativá</h3>
                        <div className="university-logo-placeholder">
                            <img className="university-logo" src={udecLogo} alt="Logo Universidad de Cundinamarca" />
                        </div>
                        <div className="contact-details">
                            <p><strong>Email:</strong> info@ucundinamarca.edu.co</p>
                            <p><strong>Teléfono:</strong> (601) 892 0706</p>
                            <p><strong>Dirección:</strong> Calle 14 con Avenida 15, Facatativá</p>
                        </div>
                    </div>

                    {/* CognIA Info */}
                    <div className="contact-card info-card">
                        <h3>Equipo cognIA</h3>
                        <div className="cognia-logo-placeholder">
                            <span>Logo cognIA</span>
                        </div>
                        <div className="contact-details">
                            <p><strong>Email:</strong> contacto@cognia.com</p>
                            <p><strong>Teléfono:</strong> +57 300 123 4567</p>
                            <p><strong>Dirección:</strong> [Dirección del equipo]</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}


