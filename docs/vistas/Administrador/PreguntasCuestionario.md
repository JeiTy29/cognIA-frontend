# Vista: Gestion de preguntas de cuestionario (Admin)

## Ubicacion

- Vista: `src/pages/Administrador/Cuestionarios/PreguntasCuestionario.tsx`
- Estilos: `src/pages/Administrador/Cuestionarios/PreguntasCuestionario.css`
- Servicio consumido: `src/services/admin/questionnaires.ts`

## Ruta

- `/admin/cuestionarios/:templateId/preguntas`

## Objetivo funcional

Permitir al administrador agregar preguntas a una plantilla de cuestionario existente, manteniendo contexto de plantilla y sin salir del modulo admin de cuestionarios.

## Endpoint consumido

- `POST /api/v1/questionnaires/{template_id}/questions`

## Campos del formulario de alta

- `code` (obligatorio)
- `text` (obligatorio)
- `response_type` (obligatorio)
- `position` (obligatorio)
- `response_min` (opcional)
- `response_max` (opcional)
- `response_options` (opcional, texto por linea en formato `valor|etiqueta`)

## Comportamiento de UI

1. Muestra contexto de plantilla (`templateId` y metadatos disponibles por estado de navegación).
2. Permite agregar pregunta desde formulario.
3. Mantiene al usuario en la misma vista tras crear pregunta.
4. Muestra feedback de exito o error sin perder contexto.
5. Incluye listado local de preguntas agregadas durante la sesion actual de la vista.

## Manejo de errores observable

- `400`: validacion de datos de pregunta.
- `401`: sesion no valida.
- `403`: permisos insuficientes.
- `404`: plantilla no encontrada.
- `5xx`: error interno del servidor.

## Limites de verificabilidad

- Desde frontend se verifica alta de pregunta y estado de UI.
- No es posible confirmar solo con frontend la estructura completa de lectura/edicion/eliminacion de preguntas sin endpoints adicionales documentados.
