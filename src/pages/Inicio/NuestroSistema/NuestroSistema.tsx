import { useEffect, useRef, useState } from 'react';
import './NuestroSistema.css';
import frasePadre1 from '../../../assets/Iconos/NuestroSistema/FrasePadre1.png';
import frasePadre2 from '../../../assets/Iconos/NuestroSistema/FrasePadre2.png';
import frasePadre3 from '../../../assets/Iconos/NuestroSistema/FrasePadre3.png';
import frasePadre4 from '../../../assets/Iconos/NuestroSistema/FrasePadre4.png';
import frasePsico1 from '../../../assets/Iconos/NuestroSistema/FrasePsico1.png';
import frasePsico2 from '../../../assets/Iconos/NuestroSistema/FrasePsico2.png';
import frasePsico3 from '../../../assets/Iconos/NuestroSistema/FrasePsico3.png';
import frasePsico4 from '../../../assets/Iconos/NuestroSistema/FrasePsico4.png';

export default function NuestroSistema() {
  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [accordionIndex, setAccordionIndex] = useState<number | null>(0);
  const [animationCycle, setAnimationCycle] = useState(0);
  const [rolActivo, setRolActivo] = useState<'padres' | 'psicologos'>('padres');
  const animationTimeoutRef = useRef<number | null>(null);

  const questions = [
    {
      id: 1,
      text: "¿El correo electrónico contiene palabras como 'oferta' o 'descuento'?",
      results: [
        { tree: 1, vote: "Sí" },
        { tree: 2, vote: "Sí" },
        { tree: 3, vote: "No" },
        { tree: 4, vote: "Sí" },
        { tree: 5, vote: "Sí" }
      ],
      finalResult: "Clasificación: Correo Promocional"
    },
    {
      id: 2,
      text: "¿La temperatura supera los 30 grados y hay nubes?",
      results: [
        { tree: 1, vote: "No" },
        { tree: 2, vote: "Sí" },
        { tree: 3, vote: "No" },
        { tree: 4, vote: "No" },
        { tree: 5, vote: "No" }
      ],
      finalResult: "Predicción: Día Soleado"
    },
    {
      id: 3,
      text: "¿El cliente ha realizado más de 5 compras este año?",
      results: [
        { tree: 1, vote: "Sí" },
        { tree: 2, vote: "Sí" },
        { tree: 3, vote: "Sí" },
        { tree: 4, vote: "No" },
        { tree: 5, vote: "Sí" }
      ],
      finalResult: "Clasificación: Cliente Frecuente"
    }
  ];

  const accordionItems = [
    {
      title: '1) Un árbol toma decisiones',
      body: (
        <>
          Un árbol de decisión aprende reglas a partir de ejemplos.
          <br />
          Cada pregunta guía el camino hacia un resultado.
        </>
      )
    },
    {
      title: '2) Un bosque combina muchos árboles',
      body: (
        <>
          Random Forest entrena muchos árboles con variaciones.
          <br />
          Luego combina sus respuestas para reducir errores.
        </>
      )
    },
    {
      title: '3) ¿Cómo se obtiene la alerta?',
      body: (
        <>
          Los árboles 'votan' y el sistema calcula un nivel de alerta.
          <br />
          En perfiles profesionales se muestra más detalle del porqué.
        </>
      )
    }
  ];

  const roleContent = {
    padres: {
      line: 'Diligencian el cuestionario y consultan sus propios resultados.',
      items: [
        {
          text: 'Ven únicamente resultados de cuestionarios realizados por ellos.',
          icon: frasePadre1
        },
        {
          text: 'Reciben una alerta sobre un posible trastorno.',
          icon: frasePadre2
        },
        {
          text: 'El cuestionario evalúa el comportamiento sin identificar al niño.',
          icon: frasePadre3
        },
        {
          text: 'La alerta se basa en un posible trastorno que pueda tener el infante.',
          icon: frasePadre4
        }
      ]
    },
    psicologos: {
      line: 'Realizan evaluaciones, acceden a múltiples alertas y visualizan con mayor detalle.',
      items: [
        {
          text: 'Pueden consultar el historial de multiples cuestionarios, siempre y cuando el padre o docente alla dado los permisos necesarios.',
          icon: frasePsico1
        },
        {
          text: 'Ven interpretación mas detallada de cómo el modelo llega a la alerta.',
          icon: frasePsico2
        },
        {
          text: 'La vista profesional incluye más detalle para análisis.',
          icon: frasePsico3
        },
        {
          text: 'El resultado no reemplaza una evaluación clínica.',
          icon: frasePsico4
        }
      ]
    }
  };

  const handleRoleChange = (role: 'padres' | 'psicologos') => {
    setRolActivo(role);
  };

  const handleQuestionClick = (questionId: number) => {
    if (animationTimeoutRef.current !== null) {
      window.clearTimeout(animationTimeoutRef.current);
    }

    setSelectedQuestion(questionId);
    setIsAnimating(true);
    setShowResult(false);
    setAnimationCycle((prev) => prev + 1);

    // Simulate animation delay
    animationTimeoutRef.current = window.setTimeout(() => {
      setShowResult(true);
      setIsAnimating(false);
    }, 2500);
  };

  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current !== null) {
        window.clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  const currentQuestion = questions.find(q => q.id === selectedQuestion);

  return (
    <main className="sistema">
      <h1 className="section-title">¿Cómo funciona nuestro sistema?</h1>
      <p className="intro">
        El proceso de evaluación se desarrolla en cuatro etapas claramente definidas.
      </p>

      <section className="cards">
        <div className="card">
          <div className="icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor" />
            </svg>
          </div>
          <h2>1. Observar</h2>
          <p>
            El padre o tutor observa y detecta comportamientos inusuales
            o fuera de lo común en el niño.
          </p>
        </div>

        <div className="flow-arrow">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div className="card">
          <div className="icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" fill="currentColor" />
            </svg>
          </div>
          <h2>2. Cuestionar</h2>
          <p>
            El tutor accede al aplicativo y diligencia un cuestionario
            con preguntas específicas orientadas a identificar posibles señales.
          </p>
        </div>

        <div className="flow-arrow">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div className="card">
          <div className="icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17 10h-4v4h4v-4zm0-8h-4v4h4V2zM7 18H3v4h4v-4zm10 0h-4v4h4v-4zm0-4h-4v4h4v-4zM7 10H3v4h4v-4zm10-4h-4v4h4V6zM7 2H3v4h4V2zm4 16h4v-4h-4v4zm0-8h4V6h-4v4z" fill="currentColor" />
            </svg>
          </div>
          <h2>3. Votar</h2>
          <p>
            Un conjunto de árboles de decisión evalúa las respuestas
            mediante el algoritmo Random Forest.
          </p>
        </div>

        <div className="flow-arrow">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div className="card">
          <div className="icon">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm2.85 11.1l-.85.6V16h-4v-2.3l-.85-.6A4.997 4.997 0 017 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.63-.8 3.16-2.15 4.1z" fill="currentColor" />
            </svg>
          </div>
          <h2>4. Sugerir</h2>
          <p>
            El sistema genera una alerta temprana o sugerencia,
            sin emitir un diagnóstico clínico definitivo.
          </p>
        </div>
      </section>

      <section className="audience-section">
        <div className="info-card audience-panel">
          <div className="panel-header">
            <h2 className="panel-title">¿Para quien va dirigido?</h2>
            <div className="role-tabs" role="tablist" aria-label="Roles principales">
              <button
                type="button"
                className={`role-tab ${rolActivo === 'padres' ? 'active' : ''}`}
                onClick={() => handleRoleChange('padres')}
                role="tab"
                aria-selected={rolActivo === 'padres'}
              >
                Padres y docentes
              </button>
              <button
                type="button"
                className={`role-tab ${rolActivo === 'psicologos' ? 'active' : ''}`}
                onClick={() => handleRoleChange('psicologos')}
                role="tab"
                aria-selected={rolActivo === 'psicologos'}
              >
                Psicólogos
              </button>
            </div>
          </div>

          <div className="role-content" role="tabpanel">
            <p className="role-line">{roleContent[rolActivo].line}</p>
            <div className="role-points">
              {roleContent[rolActivo].items.map((item) => (
                <div key={item.text} className="role-point">
                  <img className="role-point-icon" src={item.icon} alt="" aria-hidden="true" />
                  <p>{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="rf-note">
          Importante: el sistema no diagnostica; genera una alerta temprana sobre un posible trastorno.
        </p>
      </section>

      <section className="rf-demo">
        <h2 className="section-title">¿Qué es Random Forest?</h2>

        <div className="rf-container">
          <div className="rf-description info-card">
            <h3>Así funciona Random Forest</h3>
            <p className="rf-intro-line">
              Usamos Random Forest para combinar múltiples decisiones y obtener una alerta más estable.
            </p>
            <div className="rf-accordion">
              {accordionItems.map((item, index) => (
                <div
                  key={item.title}
                  className={`accordion-item ${accordionIndex === index ? 'is-open' : ''}`}
                >
                  <button
                    type="button"
                    className="accordion-trigger"
                    onClick={() => setAccordionIndex(accordionIndex === index ? null : index)}
                    aria-expanded={accordionIndex === index}
                    aria-controls={`rf-accordion-panel-${index}`}
                  >
                    <span>{item.title}</span>
                    <span className="accordion-icon">+</span>
                  </button>
                  <div
                    id={`rf-accordion-panel-${index}`}
                    className="accordion-content"
                    role="region"
                    aria-hidden={accordionIndex !== index}
                  >
                    {item.body}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rf-interactive info-card">
            <h3>Simulación Interactiva</h3>
            <div className="rf-disclaimer">
              <strong>Nota:</strong> Demostración simplificada; el sistema real utiliza más preguntas y árboles.
            </div>
            <p className="instruction">Simulación simplificada: observa cómo varios ‘árboles’ pueden votar por un resultado.</p>

            <div className="question-selector">
              {questions.map(q => (
                <button
                  key={q.id}
                  className={`question-btn ${selectedQuestion === q.id ? 'active' : ''}`}
                  onClick={() => handleQuestionClick(q.id)}
                  disabled={isAnimating}
                >
                  {q.text}
                </button>
              ))}
            </div>

            {selectedQuestion && (
              <div className="forest" key={`${selectedQuestion}-${animationCycle}`}>
                {currentQuestion?.results.map((result, index) => (
                  <div
                    key={`${animationCycle}-${result.tree}`}
                    className={`tree ${isAnimating ? 'animating' : 'voted'}`}
                    style={{ animationDelay: `${index * 0.3}s` }}
                  >
                    <div className="tree-icon">🌳</div>
                    <div className="tree-label">Árbol {result.tree}</div>
                    <div className={`vote ${result.vote === "Sí" ? 'positive' : 'negative'}`}>
                      {result.vote}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {showResult && currentQuestion && (
              <div className="result">
                <strong>Resultado final:</strong> {currentQuestion.finalResult}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
