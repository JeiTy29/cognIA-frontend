# Registro de cambios del frontend (implementaciones)

## Alcance del registro

Este documento consolida cambios implementados en el frontend que afectan comportamiento funcional o integración API.

- Fuente: evidencia del repositorio frontend local.
- Si un cambio no puede verificarse solo con frontend, se marca como inferido.

## 2026-04-22 - Admin Cuestionarios + Continuidad V2

### 1) Creación de plantilla de cuestionario (admin)

- Endpoint integrado: `POST /api/v1/questionnaires`
- Servicio: `src/services/admin/questionnaires.ts`
- Hook: `src/hooks/useAdminQuestionnaires.ts`
- UI: `src/pages/Administrador/Cuestionarios/Cuestionarios.tsx`
- Comportamiento:
  - botón `Crear plantilla`
  - modal con `name`, `version`, `description`
  - refresco de listado y mensaje de éxito.

### 2) Agregar pregunta a plantilla (admin)

- Endpoint integrado: `POST /api/v1/questionnaires/{template_id}/questions`
- Servicio: `src/services/admin/questionnaires.ts`
- UI nueva:
  - `src/pages/Administrador/Cuestionarios/PreguntasCuestionario.tsx`
  - `src/pages/Administrador/Cuestionarios/PreguntasCuestionario.css`
- Ruta agregada:
  - `/admin/cuestionarios/:templateId/preguntas`
- Comportamiento:
  - acción `Gestionar preguntas` por plantilla
  - formulario de alta de pregunta con campos base (`code`, `text`, `response_type`, `position`, opcionales).

### 3) Continuar sesión de Questionnaire V2

- Endpoint adicional usado antes de crear sesión:
  - `GET /api/v2/questionnaires/history` con estados `draft` / `in_progress`
- Vista: `src/pages/Plataforma/Cuestionario/Cuestionario.tsx`
- Comportamiento:
  - si hay sesión reutilizable, la UI muestra:
    - `Continuar cuestionario`
    - `Empezar de nuevo`
  - continuar:
    - reutiliza `session_id`
    - restaura respuestas y contexto de avance
  - empezar de nuevo:
    - crea nueva sesión (`POST /api/v2/questionnaires/sessions`).

### 4) Alineación de rol V2 (`guardian`)

- Tipo actualizado:
  - `QuestionnaireV2Role = 'guardian' | 'psychologist'`
- Mapeo UI->API:
  - `padre -> guardian`
  - `psicologo -> psychologist`
- Documentación alineada:
  - `docs/vistas/Plataforma/Cuestionario.md`

## Registro continuo

Toda implementación nueva debe agregar una entrada en este archivo con:

1. fecha
2. módulo afectado
3. endpoints consumidos/ajustados
4. cambios de UI/flujo
5. archivos principales modificados
