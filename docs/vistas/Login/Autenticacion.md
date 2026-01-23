# Vista: Autenticación

## Descripción general

Pantalla de verificación con QR y código de 6 dígitos. Se muestra después del login.

## Ubicación

- Componente: `src/pages/Autenticacion/Autenticacion/Autenticacion.tsx`
- Estilos: `src/pages/Autenticacion/Autenticacion/Autenticacion.css`
- Ruta: `/autenticacion`

## Estructura

- Layout de dos paneles (mismo estilo de login).
- Logo superior con link a `/`.
- Tarjeta `.qr-card` para lector QR (placeholder por ahora).
- Texto interno `.qr-placeholder` con “QR”.
- Input centrado `.auth-code-input` para 6 dígitos.
- Footer de versión `.version-footer`.
 - Reutiliza las clases base `auth-*` definidas en `InicioSesion.css`.

## Estado y lógica

- `codigo: string` → solo números (`replace(/\D/g, '')`).
- `maxLength={6}` para restringir longitud.

## Estilos clave

- QR card con borde punteado y fondo **#f7fbff**.
- Código con `letter-spacing: 6px` para legibilidad.

## Clases CSS clave

- `.auth-2fa`, `.qr-card`, `.qr-placeholder`, `.auth-code-input`.

## Navegación

- Logo → `/`.

## Responsive

- `max-width: 480px`: QR más compacto y tracking de texto menor.

## Flujo de usuario

1. Escanea el QR con app de autenticación.
2. Ingresa el código de 6 dígitos.
3. Presiona **Verificar** (pendiente de integración backend).
