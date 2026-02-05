import { useState } from 'react';
import './Footer.css';
import { Modal } from '../Modal/Modal';
import { TermsContent } from '../Legal/TermsContent';
import { PrivacyContent } from '../Legal/PrivacyContent';

export default function Footer() {
    const [showTerms, setShowTerms] = useState(false);
    const [showPrivacy, setShowPrivacy] = useState(false);

    return (
        <footer className="footer">
            <div className="footer-content">
                <p className="footer-copyright">
                    &copy; 2026 cognIA - Universidad de Cundinamarca
                </p>
                <p className="footer-contact">
                    Soporte: <a href="mailto:soportecognia@gmail.com">soportecognia@gmail.com</a>
                </p>
                <div className="footer-links">
                    <button type="button" className="footer-link" onClick={() => setShowPrivacy(true)}>
                        Pol&iacute;ticas de privacidad
                    </button>
                    <button type="button" className="footer-link" onClick={() => setShowTerms(true)}>
                        T&eacute;rminos de uso
                    </button>
                </div>
            </div>

            <Modal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)}>
                <PrivacyContent />
            </Modal>
            <Modal isOpen={showTerms} onClose={() => setShowTerms(false)}>
                <TermsContent />
            </Modal>
        </footer>
    );
}
