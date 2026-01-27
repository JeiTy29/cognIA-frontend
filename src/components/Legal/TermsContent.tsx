import './LegalContent.css';

export function TermsContent() {
    return (
        <>
            <h1 className="terms-title">T&eacute;rminos de Uso</h1>
            <p className="terms-subtitle">Condiciones de uso del servicio CognIA</p>

            <div className="content-card">
                <p>
                    CognIA es una herramienta de apoyo que genera alertas tempranas a partir de cuestionarios. El sistema no reemplaza
                    una evaluaci&oacute;n cl&iacute;nica ni emite diagn&oacute;sticos.
                </p>
                <p>
                    El uso de la plataforma implica el compromiso de brindar informaci&oacute;n veraz y de respetar la confidencialidad de los
                    datos consultados. Cada cuenta tiene acceso &uacute;nicamente a la informaci&oacute;n que le corresponde.
                </p>
                <p>
                    La plataforma puede actualizarse para mejorar su funcionamiento. Te recomendamos revisar peri&oacute;dicamente estos
                    t&eacute;rminos para conocer cualquier cambio relevante.
                </p>
            </div>
        </>
    );
}
