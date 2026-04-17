# Evaluaciones

## Objetivo
- Agregar la administracion basica de evaluaciones en el area admin.

## Archivos modificados
- `src/App.tsx`
- `src/components/Sidebar/SidebarConfig.tsx`
- `src/services/admin/evaluations.ts`
- `src/hooks/useAdminEvaluations.ts`
- `src/pages/Administrador/Evaluaciones/Evaluaciones.tsx`
- `src/pages/Administrador/Evaluaciones/Evaluaciones.css`

## Ruta y navegacion
- Nueva ruta: `/admin/evaluaciones`
- Nueva entrada en sidebar admin: `Evaluaciones`

## Endpoints implementados
- `GET /api/admin/evaluations`
- `PATCH /api/admin/evaluations/{evaluation_id}/status`

## Payloads usados
- Listado:
  - `page`
  - `page_size`
  - `status`
  - `age_min`
  - `age_max`
  - `date_from`
  - `date_to`
  - `sort`
  - `order`
- Cambio de estado:
  - `status` obligatorio

## Respuesta modelada
- Listado:
  - `items`
  - `pagination.page`
  - `pagination.page_size`
  - `pagination.total`
  - `pagination.pages`
- Cambio de estado:
  - `msg`
  - `evaluation_id`
  - `status`

## Lista local de estados
- `draft`
- `submitted`
- `completed`

La lista se centralizo en `src/services/admin/evaluations.ts`.

## Decisiones visuales
- Se reutilizo el patron admin existente:
  - encabezado sobrio
  - filtros superiores
  - tabla central
  - modal simple para cambio de estado
- No se agregaron cards.
- No se agregaron subtitulos largos, ultima actualizacion ni boton de refresco.

## Limitaciones y decisiones conservadoras
- `psychologist_id` y `subject_id` se muestran como IDs truncados porque esta tarea no incluye lookup de nombres.
- No se implemento vista de detalle.
- Se maneja `invalid_status` con feedback claro, por si el entorno backend acepta una lista distinta.
