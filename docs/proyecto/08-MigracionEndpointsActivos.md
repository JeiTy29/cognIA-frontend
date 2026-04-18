# Migración a módulos activos (frontend)

## Objetivo
- Retirar dependencias legacy y alinear frontend con contratos activos para cuestionario y usuarios.

## Endpoints legacy retirados del frontend
- `GET /api/v1/questionnaires/active`
- `POST /api/v1/users`
- `GET /api/v1/users/{id}`
- `DELETE /api/v1/users/{id}`

## Endpoints activos implementados
- Cuestionario V2:
  - `GET /api/v2/questionnaires/active`
  - `POST /api/v2/questionnaires/sessions`
  - `GET /api/v2/questionnaires/sessions/{session_id}`
  - `GET /api/v2/questionnaires/sessions/{session_id}/page`
  - `PATCH /api/v2/questionnaires/sessions/{session_id}/answers`
  - `POST /api/v2/questionnaires/sessions/{session_id}/submit`
  - `GET /api/v2/questionnaires/history`
  - `GET /api/v2/questionnaires/history/{session_id}`
  - `GET /api/v2/questionnaires/history/{session_id}/results`
  - `POST /api/v2/questionnaires/history/{session_id}/tags`
  - `DELETE /api/v2/questionnaires/history/{session_id}/tags/{tag_id}`
  - `POST /api/v2/questionnaires/history/{session_id}/share`
  - `POST /api/v2/questionnaires/history/{session_id}/pdf/generate`
  - `GET /api/v2/questionnaires/history/{session_id}/pdf`
  - `GET /api/v2/questionnaires/history/{session_id}/pdf/download`
  - `GET /api/v2/questionnaires/shared/{questionnaire_id}/{share_code}`
- Usuarios admin:
  - `GET /api/admin/users`
  - `PATCH /api/admin/users/{id}`
  - `POST /api/admin/users/{id}/password-reset`
  - `POST /api/admin/users/{id}/mfa/reset`

## Flujos retirados por no tener reemplazo activo
- Ruta pública `/activar-cuenta` y su pantalla.
- Creación de usuarios desde admin usando `POST /api/v1/users`.
- Detalle de usuario por `GET /api/v1/users/{id}`.
- Cambio de correo en `MiCuenta`.
