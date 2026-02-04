# Vista: MFA

## Descripción general

Pantalla reutilizable de verificación en dos pasos con dos modos: **setup** (configuración inicial) y **challenge** (verificación durante login).

## Ubicación

- Componente: `src/pages/Autenticacion/MFA/MFA.tsx`
- Estilos: `src/pages/Autenticacion/MFA/MFA.css`
- Rutas: `/mfa/setup` y `/mfa/challenge`

## Endpoints relacionados

- `POST /api/auth/login/mfa` (verificación MFA durante login)
- `POST /api/mfa/setup` (genera `otpauth_uri` para QR)
- `POST /api/mfa/confirm` (confirma el código)
- `POST /api/mfa/disable` (deshabilita MFA)

## Authorization (Bearer)

- Todos los endpoints protegidos usan **esquema Bearer**:
  - `Authorization: Bearer <access_token>`.

## Modos de la vista

### Modo setup

- Título: “Configurar verificación en dos pasos”.
- Muestra QR generado desde `otpauth_uri`.
- El usuario ingresa el código de 6 dígitos.
- Al confirmar, se redirige a `/inicio-sesion` con mensaje de MFA configurado.

### Modo challenge

- Título: “Verificación requerida”.
- No muestra QR.
- El usuario ingresa el código de 6 dígitos o un código de recuperación.
- Si valida, se guarda el `access_token` y se redirige según rol.

## Flujo de navegación

- El modo se determina por `state` en `navigate` (`mode`, `challengeId`, `enrollmentToken`).
- Si se entra sin `state` válido, la vista redirige a `/inicio-sesion`.

## Seguridad de tokens

- `challenge_id` y `enrollment_token` **no** se guardan en storage; se mantienen solo en memoria.
- El token de acceso se guarda en `sessionStorage` (clave `cognia_access_token`).

## Mensajes de estado

- Errores de código muestran mensaje inline (sin logs de tokens).
- Feedback de éxito en confirmación de MFA.
