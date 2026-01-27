import './LegalContent.css';

export function PrivacyContent() {
    return (
        <>
            <h1 className="privacy-title">Pol&iacute;ticas de Privacidad</h1>
            <p className="privacy-subtitle">Protegemos tu informaci&oacute;n personal</p>

            <div className="content-card">
                <p>
                    En CognIA recopilamos &uacute;nicamente la informaci&oacute;n necesaria para evaluar patrones de comportamiento y generar
                    una alerta temprana. No solicitamos datos que identifiquen al ni&ntilde;o (nombres, documentos o direcciones).
                </p>

                <p>
                    La informaci&oacute;n se almacena de forma an&oacute;nima y es protegida mediante medidas de cifrado y control de acceso.
                    El uso de estos datos es exclusivo para fines acad&eacute;micos y de apoyo preventivo.
                </p>

                <p>
                    Si tienes dudas sobre el tratamiento de datos o deseas ejercer tus derechos, puedes contactarnos a trav&eacute;s de los canales
                    de soporte disponibles en la plataforma.
                </p>
            </div>
        </>
    );
}
