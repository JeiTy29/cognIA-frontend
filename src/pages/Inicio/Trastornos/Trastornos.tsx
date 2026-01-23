import { useState } from 'react';
import ansiedadIcon from '../../../assets/Iconos/Trastornos/Ansiedad.png';
import depresionIcon from '../../../assets/Iconos/Trastornos/Depresion.png';
import tdahIcon from '../../../assets/Iconos/Trastornos/TDAH.png';
import conductaIcon from '../../../assets/Iconos/Trastornos/Trastorno de Conducta.png';
import eliminacionIcon from '../../../assets/Iconos/Trastornos/Trastorno de Eliminacion.png';
import './Trastornos.css';

export default function Trastornos() {
    const [expandedDisorder, setExpandedDisorder] = useState<number | null>(null);
    const [hoveredDisorder, setHoveredDisorder] = useState<number | null>(null);

    const disorders = [
        {
            title: 'Ansiedad',
            description: 'Es cuando un niño siente miedo o preocupación muy fuertes y constantes, incluso en situaciones donde no hay un peligro real.',
            fullDescription: 'La ansiedad es cuando un niño siente miedo o preocupación muy fuertes y constantes, incluso en situaciones donde no hay un peligro real. Esto puede afectar su vida diaria, su rendimiento escolar y sus relaciones sociales. Los síntomas pueden incluir nerviosismo, fatiga, dificultad para concentrarse, tensión muscular y problemas de sueño.',
            position: 0,
            icon: ansiedadIcon
        },
        {
            title: 'Depresión',
            description: 'Se presenta cuando un niño se siente triste, desanimado o sin ganas de jugar o hacer cosas que antes disfrutaba durante mucho tiempo.',
            fullDescription: 'La depresión se presenta cuando un niño se siente triste, desanimado o sin ganas de jugar o hacer cosas que antes disfrutaba durante mucho tiempo. Puede manifestarse con cambios en el apetito, problemas de sueño, falta de energía, sentimientos de inutilidad o culpa excesiva, y en casos graves, pensamientos sobre la muerte.',
            position: 1,
            icon: depresionIcon
        },
        {
            title: 'TDAH',
            description: 'Ocurre cuando un niño tiene dificultad para concentrarse, controlar sus impulsos o mantenerse tranquilo por períodos adecuados.',
            fullDescription: 'El Trastorno por Déficit de Atención e Hiperactividad (TDAH) ocurre cuando un niño tiene dificultad para concentrarse, controlar sus impulsos o mantenerse tranquilo por períodos adecuados. Los síntomas incluyen falta de atención a los detalles, dificultad para mantener la atención en tareas, parece no escuchar cuando se le habla directamente, hiperactividad motora y dificultad para esperar su turno.',
            position: 2,
            icon: tdahIcon
        },
        {
            title: 'Trastorno de eliminación',
            description: 'Se da cuando un niño tiene dificultad para controlar la orina o las heces fecales en momentos o lugares inapropiados.',
            fullDescription: 'El trastorno de eliminación se da cuando un niño tiene dificultad para controlar la orina (enuresis) o las heces fecales (encopresis) en momentos o lugares inapropiados, más allá de la edad en que normalmente se espera que tenga control. Esto puede deberse a factores físicos, emocionales o de desarrollo, y requiere evaluación médica y psicológica apropiada.',
            position: 3,
            icon: eliminacionIcon
        },
        {
            title: 'Trastorno de conducta',
            description: 'Se caracteriza por comportamientos repetitivos de desobediencia, agresividad o falta de respeto hacia normas y otras personas.',
            fullDescription: 'El trastorno de conducta se caracteriza por comportamientos repetitivos de desobediencia, agresividad o falta de respeto hacia normas y otras personas. Puede incluir agresión a personas y animales, destrucción de propiedad, engaño o robo, y violaciones graves de las normas. Es importante identificarlo tempranamente para proporcionar intervención adecuada.',
            position: 4,
            icon: conductaIcon
        }
    ];

    const handleCircleClick = (index: number) => {
        setExpandedDisorder(index === expandedDisorder ? null : index);
    };

    return (
        <div className="trastornos-container" onClick={() => setExpandedDisorder(null)}>
            <h1 className="section-title">Trastornos</h1>
            <div className="circle-section">
                <p className="circle-hint">Haz clic en un trastorno para ver más información.</p>
                <div className={`circle-diagram-wrapper ${expandedDisorder !== null ? 'is-expanded' : ''}`}>
                    <div className="circle-diagram">
                        <div className="large-circle"></div>
                        {disorders.map((disorder, index) => (
                            <div
                                key={index}
                                className={`disorder-circle ${expandedDisorder === index ? 'expanded' : ''} ${hoveredDisorder === index && expandedDisorder !== index ? 'hovered' : ''}`}
                                data-position={disorder.position}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    handleCircleClick(index);
                                }}
                                onMouseEnter={() => setHoveredDisorder(index)}
                                onMouseLeave={() => setHoveredDisorder(null)}
                            >
                                <img className="disorder-icon" src={disorder.icon} alt={disorder.title} />
                                <h3 className="disorder-title">{disorder.title}</h3>
                                <p className="disorder-full-description">{disorder.fullDescription}</p>
                                {hoveredDisorder === index && expandedDisorder !== index && (
                                    <div className="hover-hint">Da clic para saber más</div>
                                )}
                            </div>
                        ))}
                    </div>
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
