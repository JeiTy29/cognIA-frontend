# Vista: Mi cuenta

## Propósito

Centralizar datos del perfil y seguridad sin usar cards como patrón principal.

## Cambios relevantes

- La composición pasó de cards en grid a secciones verticales sobrias.
- Se conservó la funcionalidad existente:
  - información de cuenta
  - cambio de contraseña
  - MFA setup / disable
  - logout
- No se convirtió la vista en tabla ni dashboard.

## Estructura actual

- encabezado simple
- sección de información de cuenta
- sección de seguridad con paneles expandibles
- sección de MFA
- cierre de sesión al final con separación visual clara

## Endpoints/acciones relacionadas

- `POST /api/auth/password/change`
- MFA setup/disable a través de los servicios auth ya existentes
- logout a través del flujo auth actual

## Archivos relacionados

- `src/pages/Plataforma/MiCuenta/MiCuenta.tsx`
- `src/pages/Plataforma/MiCuenta/MiCuenta.css`
- `src/components/MFA/MfaSetupView.tsx`
- `src/services/auth/auth.api.ts`
