# Consumo de API del frontend (inventario vigente)

## Alcance

Este documento formaliza **que consume el frontend** y como lo consume.

- Fuente: `src/services/**`, hooks y paginas que invocan dichos servicios.
- No valida backend real ni contratos externos no incluidos en frontend.
- Si hay normalizacion flexible, se indica como inferido desde el cliente.

## Capa comun de integracion HTTP

Archivo base: `src/services/api/httpClient.ts`

### Capacidades comunes observadas

- Wrappers HTTP: `apiGet`, `apiPost`, `apiPatch`, `apiPut`, `apiDelete`, `apiPostNoBody`, `apiPostFormData`.
- Manejo de errores unificado con `ApiError(status, payload)`.
- Retry de autenticacion por refresh para respuestas `401`.
- Soporte de `auth: true` para header `Authorization`.
- Soporte de `credentials: 'include'` para cookies/sesion.
- Soporte de descarga binaria (`apiGetBlob`, `apiGetBlobWithMeta`).

## Modulo de autenticacion

Servicio principal: `src/services/auth/auth.api.ts`

| Endpoint consumido | Metodo | Uso en frontend |
|---|---|---|
| `/api/auth/register` | POST | Registro de cuenta desde `/registro` |
| `/api/auth/login` | POST | Login inicial desde `/inicio-sesion` |
| `/api/auth/login/mfa` | POST | Confirmacion MFA en challenge |
| `/api/mfa/setup` | POST | Inicio de setup MFA (vista MFA/MiCuenta) |
| `/api/mfa/confirm` | POST | Confirmacion setup MFA |
| `/api/mfa/disable` | POST | Desactivacion MFA en MiCuenta |
| `/api/auth/password/change` | POST | Cambio de contrasena autenticado |
| `/api/auth/password/forgot` | POST | Solicitud de enlace de recuperacion |
| `/api/auth/password/reset/verify` | GET | Verificacion de token de reset |
| `/api/auth/password/reset` | POST | Aplicacion de nueva contrasena |
| `/api/auth/me` | GET | Carga de perfil de sesion |
| `/api/auth/logout` | POST | Cierre de sesion |
| `/api/auth/refresh` | POST | Refresh de token (via `auth.refresh.ts`) |

### Observaciones

- El login no usa wrapper generico, implementa `fetch` directo para manejar variantes de respuesta MFA.
- El refresh exige CSRF token en cliente (`getCsrfToken`).

## Cuestionario V2 y comparticion

Servicio principal: `src/services/questionnaires/questionnaires.api.ts`

| Endpoint consumido | Metodo | Uso en frontend |
|---|---|---|
| `/api/v2/questionnaires/active` | GET | Cargar cuestionario activo por modo/rol |
| `/api/v2/questionnaires/sessions` | POST | Crear sesion de cuestionario |
| `/api/v2/questionnaires/sessions/{session_id}` | GET | Consultar sesion (incluye polling post-submit) |
| `/api/v2/questionnaires/sessions/{session_id}/page` | GET | Cargar preguntas/paginas |
| `/api/v2/questionnaires/sessions/{session_id}/answers` | PATCH | Guardar respuestas |
| `/api/v2/questionnaires/sessions/{session_id}/submit` | POST | Finalizar y disparar procesamiento |
| `/api/v2/questionnaires/history` | GET | Listar historial |
| `/api/v2/questionnaires/history/{session_id}` | GET | Detalle de historial |
| `/api/v2/questionnaires/history/{session_id}/results` | GET | Resultados asociados |
| `/api/v2/questionnaires/history/{session_id}/tags` | POST | Crear tag |
| `/api/v2/questionnaires/history/{session_id}/tags/{tag_id}` | DELETE | Eliminar tag |
| `/api/v2/questionnaires/history/{session_id}/share` | POST | Generar recurso compartido |
| `/api/v2/questionnaires/history/{session_id}/pdf/generate` | POST | Solicitar generacion de PDF |
| `/api/v2/questionnaires/history/{session_id}/pdf` | GET | Consultar estado/info de PDF |
| `/api/v2/questionnaires/history/{session_id}/pdf/download` | GET | Descargar PDF |
| `/api/v2/questionnaires/shared/{questionnaire_id}/{share_code}` | GET | Vista publica compartida |

### Observaciones de contrato

1. El servicio aplica normalizadores extensivos para tolerar distintas llaves (`data`, `result`, `session`, aliases de ids, etc.).  
   - Esto es **inferido desde el consumo del frontend**.
2. El frontend resuelve URL compartida con distintos campos (`url/share_url/public_url/link`) y fallback de ruta publica.
3. No es verificable solo con frontend cual shape exacto es canonico en backend.

## Admin: metricas operativas tradicionales

Servicios:

- `src/hooks/metrics/useMetrics.ts` (fetch directo para health/ready)
- `src/services/admin/metrics.ts`
- `src/services/admin/emailHealth.ts`

| Endpoint consumido | Metodo | Uso en frontend |
|---|---|---|
| `/healthz` | GET | Estado de servidor |
| `/readyz` | GET | Estado/latencia de base de datos |
| `/api/admin/metrics` | GET | Snapshot de metricas |
| `/api/admin/email/health` | GET | Salud del servicio de correo |

## Admin: dashboard analitico

Servicios:

- `src/services/dashboard/dashboard.api.ts`
- `src/hooks/dashboard/useDashboard.ts`

Todos consumidos por GET con query `months`:

- `/api/v2/dashboard/adoption-history`
- `/api/v2/dashboard/api-health`
- `/api/v2/dashboard/data-quality`
- `/api/v2/dashboard/drift`
- `/api/v2/dashboard/equity`
- `/api/v2/dashboard/executive-summary`
- `/api/v2/dashboard/funnel`
- `/api/v2/dashboard/human-review`
- `/api/v2/dashboard/model-monitoring`
- `/api/v2/dashboard/productivity`
- `/api/v2/dashboard/questionnaire-quality`
- `/api/v2/dashboard/questionnaire-volume`
- `/api/v2/dashboard/retention`
- `/api/v2/dashboard/user-growth`

### Observaciones

- Carga por bloque con `Promise.allSettled` (fallo parcial no tumba toda la vista).
- Normalizacion por familia (`series`, `funnel`, `adoption_history`).

## Admin: gestion de cuestionarios/evaluaciones/usuarios/psicologos/auditoria

### Cuestionarios admin (`src/services/admin/questionnaires.ts`)

- `GET /api/admin/questionnaires`
- `POST /api/admin/questionnaires/{template_id}/publish`
- `POST /api/admin/questionnaires/{template_id}/archive`
- `POST /api/admin/questionnaires/{template_id}/clone`

### Evaluaciones admin (`src/services/admin/evaluations.ts`)

- `GET /api/admin/evaluations`
- `PATCH /api/admin/evaluations/{evaluation_id}/status`

### Usuarios admin (`src/services/admin/users.ts`)

- `GET /api/admin/users`
- `PATCH /api/admin/users/{id}`
- `POST /api/admin/users/{id}/password-reset`
- `POST /api/admin/users/{id}/mfa/reset`

### Psicologos admin (`src/services/admin/psychologists.ts`)

- `POST /api/admin/psychologists/{id}/approve`
- `POST /api/admin/psychologists/{id}/reject`

### Auditoria admin (`src/services/admin/audit.ts`)

- `GET /api/admin/audit-logs`

## Reportes de incidencias (usuario/admin)

Servicio: `src/services/problemReports/problemReports.api.ts`

| Endpoint consumido | Metodo | Uso en frontend |
|---|---|---|
| `/api/problem-reports` | POST | Crear reporte de problema (Ayuda) |
| `/api/problem-reports/mine` | GET | Listado propio de reportes |
| `/api/admin/problem-reports` | GET | Listado admin de reportes |
| `/api/admin/problem-reports/{id}` | GET | Detalle admin |
| `/api/admin/problem-reports/{id}` | PATCH | Actualizacion admin (estado/notas) |

## Lo que no puede afirmarse solo con frontend

1. Contrato backend definitivo de cada endpoint (tipos estrictos, campos obligatorios, enums cerrados).
2. Garantia de disponibilidad en cada entorno (dev/stage/prod).
3. Semantica completa de codigos de error fuera de los casos manejados por UI.

Estas limitaciones no invalidan el inventario: solo delimitan su alcance a evidencia del cliente.
