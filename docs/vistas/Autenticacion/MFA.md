# Vista: MFA

## Descripción general

Pantalla reutilizable de verificación en dos pasos con dos modos: **setup** (configuración inicial) y **challenge** (verificación durante login).

## Ubicación

- Componente: `src/pages/Autenticacion/MFA/MFA.tsx`
- Estilos: `src/pages/Autenticacion/MFA/MFA.css`
- Rutas: `/mfa/setup` y `/mfa/challenge`

## Endpoints relacionados

- `POST /api/auth/login/mfa` → completa el challenge con `challenge_id` y código.
- `POST /api/mfa/setup` → genera `otpauth_uri` para QR.
- `POST /api/mfa/confirm` → confirma TOTP y finaliza enrolamiento.
- `POST /api/mfa/disable` → deshabilita MFA (no usado aquí).

## Modo setup

- Título: “Configurar verificación en dos pasos”.
- Muestra QR (`.qr-card`) generado desde `otpauth_uri`.
- Input de 6 dígitos + botón **Confirmar**.
- Nota inferior: “Si no puedes escanear el QR…”.

### Flujo setup

1. El login redirige con `state` `{ mode: 'setup', enrollmentToken }`.
2. La vista llama `POST /api/mfa/setup` con `Authorization: Bearer <enrollmentToken>`.
3. Se genera el QR y se muestra al usuario.
4. El usuario ingresa el código y se llama `POST /api/mfa/confirm`.
5. En éxito, redirige a `/inicio-sesion` con mensaje de confirmación.

## Modo challenge

- Título: “Verificación requerida”.
- No muestra QR.
- Input de 6 dígitos + botón **Verificar**.
- Opción para usar **código de recuperación**.

### Flujo challenge

1. El login redirige con `state` `{ mode: 'challenge', challengeId }`.
2. El usuario ingresa el código (o recovery) y se llama `POST /api/auth/login/mfa`.
3. En éxito, se guarda el `access_token` y se redirige a la plataforma según rol.

## Seguridad de tokens

- `challengeId` y `enrollmentToken` se mantienen **solo en memoria** (React Router `state`).
- No se guardan en localStorage, sessionStorage ni query params.
- Si el usuario entra a `/mfa/*` sin `state` válido, se redirige a `/inicio-sesion`.

## Estructura base

- Layout de dos paneles (mismo estilo de login).
- Logo superior con link a `/`.
- Input centrado `.auth-code-input` para 6 dígitos.
- Footer de versión `.version-footer`.

## Estilos clave

- QR card con borde punteado y fondo **#f7fbff**.
- Código con `letter-spacing: 6px` para legibilidad.
- Nota `.auth-mfa-note` con tipografía pequeña y color neutro.

## Clases CSS clave

- `.auth-2fa`, `.auth-mfa`, `.qr-card`, `.qr-placeholder`, `.qr-image`, `.auth-code-input`, `.auth-mfa-note`.

## Validaciones

- El código debe tener 6 dígitos.
- Si se usa recovery, el input de recovery es obligatorio.

## Navegación

- Logo → `/`.
- En modo setup: redirige a `/inicio-sesion` tras confirmar.
- En modo challenge: redirige a plataforma según rol.

## Responsive

- `max-width: 480px`: QR más compacto y tracking de texto menor.

