# Vista: MFA

## Descripción general

La verificación MFA se divide en dos contextos:

1) **Challenge** durante login (ruta `/mfa/challenge`).
2) **Setup/Enrollment** en línea dentro del login o dentro de modales en Mi Cuenta.

El setup se renderiza con un componente reutilizable: **MfaSetupView**.

## Ubicación

- Challenge: `src/pages/Autenticacion/MFA/MFA.tsx`
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

## Setup MFA (enrollment / setup)

### Login (psicólogo)

- Si el login responde `mfa_enrollment_required`, se muestra **MfaSetupView** inline.
- Se usa `enrollment_token` **solo en memoria** (no storage).
- El usuario escanea el QR, ingresa el código de 6 dígitos y confirma.
- Se muestran **recovery codes** en un modal bloqueante una sola vez.
- Tras guardar los códigos, se limpia la memoria y se muestra el mensaje para iniciar sesión nuevamente.

### Mi Cuenta (padre/tutor)

- Botón **Activar MFA** abre un modal con **MfaSetupView**.
- Se usa `access_token` actual (Authorization header).
- Recovery codes se muestran en modal bloqueante, se pueden copiar y luego se limpian de memoria.

## Challenge MFA

- Ruta: `/mfa/challenge`.
- El usuario ingresa el código TOTP o un recovery code.
- Si es válido, se guarda el `access_token` y se redirige según rol.

## Seguridad de tokens

- `enrollment_token` y `challenge_id` **no** se guardan en storage.
- Recovery codes se muestran una sola vez y no se persisten.
- El access token se guarda en `sessionStorage` (`cognia_access_token`).
