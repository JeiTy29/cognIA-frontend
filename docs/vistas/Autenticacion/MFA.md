# Vista: MFA

## Ubicacion

- Pantalla principal: `src/pages/Autenticacion/MFA/MFA.tsx`
- Estilos: `src/pages/Autenticacion/MFA/MFA.css`
- Setup reutilizable: `src/components/MFA/MfaSetupView.tsx`

## Modos de uso

1. `setup` (enrolamiento)
2. `challenge` (verificacion durante login)

El modo se resuelve desde `location.state`.

## Endpoints consumidos por frontend

- `POST /api/auth/login/mfa`
- `POST /api/mfa/setup`
- `POST /api/mfa/confirm`
- `POST /api/mfa/disable`

## Challenge MFA (actualizado)

- Ruta: `/mfa` con estado de navegacion `{ mode: "challenge", challengeId }`.
- El codigo TOTP usa 6 cajas individuales:
  - 1 digito por caja
  - solo caracteres numericos
  - autoavance al escribir
  - retroceso al usar backspace en caja vacia
  - pegado de codigo (6 digitos) distribuido automaticamente
- El valor final se consolida en `code` y se envia al endpoint de login MFA.
- El flujo alterno con `recovery_code` sigue disponible y no se rompe.
- La seleccion de modo ya no usa checkbox:
  - usa un control segmentado (`Codigo TOTP` / `Codigo de recuperacion`).
  - al cambiar a recovery, se muestra input de recovery code.
  - al volver a TOTP, se recupera foco natural en las cajas de codigo.

## Setup MFA

- Usa `MfaSetupView` para QR, confirmacion y recovery codes.
- Si faltan parametros requeridos del modo setup, la vista redirige a login.

## Seguridad observable en frontend

- `challengeId` y `enrollmentToken` se mantienen en estado de navegacion/memoria.
- El `access_token` final se gestiona a traves de `useAuth`.
