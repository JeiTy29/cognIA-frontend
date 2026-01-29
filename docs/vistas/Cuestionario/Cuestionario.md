# Vista: Cuestionario

## Proposito

Mostrar el cuestionario activo desde la API y permitir completar respuestas de forma local (sin envio al backend).

## Ubicacion

- Padre/Tutor: `src/pages/Plataforma/CuestionarioPadre/CuestionarioPadre.tsx`
- Psicologo: `src/pages/Plataforma/CuestionarioPsicologo/CuestionarioPsicologo.tsx`
- Estilos: `CuestionarioPadre.css` y `CuestionarioPsicologo.css`
- Hook: `src/hooks/questionnaires/useActiveQuestionnaire.ts`
- API: `src/services/questionnaires/questionnaires.api.ts`

## Endpoint usado y proposito

- Base: `VITE_API_BASE_URL` (definido en `.env`).
- Endpoint: `GET /api/v1/questionnaires/active`.
- Proposito: obtener el cuestionario activo (plantilla + preguntas) sin autenticacion.

## Estructura de datos

- `questionnaire_template`: `{ id, name, version, description, is_active }`
- `questions[]`: `{ id, code, text, response_type, position, response_min/max/step, response_options }`
- `response_type`: `likert | boolean | integer | text` (puede venir otro string).

## Estados y manejo de errores

- `loading`: muestra "Cargando cuestionario...".
- Error 404: muestra "No hay un cuestionario activo en este momento." + boton Reintentar.
- Otros errores: mensaje generico + boton Reintentar.

## Render y UI

- Encabezado con:
  - Titulo: `questionnaire_template.name`
  - Descripcion: `questionnaire_template.description` (si existe)
  - Version: `questionnaire_template.version`
- Lista vertical de preguntas, cada una con numero + texto.
- Inputs por tipo:
  - `likert`: 5 opciones (Nunca / Rara vez / A veces / Frecuentemente / Casi siempre).
  - `boolean`: radios Si / No.
  - `integer`: input number, min/max/step solo si existen.
  - `text`: textarea de 3 filas.

## Estado local de respuestas

- `answers: Record<string, unknown>` con key = `question.id`.
- Se actualiza en cada cambio de input.
- No se envia al backend aun.

## Refetch

- `refetch()` vuelve a solicitar el cuestionario (boton Reintentar).

## Estilos clave

- Panel principal `.questionnaire-panel` con fondo blanco y borde azul tenue.
- Preguntas en bloques limpios `.question-item` sin exceso de tarjetas.
- Opciones tipo chip `.option-pill`.
