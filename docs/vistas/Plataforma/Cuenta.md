# Vista: Mi Cuenta

## Objetivo funcional
- Centralizar perfil y seguridad del usuario autenticado.

## Archivo principal
- `src/pages/Plataforma/MiCuenta/MiCuenta.tsx`
- `src/pages/Plataforma/MiCuenta/MiCuenta.css`

## Endpoints/acciones activos
- `POST /api/auth/password/change`
- flujo MFA setup (`/api/mfa/setup`, `/api/mfa/confirm` a traves de `MfaSetupView`)
- `POST /api/mfa/disable` (solo para perfiles permitidos)
- logout actual

## Regla funcional aplicada (ronda 2026-04-24)
- Para `admin` y `psicologo`, MFA se presenta como obligatorio:
  - no se muestra accion de `Desactivar MFA`.
  - se muestra indicador visual `Obligatorio`.
  - si MFA no esta activo, se prioriza `Activar MFA`.
- Para guardian, el flujo de desactivacion MFA se mantiene disponible.

## Alcance
- Este ajuste es de UI/UX y control de acciones permitidas en frontend.
- La exigencia de MFA en backend no es verificable solo con evidencia frontend.

## Validacion manual sugerida
1. Abrir cuenta con perfil admin.
2. Abrir cuenta con perfil psicologo.
3. Confirmar que no aparece accion para desactivar MFA.
4. Abrir cuenta con guardian y confirmar que su flujo actual se mantiene.
