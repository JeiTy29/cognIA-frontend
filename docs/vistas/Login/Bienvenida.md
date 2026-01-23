# Vista: Bienvenida

## Descripción general

Pantalla final de confirmación después de activar cuenta.

## Ubicación

- Componente: `src/pages/Autenticacion/Bienvenida/Bienvenida.tsx`
- Estilos: `src/pages/Autenticacion/Bienvenida/Bienvenida.css`
- Ruta: `/bienvenida`

## Estructura

- Layout de dos paneles (igual a login).
- Logo superior con link a `/`.
- Texto de éxito `.auth-support-text`.
- Botonera horizontal `.button-group-horizontal`.
- Footer de versión `.version-footer`.
- Reutiliza el layout `auth-*` definido en `InicioSesion.css`.

## Botones

- **Iniciar sesión** → `/inicio-sesion` (color **#1790E9**).
- **Volver al inicio** → `/` (color **#215F8F**).

## Clases CSS clave

- `.button-group-horizontal`, `.btn-primary-link`, `.btn-login-color`, `.btn-home-color`.

## Responsive

- `max-width: 600px`: botones apilados en columna.
