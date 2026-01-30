# Vista: MFA

## Descripción general

Pantalla reutilizable de verificación en dos pasos con dos modos: **setup** (configuración inicial) y **challenge** (verificación durante login).

## Ubicación

- Componente: `src/pages/Autenticacion/MFA/MFA.tsx`
- Estilos: `src/pages/Autenticacion/MFA/MFA.css`
- Rutas: `/mfa/setup` y `/mfa/challenge`

## Modos

### Modo setup

- Título: “Configurar verificación en dos pasos”.
- Muestra QR (`.qr-card`) + texto guía para escanear e ingresar el código.
- Botón principal: **Confirmar**.
- Nota inferior: “Si no puedes escanear el QR…”.

### Modo challenge

- Título: “Verificación requerida”.
- Oculta por completo el QR.
- Texto guía: ingresar el código de 6 dígitos.
- Botón principal: **Verificar**.

## Estructura base

- Layout de dos paneles (mismo estilo de login).
- Logo superior con link a `/`.
- Input centrado `.auth-code-input` para 6 dígitos.
- Footer de versión `.version-footer`.
- Reutiliza las clases base `auth-*` definidas en `InicioSesion.css`.

## Estado y lógica

- `codigo: string` → solo números (`replace(/\D/g, '')`).
- `maxLength={6}` para restringir longitud.
- El modo se toma desde el parámetro de ruta `:mode`.

## Estilos clave

- QR card con borde punteado y fondo **#f7fbff**.
- Código con `letter-spacing: 6px` para legibilidad.
- Nota `.auth-mfa-note` con tipografía pequeña y color neutro.

## Clases CSS clave

- `.auth-2fa`, `.auth-mfa`, `.qr-card`, `.qr-placeholder`, `.auth-code-input`, `.auth-mfa-note`.

## Navegación

- Logo → `/`.
- Botón principal → `/padre/cuestionario` (pendiente de integración backend).

## Responsive

- `max-width: 480px`: QR más compacto y tracking de texto menor.

## Flujo de usuario

1. Accede a `/mfa/setup` o `/mfa/challenge`.
2. Ingresa el código de 6 dígitos (y escanea QR si está en setup).
3. Presiona el botón principal para continuar.
