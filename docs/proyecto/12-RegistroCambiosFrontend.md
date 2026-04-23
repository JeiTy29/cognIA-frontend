# Registro de cambios del frontend (implementaciones)

## Alcance del registro

Este documento consolida cambios implementados en el frontend que afectan comportamiento funcional o integracion API.

- Fuente: evidencia del repositorio frontend local.
- Si un cambio no puede verificarse solo con frontend, se marca como inferido.

## 2026-04-22 - Admin Cuestionarios + Continuidad V2

### 1) Creacion de plantilla de cuestionario (admin)

- Endpoint integrado: `POST /api/v1/questionnaires`
- Servicio: `src/services/admin/questionnaires.ts`
- Hook: `src/hooks/useAdminQuestionnaires.ts`
- UI: `src/pages/Administrador/Cuestionarios/Cuestionarios.tsx`
- Comportamiento:
  - boton `Crear plantilla`
  - modal con `name`, `version`, `description`
  - refresco de listado y mensaje de exito.

### 2) Agregar pregunta a plantilla (admin)

- Endpoint integrado: `POST /api/v1/questionnaires/{template_id}/questions`
- Servicio: `src/services/admin/questionnaires.ts`
- UI nueva:
  - `src/pages/Administrador/Cuestionarios/PreguntasCuestionario.tsx`
  - `src/pages/Administrador/Cuestionarios/PreguntasCuestionario.css`
- Ruta agregada:
  - `/admin/cuestionarios/:templateId/preguntas`
- Comportamiento:
  - accion `Gestionar preguntas` por plantilla
  - formulario de alta de pregunta con campos base (`code`, `text`, `response_type`, `position`, opcionales).

### 3) Continuar sesion de Questionnaire V2

- Endpoint adicional usado antes de crear sesion:
  - `GET /api/v2/questionnaires/history` con estados `draft` / `in_progress`
- Vista: `src/pages/Plataforma/Cuestionario/Cuestionario.tsx`
- Comportamiento:
  - si hay sesion reutilizable, la UI muestra:
    - `Continuar cuestionario`
    - `Empezar de nuevo`
  - continuar:
    - reutiliza `session_id`
    - restaura respuestas y contexto de avance
  - empezar de nuevo:
    - crea nueva sesion (`POST /api/v2/questionnaires/sessions`).

### 4) Alineacion de rol V2 (`guardian`)

- Tipo actualizado:
  - `QuestionnaireV2Role = 'guardian' | 'psychologist'`
- Mapeo UI->API:
  - `padre -> guardian`
  - `psicologo -> psychologist`
- Documentacion alineada:
  - `docs/vistas/Plataforma/Cuestionario.md`

## 2026-04-22 - MFA challenge + Dashboard UX/reportes

### 1) MFA challenge con 6 cajas de codigo

- Vista: `src/pages/Autenticacion/MFA/MFA.tsx`
- Estilos: `src/pages/Autenticacion/MFA/MFA.css`
- Cambios:
  - input unico reemplazado por 6 cajas (1 digito por caja)
  - autoavance al escribir
  - retroceso con backspace
  - pegado de codigo completo distribuido automaticamente
  - se mantiene flujo alterno de recovery code

### 2) Reportes de Dashboard desacoplados de `adoption_history`

- Archivos:
  - `src/services/reports/reports.types.ts`
  - `src/services/reports/reports.mappers.ts`
  - `src/pages/Administrador/Dashboard/Dashboard.tsx`
- Cambios:
  - normalizacion del dataset por secciones
  - render por familia (series, resumenes, bloques estructurados)
  - eliminacion del fallback que bloqueaba visualizacion cuando no habia `adoption_history`

### 3) Normalizacion textual/visual de Dashboard

- Archivos:
  - `src/pages/Administrador/Dashboard/Dashboard.tsx`
  - `src/pages/Administrador/Dashboard/Dashboard.css`
  - `src/hooks/dashboard/useDashboard.ts`
- Cambios:
  - titulos en lenguaje mas claro para administracion
  - contexto breve por seccion
  - periodos y labels tecnicos formateados en lenguaje natural

### 4) Documentacion asociada

- `docs/vistas/Autenticacion/MFA.md`
- `docs/vistas/Administrador/Dashboard.md`

## Registro continuo

Toda implementacion nueva debe agregar una entrada en este archivo con:

1. fecha
2. modulo afectado
3. endpoints consumidos/ajustados
4. cambios de UI/flujo
5. archivos principales modificados
