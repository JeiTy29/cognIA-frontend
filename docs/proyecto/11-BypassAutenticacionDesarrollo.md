# Bypass de autenticacion para desarrollo

## Estado y naturaleza del mecanismo

El frontend incluye un bypass de autenticacion **solo para desarrollo local**.

- Evidencia: `src/utils/auth/devBypass.ts`, `src/context/AuthContext.tsx`, `src/components/DevAuthToggle/*`, `src/components/DevAuthBadge/*`.
- Este mecanismo **no representa** el flujo normal de producto.
- Debe tratarse como herramienta de desarrollo y pruebas locales de UI.

## Variables de entorno involucradas

## `VITE_DEV_AUTH_BYPASS`

- Tipo esperado: string (`"true"` para habilitar).
- Se evalua junto con `import.meta.env.DEV`.
- Si no esta en `"true"`, el bypass no se activa.

## `VITE_DEV_ROLE`

- Rol por defecto cuando bypass esta habilitado.
- Valores soportados en frontend:
  - `guardian`
  - `psychologist`
  - `admin`
- Si no hay valor valido, fallback a `guardian`.

## Comportamiento funcional observado

1. El estado de bypass se persiste en `sessionStorage`:
   - `cognia_dev_auth_active`
   - `cognia_dev_role`
2. Puede activarse/desactivarse por query params:
   - `?devAuth=on|off`
   - `?devRole=guardian|psychologist|admin`
3. Cuando esta activo:
   - `isAuthenticated` se considera `true` en contexto.
   - Se inyecta un perfil sintetico (`getDevProfile`) segun rol.
   - Se muestran controles visuales de desarrollo (`DevAuthToggle`, `DevAuthBadge`).

## Impacto en la app

- Permite recorrer rutas privadas sin login real.
- Permite probar menu/sidebar y vistas por rol sin backend.
- No reemplaza validaciones de permisos del servidor.

## Riesgos si se malinterpreta

1. Puede generar falsa percepcion de que un flujo funciona end-to-end cuando solo se valido UI.
2. Puede ocultar errores de autenticacion reales de backend durante pruebas manuales.
3. No debe usarse como evidencia de seguridad ni como criterio de aceptacion productivo.

## Regla de uso recomendada

- Usar bypass solo para desarrollo local y prototipado de interfaz.
- Para validar flujos reales de seguridad/autorizacion, usar autenticacion normal contra backend real.
