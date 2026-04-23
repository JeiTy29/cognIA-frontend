# Cuestionarios

## Objetivo
- Gestionar plantillas de cuestionario desde el area admin.
- Cubrir operaciones de ciclo de vida y carga inicial de preguntas sin salir del modulo.

## Archivos modificados
- `src/App.tsx`
- `src/components/Sidebar/SidebarConfig.tsx`
- `src/services/admin/questionnaires.ts`
- `src/hooks/useAdminQuestionnaires.ts`
- `src/pages/Administrador/Cuestionarios/Cuestionarios.tsx`
- `src/pages/Administrador/Cuestionarios/Cuestionarios.css`
- `src/pages/Administrador/Cuestionarios/PreguntasCuestionario.tsx`
- `src/pages/Administrador/Cuestionarios/PreguntasCuestionario.css`

## Ruta y navegacion
- Nueva ruta: `/admin/cuestionarios`
- Nueva entrada en sidebar admin: `Cuestionarios`
- Ruta de gestion de preguntas por plantilla:
  - `/admin/cuestionarios/:templateId/preguntas`

## Endpoints implementados
- `GET /api/admin/questionnaires`
- `POST /api/admin/questionnaires/{template_id}/publish`
- `POST /api/admin/questionnaires/{template_id}/archive`
- `POST /api/admin/questionnaires/{template_id}/clone`
- `POST /api/v1/questionnaires`
- `POST /api/v1/questionnaires/{template_id}/questions`

## Payloads usados
- Listado:
  - `page`
  - `page_size`
  - `name`
  - `version`
  - `is_active`
  - `is_archived`
  - `sort`
  - `order`
- Clonado:
  - `version` obligatorio
  - `name` opcional
  - `description` opcional
- Creacion de plantilla:
  - `name` obligatorio
  - `version` obligatorio
  - `description` opcional
- Agregar pregunta:
  - `code` obligatorio
  - `text` obligatorio
  - `response_type` obligatorio
  - `position` obligatorio
  - `response_min` opcional
  - `response_max` opcional
  - `response_options` opcional
- Publicar y archivar:
  - sin body

## Respuesta modelada
- Listado:
  - `items`
  - `pagination.page`
  - `pagination.page_size`
  - `pagination.total`
  - `pagination.pages`
- Clonado:
  - `template_id`
  - `name`
  - `version`
  - `question_count`
- Crear plantilla:
  - `template_id` o `id` (segun respuesta backend)
- Crear pregunta:
  - `id` o `question_id` (segun respuesta backend)

## Decisiones visuales
- Se reutilizo el patron admin existente:
  - encabezado sobrio
  - filtros superiores
  - tabla central
  - modales de confirmacion, clonado y creacion
- No se agregaron cards como estructura principal.
- No se agregaron subtitulos largos, ultima actualizacion ni boton de refresco.
- La gestion de preguntas vive en una vista secundaria del mismo modulo para mantener contexto de plantilla.

## Decisiones conservadoras
- El filtro de version se dejo como campo de texto simple.
- La ordenacion visible se concentra en combinaciones utiles de `sort + order`.
- Publicar queda deshabilitado si el cuestionario ya esta activo o archivado.
- Archivar queda deshabilitado si el cuestionario ya esta archivado.
- La vista de preguntas no intenta cerrar CRUD completo sin endpoints confirmados en frontend.
- El listado de preguntas mostrado es el de la sesion de gestion actual (preguntas agregadas en la vista) para evitar inferir contratos adicionales.

## Manejo de errores
- `template_empty`: se muestra feedback claro al publicar.
- `template_archived`: se muestra feedback claro al publicar.
- El resto de errores se reporta sin romper la pantalla.
- Creacion de plantilla/pregunta:
  - `400`: validacion de datos
  - `401/403`: permisos o sesion
  - `404`: plantilla no encontrada (preguntas)
  - `5xx`: error servidor
