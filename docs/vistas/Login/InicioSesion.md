# Vista: Inicio de Sesión

## Descripción general

Formulario de acceso con validación visual básica, alternado de contraseña y navegación a autenticación.

## Ubicación

- Componente: `src/pages/Autenticacion/InicioSesion/InicioSesion.tsx`
- Estilos: `src/pages/Autenticacion/InicioSesion/InicioSesion.css`
- Ruta: `/inicio-sesion`

## Estructura

- Layout en dos paneles:
  - `.auth-left-panel`: 40% azul **#51C2F4**.
- `.auth-right-panel`: 60% blanco.
- Logo superior (`.header-brand`) con link a `/`.
- Formulario con correo, contraseña y botón principal.

Detalle de logo:
- `.brand-icon` 36px con letra “c” sobre fondo **#51C2F4**.
- `.brand-text` en **#215F8F**.

Campos:
- Email con placeholder “Correo electrónico”.
- Password con placeholder “Contraseña”.

## Estado y lógica

- `mostrarContrasena: boolean` → alterna tipo `text/password`.
- `handleSubmit` ejecuta `navigate('/autenticacion')`.

## Interacciones

- Ícono de ojo (`.password-toggle`) alterna visibilidad.
- Enlace “Regístrate” → `/registro`.
- Enlace “¿Olvidaste tu contraseña?” → `/recuperar-contrasena`.

## Flujo de usuario

1. Ingresa correo y contraseña.
2. (Opcional) Activa el ícono de ojo para ver la contraseña.
3. Presiona **Ingresar** y navega a `/autenticacion`.

## Estilos clave

- Inputs con borde **#E0E0E0**, foco en **#1790E9**.
- Botón principal **#1790E9** con hover **#1370c0**.
- Footer de versión en gris claro.

## Clases CSS clave

- `.auth-container`, `.auth-content`, `.form-input`, `.password-toggle`, `.btn-primary`.

## Responsive

- `max-width: 768px`: se oculta panel izquierdo y el contenido se centra.
- `max-width: 480px`: padding reducido, tipografías pequeñas.
