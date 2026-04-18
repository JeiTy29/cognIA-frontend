# Vista: Mi cuenta

## Objetivo funcional
- Centralizar perfil y seguridad con acciones activas del backend.

## Archivo tocado
- `src/pages/Plataforma/MiCuenta/MiCuenta.tsx`

## Ajuste aplicado
- Se eliminó completamente el flujo **Cambiar correo** (UI, estado y handlers).
- Se mantuvieron:
  - cambio de contraseña
  - activación/desactivación MFA
  - cierre de sesión
  - visualización de datos de cuenta

## Endpoints/acciones que siguen vigentes
- `POST /api/auth/password/change`
- flujos MFA actuales (`setup/disable`) vía `auth.api.ts`
- logout actual

## Pruebas manuales
1. Abrir `/padre/cuenta` o `/psicologo/cuenta`.
2. Verificar que no existe opción de cambio de correo.
3. Cambiar contraseña y validar feedback.
4. Activar/desactivar MFA y validar comportamiento.
5. Cerrar sesión.
