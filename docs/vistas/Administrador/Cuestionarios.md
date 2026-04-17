# Cuestionarios

## Objetivo
- Agregar la administracion basica de cuestionarios en el area admin.

## Archivos modificados
- `src/App.tsx`
- `src/components/Sidebar/SidebarConfig.tsx`
- `src/services/admin/questionnaires.ts`
- `src/hooks/useAdminQuestionnaires.ts`
- `src/pages/Administrador/Cuestionarios/Cuestionarios.tsx`
- `src/pages/Administrador/Cuestionarios/Cuestionarios.css`

## Ruta y navegacion
- Nueva ruta: `/admin/cuestionarios`
- Nueva entrada en sidebar admin: `Cuestionarios`

## Endpoints implementados
- `GET /api/admin/questionnaires`
- `POST /api/admin/questionnaires/{template_id}/publish`
- `POST /api/admin/questionnaires/{template_id}/archive`
- `POST /api/admin/questionnaires/{template_id}/clone`

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

## Decisiones visuales
- Se reutilizo el patron admin existente:
  - encabezado sobrio
  - filtros superiores
  - tabla central
  - modales de confirmacion y clonado
- No se agregaron cards como estructura principal.
- No se agregaron subtitulos largos, ultima actualizacion ni boton de refresco.

## Decisiones conservadoras
- El filtro de version se dejo como campo de texto simple.
- La ordenacion visible se concentra en combinaciones utiles de `sort + order`.
- Publicar queda deshabilitado si el cuestionario ya esta activo o archivado.
- Archivar queda deshabilitado si el cuestionario ya esta archivado.

## Manejo de errores
- `template_empty`: se muestra feedback claro al publicar.
- `template_archived`: se muestra feedback claro al publicar.
- El resto de errores se reporta sin romper la pantalla.
