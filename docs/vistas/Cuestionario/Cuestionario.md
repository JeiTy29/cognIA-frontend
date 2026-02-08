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

## Layout tipo ?stack? (pila de preguntas)

La vista principal muestra un flujo guiado, manteniendo el contexto:
- La pregunta actual aparece en estado activo (interactiva).
- Todas las dem?s preguntas (anteriores o posteriores) quedan arriba en formato compacto:
  - **Respondidas**: fondo azul claro con resumen de respuesta.
  - **Pendientes**: opacas y con resumen ?Respuesta: Pendiente?.
- No se previsualiza ninguna pregunta futura en estado activo.
- Las preguntas compactas son clicables para volver a ellas.

### Animaciones de avance/retroceso

- Al avanzar: la pregunta activa sube, reduce tama?o/opacidad y pasa a ?respondida?.
- La nueva pregunta aparece desde abajo con fade + translateY/scale suave.
- Al retroceder: la pregunta activa pierde protagonismo y la anterior vuelve a estado activo.
- Se respeta `prefers-reduced-motion`.

## Encabezado y progreso

- Encabezado con t?tulo, subt?tulo y disclaimer breve.
- La barra de progreso aparece **debajo de la pregunta activa**, con:
  - **?Pregunta X / N?**
  - Barra de progreso (transici?n suave en width).

## Validaci?n obligatoria por tipo

No se permite avanzar si la pregunta actual no tiene una respuesta v?lida. El bot?n **Siguiente** permanece deshabilitado y, si se intenta avanzar por teclado, se muestra el aviso inline:
**?Selecciona una respuesta para continuar.?**

Reglas de validaci?n:
- **likert**: obligatorio. Si no hay `response_options`, se usa set fijo (Nunca ? Casi siempre).
- **boolean**: obligatorio (S?/No).
- **integer**: obligatorio; entero >= 0 y respeta `response_min/response_max` si existen.
- **text**: obligatorio con m?nimo 3 caracteres.

Las respuestas se guardan en `answersMap` por `question.id`. Al volver con **Anterior** o al seleccionar una pregunta compacta, la respuesta se restaura.

## UI de respuestas

- Opciones verticales full width, con estados hover/selected.
- Preguntas respondidas muestran solo resumen (sin opciones completas).

### Numeric (integer)
- Input sin flechas (spinner oculto).
- No permite negativos.
- Label visible arriba del input.

### Text (text)
- Textarea con altura c?moda.
- Label ?Respuesta? y hint de longitud m?nima.

## Botones de navegaci?n flotantes

- **Anterior** y **Siguiente/Guardar** se ubican a la derecha del bloque activo.
- Se reserva espacio lateral para no tapar contenido.
- En pantallas peque?as, los controles pasan a una barra inferior sticky.

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
