# Vista: Activar Cuenta

## Descripción general

Pantalla para ingresar el código de activación enviado por correo.

## Ubicación

- Componente: `src/pages/Autenticacion/ActivarCuenta/ActivarCuenta.tsx`
- Estilos: `src/pages/Autenticacion/ActivarCuenta/ActivarCuenta.css`
- Ruta: `/activar-cuenta`

## Estructura

- Logo superior (`.header-brand`) con link a `/`.
- Texto de soporte `.auth-support-text`.
- Tarjeta azul `.codigo-card` con 6 inputs.
- Botón principal **Confirmar**.
- Footer de versión `.version-footer`.
- Reutiliza el layout `auth-*` definido en `InicioSesion.css`.

## Estado y lógica

- `codigo: string[]` de 6 posiciones.
- `handleCodigoChange`:
  - Limita a 1 carácter alfanumérico.
  - Convierte a mayúsculas.
  - Auto-focus al siguiente input.
- `handleKeyDown`:
  - Backspace regresa al input anterior.

## Estilos clave

- Inputs cuadrados **50x60**, borde blanco y foco azul.
- Card con fondo **#51C2F4** y radio 16px.

## Clases CSS clave

- `.codigo-card`, `.codigo-inputs`, `.codigo-input`, `.auth-support-text`.

## Navegación

- Logo superior → `/`.

## Responsive

- `max-width: 600px` y `480px`: inputs y padding más pequeños.
