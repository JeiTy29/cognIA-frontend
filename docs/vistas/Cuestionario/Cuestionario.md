# Cuestionario

## Objetivo y estructura general

La vista del cuestionario es ?nica para ambos roles (Padre/Tutor y Psic?logo). Las rutas existentes renderizan el mismo componente para evitar duplicaci?n de UI y mantener consistencia visual.

- Vista unificada: `src/pages/Plataforma/Cuestionario/Cuestionario.tsx`
- Estilos: `src/pages/Plataforma/Cuestionario/Cuestionario.css`
- Rutas activas:
  - Padre/Tutor: `/padre/cuestionario`
  - Psic?logo: `/psicologo/cuestionario`

## Pantalla inicial (antes de responder)

La introducci?n se presenta sin cards, centrada verticalmente y con layout en dos columnas.

- T?tulo: **Cuestionario de observaci?n**.
- Texto conversacional con duraci?n estimada (5?8 min) y n?mero total de preguntas.
- Mensaje de apoyo: no diagnostica, solo alerta temprana; respuestas an?nimas.
- Imagen a la derecha:
  - Ruta: `src/assets/Imagenes/Cuestionario.svg`
  - `object-fit: contain` y altura similar al bloque de texto.
- Bot?n principal: **Comenzar** (m?s grande y ubicado debajo del texto y la imagen).

## Flujo guiado (una pregunta a la vez)

El cuestionario se presenta en modo guiado para evitar scroll excesivo:
- Encabezado superior con:
  - T?tulo y subt?tulo.
  - Disclaimer breve: ?Este cuestionario no diagnostica, solo genera una alerta temprana.?
- Bloque de progreso bajo el subt?tulo:
  - ?Pregunta X / N?
  - Barra de progreso (animada suavemente)
- Se renderiza **una sola pregunta** por pantalla.
- Navegaci?n:
  - **Anterior** (deshabilitado en la primera).
  - **Siguiente** (hasta la ?ltima).
  - **Guardar** en la ?ltima pregunta.

## Validaci?n obligatoria por tipo

No se permite avanzar si la pregunta actual no tiene una respuesta v?lida. El bot?n **Siguiente** permanece deshabilitado y, si se intenta avanzar por teclado, se muestra el aviso inline:
**?Selecciona una respuesta para continuar.?**

Reglas de validaci?n:
- **likert**: obligatorio. Si no hay `response_options`, se usa set fijo (Nunca ? Casi siempre).
- **boolean**: obligatorio (S?/No).
- **integer**: obligatorio; debe ser entero y respetar `response_min/response_max` si existen.
- **text**: obligatorio con m?nimo 3 caracteres.

Las respuestas se guardan en `answersMap` por `question.id`. Al volver con **Anterior**, la respuesta se restaura.

## Tipos de respuesta (UI)

- **likert**: opciones verticales como bloques seleccionables, full width.
- **boolean**: S?/No con el mismo patr?n de opciones verticales.
- **integer**: input num?rico con l?mites cuando existen.
- **text**: textarea con altura suficiente.

## Finalizaci?n

- En la ?ltima pregunta, el bot?n **Guardar** muestra un mensaje de ?xito:
  - ?Cuestionario guardado correctamente.?
- Tras confirmar el mensaje, la vista vuelve a la bienvenida del cuestionario.
- Por ahora no se env?an respuestas al backend.

## Mock de cuestionario (solo desarrollo)

Para trabajar estilos en local sin depender de la API:

- Se activa con:
  - `import.meta.env.DEV === true`
  - y `VITE_USE_MOCK_QUESTIONNAIRE=true` en `.env.local`
- En producci?n/Vercel **siempre** se usa la API real.
- Mock ubicado en: `src/services/questionnaires/mockQuestionnaire.ts`
- El hook usa import din?mico para evitar incluir el mock en builds de producci?n.

## Hook y datos

- Hook: `src/hooks/questionnaires/useActiveQuestionnaire.ts`
- Ordena preguntas por `position` ascendente.
- Maneja estados: loading, error y refetch.

## Animaciones

- Pantalla intro: entrada por capas (t?tulo, subt?tulo, texto, imagen, bot?n).
- Acento del t?tulo: l?nea animada que crece de 0% a 100%.
- SVG: flotaci?n sutil con hover ligero.
- Cambios de pregunta: fade + desplazamiento suave (`.question-animate`).
- Respetan `prefers-reduced-motion`.
