import { useState } from 'react';
import '../../pages/Plataforma/Ayuda/Ayuda.css';
import './SupportContact.css';

const WHATSAPP_NUMBER = '0000000000';
const SUPPORT_EMAIL = 'soportecognia@gmail.com';

interface SupportContactProps {
    roleLabel: string;
    moduleLabel?: string;
}

export default function SupportContact({ roleLabel, moduleLabel }: SupportContactProps) {
    const [copied, setCopied] = useState(false);

    const whatsappMessage = `Hola, necesito ayuda con CognIA. Mi tipo de cuenta es: ${roleLabel}.`;
    const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`;

    const mailSubject = 'Soporte CognIA';
    const mailBody = `Hola, necesito ayuda con CognIA.\nTipo de cuenta: ${roleLabel}.\nMódulo: ${moduleLabel ?? 'Soporte'}.\nDescripción: `;
    const gmailLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(SUPPORT_EMAIL)}&su=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`;
    const outlookLink = `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(SUPPORT_EMAIL)}&subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`;

    const handleCopyEmail = async () => {
        try {
            await navigator.clipboard.writeText(SUPPORT_EMAIL);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
        } catch {
            setCopied(false);
        }
    };

    return (
        <div className="support-contact">
            <div className="ayuda-actions">
                <a className="ayuda-btn whatsapp" href={whatsappLink} target="_blank" rel="noreferrer">
                    Escribir por WhatsApp
                </a>
                <a className="ayuda-btn gmail" href={gmailLink} target="_blank" rel="noreferrer">
                    Escribir por Gmail
                </a>
                <a className="ayuda-btn outlook" href={outlookLink} target="_blank" rel="noreferrer">
                    Escribir por Outlook
                </a>
                <button type="button" className="ayuda-btn copy" onClick={handleCopyEmail}>
                    Copiar correo
                </button>
                {copied && <span className="ayuda-copy">Correo copiado.</span>}
            </div>
        </div>
    );
}
