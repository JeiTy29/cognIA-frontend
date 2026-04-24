# Cuestionarios (Admin)

## Objetivo
- Gestionar plantillas de cuestionario y su ciclo de vida desde `/admin/cuestionarios`.

## Archivos principales
- `src/pages/Administrador/Cuestionarios/Cuestionarios.tsx`
- `src/pages/Administrador/Cuestionarios/Cuestionarios.css`
- `src/pages/Administrador/Cuestionarios/PreguntasCuestionario.tsx`
- `src/hooks/useAdminQuestionnaires.ts`
- `src/services/admin/questionnaires.ts`

## Endpoints usados por frontend
- `GET /api/admin/questionnaires`
- `POST /api/admin/questionnaires/{template_id}/publish`
- `POST /api/admin/questionnaires/{template_id}/archive`
- `POST /api/admin/questionnaires/{template_id}/clone`
- `POST /api/v1/questionnaires`
- `POST /api/v1/questionnaires/{template_id}/questions`

## Cambios UX aplicados (ronda 2026-04-24)
- La columna de acciones se simplifico para reducir saturacion visual.
- Accion principal visible por fila:
  - `Gestionar preguntas`
- Acciones secundarias movidas a menu contextual `Acciones`:
  - `Clonar`
  - `Publicar`
  - `Archivar`
- No se perdio funcionalidad; solo se reorganizo la jerarquia visual.

## Validacion manual sugerida
1. Abrir `/admin/cuestionarios`.
2. Verificar que la columna de acciones se vea limpia.
3. Abrir menu `Acciones` y ejecutar clonar/publicar/archivar.
