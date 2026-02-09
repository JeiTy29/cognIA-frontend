# Vista: MFA

## Descripción general

La verificación MFA se divide en dos contextos, usando **una sola vista** y un setup reutilizable:

1) **Challenge** durante login (ruta `/mfa`).
2) **Setup/Enrollment** usando el mismo `/mfa` con `state` y el componente **MfaSetupView**.

El setup se renderiza con un componente reutilizable: **MfaSetupView**.

## Ubicación

- Challenge / Setup: `src/pages/Autenticacion/MFA/MFA.tsx`
- Setup reutilizable: `src/components/MFA/MfaSetupView.tsx`
- Estilos setup: `src/components/MFA/MfaSetupView.css`
- Estilos challenge: `src/pages/Autenticacion/MFA/MFA.css`

## Endpoints relacionados

- `POST /api/auth/login/mfa` (verificación MFA durante login)
- `POST /api/mfa/setup` (genera `otpauth_uri` para QR)
- `POST /api/mfa/confirm` (confirma el código y retorna recovery codes)
- `POST /api/mfa/disable` (deshabilita MFA)

## Authorization (Bearer)

- Todos los endpoints protegidos usan **Bearer**:
  - `Authorization: Bearer <access_token>`

## Etiqueta visible en la app autenticadora

- Formato: `CogniaApp: <usuario> (<dispositivo> - DD/MM/YYYY)`
- Ejemplo: `CogniaApp: JeiTy (iPhone - 09/02/2026)`
- El frontend muestra esta etiqueta debajo del QR y genera el QR con la misma etiqueta (URL-encodeada).
- El dispositivo se detecta por user agent (Android/iPhone) o se permite seleccionar/editar.
- La fecha se toma de `created_at` si el backend la entrega; si no, se usa la fecha actual.

## Setup MFA (enrollment / setup)

### Login (psicólogo)

- Si el login responde `mfa_enrollment_required`, la app navega a `/mfa` con `state`:
  - `{ mode: "setup", enrollmentToken, expiresIn }`.
- Se usa `enrollment_token` **solo en memoria** (no storage).
- El usuario escanea el QR, ingresa el código de 6 dígitos y confirma.
- Se muestran **recovery codes** en un modal bloqueante una sola vez.
- Tras guardar los códigos, se limpia la memoria y se muestra el mensaje para iniciar sesión nuevamente.

### Mi Cuenta (padre/tutor)

- Botón **Activar MFA** abre un modal con **MfaSetupView**.
- Se usa `access_token` actual (Authorization header).
- Recovery codes se muestran en modal bloqueante, se pueden copiar y luego se limpian de memoria.
- Nota visible: se indica eliminar entradas antiguas y usar la entrada con la fecha más reciente.

## Challenge MFA

- Ruta: `/mfa` con `state` `{ mode: "challenge", challengeId, expiresIn }`.
- El usuario ingresa el código TOTP o un recovery code.
- Si es válido, se guarda el `access_token` y se redirige según rol.
- Si no llega `challengeId`, se redirige a `/inicio-sesion`.

## Seguridad de tokens

- `enrollment_token` y `challenge_id` **no** se guardan en storage.
- Se pasan por `navigate(..., { state })` o se mantienen en memoria durante el flujo.
- Recovery codes se muestran una sola vez y no se persisten.
- El access token se guarda en `sessionStorage` (`cognia_access_token`).
