# Cuestionario

## Objetivo y estructura general

La vista del cuestionario es única para ambos roles (Padre/Tutor y Psicólogo). Las rutas existentes renderizan el mismo componente para evitar duplicación de UI y mantener consistencia visual.

- Vista unificada: `src/pages/Plataforma/Cuestionario/Cuestionario.tsx`
- Estilos: `src/pages/Plataforma/Cuestionario/Cuestionario.css`
- Rutas activas:
  - Padre/Tutor: `/padre/cuestionario`
  - Psicólogo: `/psicologo/cuestionario`

## Pantalla inicial (antes de responder)

Al entrar, se muestra una pantalla de contexto:
- Título: **Cuestionario de observación**.
- Subtítulo: “Responde según lo observado en las últimas 4 semanas.”
- Texto breve con dos ideas clave:
  - No diagnostica, solo alerta temprana.
  - No se solicitan datos que identifiquen al niño.
- Chips informativas:
  - “Duración estimada”
  - “N preguntas” (se calcula con el total de preguntas)
  - “Respuestas anónimas”
- Botones:
  - **Comenzar** (muestra la primera pregunta)
  - **Volver** (navega atrás o a la ruta principal del rol)

## Flujo guiado (una pregunta a la vez)

El cuestionario se presenta en modo guiado:
- Encabezado con título, descripción y versión del template.
- Progreso:
  - “Pregunta X de N”
  - Barra con porcentaje de avance.
- Se renderiza **una sola pregunta** por pantalla.
- Navegación:
  - **Anterior** (deshabilitado en la primera).
  - **Siguiente** (hasta la última).
  - **Finalizar** en la última pregunta.
- Si la respuesta está vacía se muestra un aviso discreto: “Respuesta pendiente.”

## Tipos de respuesta

- **likert**: selector horizontal (Nunca → Casi siempre).
- **boolean**: botones “Sí” / “No” tipo segmented control.
- **integer**: input numérico con min/max/step cuando existen.
- **text**: textarea con altura suficiente.

## Finalización

- En la última pregunta, el botón **Finalizar** muestra un mensaje de éxito:
  - “Respuestas guardadas correctamente.”
- No se envían respuestas al backend por ahora.

## Mock de cuestionario (solo desarrollo)

Para trabajar estilos en local sin depender de la API:

- Se activa con:
  - `import.meta.env.DEV === true`
  - y `VITE_USE_MOCK_QUESTIONNAIRE=true` en `.env.local`
- En producción/Vercel **siempre** se usa la API real.
- Mock ubicado en: `src/services/questionnaires/mockQuestionnaire.ts`
- El hook usa import dinámico para evitar incluir el mock en builds de producción.

## Hook y datos

- Hook: `src/hooks/questionnaires/useActiveQuestionnaire.ts`
- Ordena preguntas por `position` ascendente.
- Maneja estados: loading, error y refetch.

## Estilos clave

- Panel principal: `.questionnaire-shell` (card sobria con sombra ligera).
- Progreso: `.questionnaire-progress`, `.progress-bar`, `.progress-fill`.
- Opciones de respuesta: `.option-pill` con estado `.is-selected`.
- Mensaje de éxito: `.questionnaire-modal`.
