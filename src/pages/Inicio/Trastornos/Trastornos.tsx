import './Trastornos.css';

export default function Trastornos() {
    const disorders = [
        {
            title: "Ansiedad",
            description: "Es cuando un niño siente miedo o preocupación muy fuertes y constantes, incluso en situaciones donde no hay un peligro real.",
            position: 0 // 0 degrees
        },
        {
            title: "Depresión",
            description: "Se presenta cuando un niño se siente triste, desanimado o sin ganas de jugar o hacer cosas que antes disfrutaba durante mucho tiempo.",
            position: 1 // 72 degrees
        },
        {
            title: "TDAH (Trastorno por Déficit de Atención e Hiperactividad)",
            description: "Ocurre cuando un niño tiene dificultad para concentrarse, controlar sus impulsos o mantenerse tranquilo por períodos adecuados.",
            position: 2 // 144 degrees
        },
        {
            title: "Trastorno de eliminación",
            description: "Se da cuando un niño tiene dificultad para controlar la orina o las heces fecales en momentos o lugares inapropiados.",
            position: 3 // 216 degrees
        },
        {
            title: "Trastorno de conducta",
            description: "Se caracteriza por comportamientos repetitivos de desobediencia, agresividad o falta de respeto hacia normas y otras personas.",
            position: 4 // 288 degrees
        }
    ];

    return (
        <div className="trastornos-container">
            <div className="circle-section">
                <div className="circle-diagram">
                    <div className="large-circle"></div>
                    {disorders.map((disorder, index) => (
                        <div
                            key={index}
                            className="disorder-circle"
                            data-position={disorder.position}
                        >
                            <h3 className="disorder-title">{disorder.title}</h3>
                            <p className="disorder-description">{disorder.description}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="info-section">
                <h2 className="section-title">No lo olvides, estos no son los únicos trastornos</h2>
                <div className="info-card">
                    <ul className="info-list">
                        <li>Los trastornos psicológicos presentados en esta sección corresponden a algunos de los más comunes en la infancia. Sin embargo, existen otros trastornos y condiciones que no son contemplados por el sistema. El aplicativo cognIA ha sido diseñado para trabajar únicamente con los trastornos aquí descritos, de acuerdo con el alcance definido para el proyecto.</li>
                        <li>Los resultados generados por el sistema no constituyen un diagnóstico clínico. Incluso si el sistema no identifica indicios de algún trastorno, se recomienda acudir a un profesional de la salud mental ante cualquier preocupación sobre el comportamiento o bienestar del niño.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
