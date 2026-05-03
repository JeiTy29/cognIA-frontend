# Flujos de usuario implementados (frontend vigente)

## Convenciones de lectura

- "Evidencia frontend": comprobable en componentes, hooks y servicios del repositorio.
- "Inferido desde el consumo del frontend": deduccion por normalizadores o manejo de payload.
- "No verificable solo con evidencia frontend": requiere backend o contrato externo para afirmacion definitiva.

## 1) Registro

### Punto de entrada y rutas

- Ruta: `/registro`
- Componente: `src/pages/Autenticacion/Registro/Registro.tsx`

### Componentes/servicios relevantes

- Hook: `useRegister`
- Servicio: `registerUser` en `src/services/auth/auth.api.ts`
- Endpoint consumido: `POST /api/auth/register`

### Secuencia funcional observada

1. Usuario selecciona tipo (`padre` o `psicologo`) en UI.
2. Completa formulario y acepta terminos/privacidad.
3. Frontend valida:
   - formato de username
   - politicas de password
   - coincidencia de password
4. Se envia payload:
   - padre -> `user_type: guardian`
   - psicologo -> `user_type: psychologist` + `full_name` + `professional_card_number`
5. En exito, se muestra confirmacion y redireccion a `/inicio-sesion`.

### Restricciones visibles

- El flujo exige lectura previa de terminos y privacidad (control de UI).
- No se observa en frontend creacion de usuario admin por esta pantalla.

## 2) Inicio de sesion

### Punto de entrada y rutas

- Ruta: `/inicio-sesion`
- Componente: `src/pages/Autenticacion/InicioSesion/InicioSesion.tsx`

### Servicios y endpoints

- `login` -> `POST /api/auth/login`
- `requestPasswordReset` -> `POST /api/auth/password/forgot` (modal "Olvidaste tu contrasena")

### Secuencia funcional observada

1. Frontend valida formato de username.
2. Llama `login`.
3. Maneja 3 escenarios de respuesta:
   - token directo (`access_token`) -> crea sesion en `AuthProvider`
   - `mfa_required` -> navega a `/mfa` modo challenge
   - `mfa_enrollment_required` -> navega a `/mfa` modo setup
4. Si login exitoso con token, redirige por rol (`/admin/metricas`, `/psicologo/cuestionario`, `/padre/cuestionario`).

### Restricciones visibles

- Mensajes de error de credenciales controlados por frontend.
- No se verifica semantica completa del backend; solo el shape esperado por cliente.

## 3) MFA

### Punto de entrada y rutas

- Ruta: `/mfa`
- Componente: `src/pages/Autenticacion/MFA/MFA.tsx`

### Servicios y endpoints

- `loginMfa` -> `POST /api/auth/login/mfa`
- setup/confirmacion visual delegada a `MfaSetupView` (usa servicios MFA de auth API)

### Secuencia funcional observada

- Modo `setup`: usa `enrollmentToken` recibido desde login.
- Modo `challenge`: valida `challengeId` y permite:
  - codigo TOTP (`code`)
  - recovery code (`recovery_code`)
- En exito, guarda sesion y redirige por rol.

### Restricciones visibles

- Si faltan parametros de navegacion (`challengeId` o `enrollmentToken`) redirige a login.
- En Mi Cuenta, perfiles `admin` y `psicologo` no exponen accion para desactivar MFA (MFA obligatorio desde UX frontend).

## 4) Recuperacion y restablecimiento de contrasena

### Punto de entrada y rutas

- Solicitud de enlace: modal en `/inicio-sesion`
- Restablecimiento: `/restablecer-contrasena?token=...`
- Componente de reset: `src/pages/Autenticacion/RestablecerContraseña/RestablecerContraseña.tsx`

### Servicios y endpoints

- `requestPasswordReset` -> `POST /api/auth/password/forgot`
- `verifyResetToken` -> `GET /api/auth/password/reset/verify?token=...`
- `resetPassword` -> `POST /api/auth/password/reset`

### Secuencia funcional observada

1. Se solicita enlace por email desde login.
2. Pantalla de reset verifica token antes de habilitar submit.
3. Usuario define nueva password con validaciones de frontend.
4. En exito, muestra confirmacion y permite volver a login.

## 5) Inicio de cuestionario (padre/psicologo)

### Punto de entrada y rutas

- Rutas:
  - `/padre/cuestionario`
  - `/psicologo/cuestionario`
- Componente: `src/pages/Plataforma/Cuestionario/Cuestionario.tsx`

### Servicios/endpoints consumidos

- `getActiveQuestionnairesV2` -> `GET /api/v2/questionnaires/active`
- `getQuestionnaireHistoryV2` -> `GET /api/v2/questionnaires/history` (draft/in_progress)
- `createQuestionnaireSessionV2` -> `POST /api/v2/questionnaires/sessions`
- `getQuestionnaireSessionPageV2` -> `POST /api/v2/questionnaires/sessions/{session_id}/page-secure` cuando el transporte cifrado esta activo
- `getQuestionnaireSessionV2` -> `POST /api/v2/questionnaires/sessions/{session_id}/secure` cuando el transporte cifrado esta activo

### Secuencia funcional observada

1. Se consulta cuestionario activo por modo/rol.
2. Se consulta historial reutilizable (`in_progress` y `draft`) para detectar continuidad.
3. Si hay sesion reutilizable, la UI ofrece:
   - continuar sesion
   - empezar de nuevo
4. Si el usuario continua:
   - se reutiliza `session_id` existente
   - se cargan preguntas y detalle de sesion para restaurar respuestas.
5. Si el usuario empieza de nuevo:
   - se crea sesion (`POST /sessions`)
   - se carga pagina de preguntas inicial
   - se consulta detalle de sesion para sincronizar estado.

### Nota de contrato

- El frontend usa normalizadores extensivos para aceptar variantes de payload.  
  Esto es **inferido desde consumo frontend** y no certifica contrato backend definitivo.

## 6) Respuesta y diligenciamiento del cuestionario

### Servicios/endpoints consumidos

- Guardado de respuestas: `patchQuestionnaireSessionAnswersV2` -> `PATCH /api/v2/questionnaires/sessions/{session_id}/answers`

### Comportamiento observado

- La UI mantiene respuestas locales por pregunta y envia parches de respuestas.
- Se preserva identificacion por `question_id`/item normalizado.
- El estado de sesion se mantiene visible para progreso y navegacion de preguntas.

## 7) Finalizacion del cuestionario y procesamiento

### Servicios/endpoints consumidos

- `submitQuestionnaireSessionV2` -> `POST /api/v2/questionnaires/sessions/{session_id}/submit`
- polling de sesion -> `POST /api/v2/questionnaires/sessions/{session_id}/secure` cuando el transporte cifrado esta activo
- resultados finales -> `POST /api/v2/questionnaires/history/{session_id}/results-secure`
- informe orientativo -> `POST /api/v2/questionnaires/history/{session_id}/clinical-summary`

### Estados observables en frontend

- Fase interna de UI: `idle | submitting | processing | processed | failed`
- Estado backend consumido: `draft | in_progress | submitted | processed | failed | archived`

### Comportamiento observado

1. Frontend guarda respuesta final pendiente.
2. Ejecuta `submit`.
3. Si el backend confirma estado terminal `processed`, el frontend consulta artefactos seguros de resultados.
4. Si todavia no hay estado terminal, inicia polling de estado hasta estado terminal o timeout.
5. En `processed` muestra informe orientativo con disclaimer obligatorio; en `failed` muestra error accionable.

## 8) Historial

### Punto de entrada y rutas

- Padre: `/padre/historial`
- Psicologo: `/psicologo/historial`
- Componente base: `src/pages/Plataforma/Historial/HistorialBase.tsx`

### Servicios/endpoints consumidos

- `getQuestionnaireHistoryV2` -> `POST /api/v2/questionnaires/history/secure` cuando el transporte cifrado esta activo
- `getQuestionnaireHistoryDetailV2` -> `GET /api/v2/questionnaires/history/{session_id}`
- `getQuestionnaireHistoryResultsV2` -> `POST /api/v2/questionnaires/history/{session_id}/results-secure`
- `getQuestionnaireClinicalSummaryV2` -> `POST /api/v2/questionnaires/history/{session_id}/clinical-summary`

### Acciones visibles

- filtro por estado
- paginacion
- apertura de detalle por sesion
- visualizacion de resultados normalizados en tabla clave/valor

## 9) Comparticion de resultados

### Punto de entrada

- Dentro del detalle de historial (modal en `HistorialBase.tsx`)

### Servicios/endpoints consumidos

- `shareQuestionnaireHistoryV2` -> `POST /api/v2/questionnaires/history/{session_id}/share`

### Comportamiento observado

- Se permite configurar expiracion, max usos y usuario destino.
- Ya no se muestran controles de permisos `permitir tags` / `permitir PDF` en la interfaz.
- El frontend intenta resolver URL compartida en este orden:
  - `url`, `share_url`, `public_url`, `link`, `share_link`, `public_link`
  - fallback inferido: `/cuestionario/compartido/{questionnaire_id}/{share_code}`

### Nota de contrato

- La resolucion de URL es **inferida desde consumo frontend** por la variedad de campos admitidos.

## 10) Generacion/descarga de PDF

### Punto de entrada

- Dentro del detalle de historial

### Servicios/endpoints consumidos

- generar: `POST /api/v2/questionnaires/history/{session_id}/pdf/generate`
- consultar estado/info: `GET /api/v2/questionnaires/history/{session_id}/pdf`
- descargar: `GET /api/v2/questionnaires/history/{session_id}/pdf/download`

### Comportamiento observado

- El frontend consulta estado PDF antes de descargar y usa nombre derivado de `content-disposition` cuando existe.

## 11) Consulta de resultado compartido (vista publica)

### Punto de entrada y rutas

- Ruta publica: `/cuestionario/compartido/:questionnaireId/:shareCode`
- Componente: `src/pages/Plataforma/CuestionarioCompartido/CuestionarioCompartido.tsx`

### Servicio/endpoint consumido

- `getSharedQuestionnaireV2` -> `POST /api/v2/questionnaires/shared/access-secure` cuando el transporte cifrado esta activo

### Bloques que renderiza la UI

- `session`
- `result`
- `domains`
- `comorbidity`

### Manejo de errores visible

- mensajes diferenciados para `400`, `403`, `404`, `410`, `5xx`

### Restricciones observables

- Si faltan params de ruta (`questionnaireId` o `shareCode`) no dispara request valido y muestra error.

## Flujo por rol (resumen)

- Padre/Tutor:
  - cuestionario, historial, ayuda, cuenta
- Psicologo:
  - cuestionario, historial, sugerencias, ayuda, cuenta
- Admin:
  - metricas, dashboard, cuestionarios, evaluaciones, usuarios, psicologos, auditoria, reportes, cuenta

La matriz completa de rutas y guardas esta en `09-NavegacionFrontendVigente.md`.
