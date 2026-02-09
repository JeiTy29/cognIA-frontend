# ProtectedRoute

## Ubicación
- Componente: `src/components/ProtectedRoute/ProtectedRoute.tsx`
- Estilos: `src/components/ProtectedRoute/ProtectedRoute.css`

## Propósito
Asegura que las rutas privadas solo se muestren cuando el usuario está autenticado y su rol corresponde a la sección solicitada.

## Props
- `allowedRoles?: string[]`
  - Si no se envía, solo valida autenticación.
  - Acepta roles por nombre (`padre`, `psicologo`, `admin`) o en formato de backend (`GUARDIAN`, `PSYCHOLOGIST`, `ADMIN`).
  - `'*'` indica que cualquier usuario autenticado puede entrar.

## Comportamiento

### No autenticado
- Redirige a `/inicio-sesion`.
- Envía un mensaje en `location.state.message`:
  - “Debes iniciar sesión para acceder a esta sección.”

### Autenticado sin rol permitido
- Muestra pantalla **Acceso denegado** (no renderiza el contenido protegido).
- Explica el motivo y ofrece botón **Ir a mi área** con redirección según rol.
- Incluye botones de contacto a soporte (WhatsApp, Gmail, Outlook, copiar correo).

### Autenticado con rol permitido
- Renderiza las rutas hijas normalmente.

## Política de roles
- **ADMIN** solo accede a rutas `/admin/*`.
- **PSYCHOLOGIST** solo accede a rutas `/psicologo/*`.
- **GUARDIAN** solo accede a rutas `/padre/*`.

## Roles y redirección por defecto
- `GUARDIAN` → `/padre/cuestionario`
- `PSYCHOLOGIST` → `/psicologo/cuestionario`
- `ADMIN` → `/admin/metricas`

## Fallback de rutas
- Si no existe una ruta válida, se redirige a `/` (Bienvenida).
- Si hay sesión válida, se intenta enviar a la ruta principal de su rol.

## Notas de UX
- Se muestra loader si la sesión o el perfil aún están cargando para evitar falsos negativos.
- No se ejecuta logout automático por falta de rol.
