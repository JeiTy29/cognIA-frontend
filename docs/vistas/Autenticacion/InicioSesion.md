ï»¿# Vista: Inicio de SesiÃ³n

## DescripciÃ³n general

Formulario de acceso con credenciales (nombre de usuario + contraseÃ±a). Inicia el flujo de autenticaciÃ³n y decide si el usuario entra directo a la plataforma o debe completar MFA.

## UbicaciÃ³n

- Componente: `src/pages/Autenticacion/InicioSesion/InicioSesion.tsx`
- Estilos: `src/pages/Autenticacion/InicioSesion/InicioSesion.css`
- Ruta: `/inicio-sesion`

## Endpoint

- `POST /api/auth/login`
- Base URL: `VITE_API_BASE_URL=https://cognia-api.onrender.com`
- Body: `{ username, password }`

## Respuestas posibles (200)

1) **Login completo**
- Respuesta: `{ access_token, token_type, expires_in }`
- AcciÃ³n: guarda `access_token` en sessionStorage y redirige a la plataforma segÃºn rol.

2) **MFA requerido (challenge)**
- Respuesta: `{ mfa_required: true, challenge_id, expires_in, msg, error }`
- AcciÃ³n: navega a `/mfa/challenge` usando `state` con `challengeId` (no se persiste).

3) **MFA enrollment requerido**
- Respuesta: `{ mfa_enrollment_required: true, enrollment_token, token_type, expires_in, msg, error }`
- AcciÃ³n: navega a `/mfa/setup` usando `state` con `enrollmentToken` (no se persiste).

## Manejo de errores

- 400/401: âUsuario o contraseÃ±a incorrectos.â
- Otros: âOcurriÃ³ un error al iniciar sesiÃ³n. Intenta nuevamente.â

## Estado y lÃ³gica

- `username`, `password`, `loading`, `errorMessage`, `infoMessage`.
- `mostrarContrasena` alterna tipo `text/password`.
- Si el usuario ya estÃ¡ autenticado, se redirige automÃ¡ticamente a la plataforma.

### ValidaciÃ³n rÃ¡pida de usuario

- PatrÃ³n HTML: `^[A-Za-z0-9._-]{3,32}$` (sin delimitadores ni flags).
- Diferencia mayÃºsculas/minÃºsculas.

## Almacenamiento de sesiÃ³n

- `access_token`: se guarda en **sessionStorage** (persistente al recargar, se pierde al cerrar la pestaÃ±a).
- Se decodifica el JWT para extraer `roles` y `exp`.
- **No** se guardan en storage: `challenge_id` ni `enrollment_token`.

## Manejo de errores esperados

- Credenciales invÃ¡lidas se manejan como flujo normal (sin logs ni errores no capturados).

## Logout (referencia tÃ©cnica)

- Endpoint: `POST /api/auth/logout`
- Header requerido: `X-CSRF-Token` con el valor de la cookie `csrf_refresh_token`.
- Se envÃ­an cookies con `credentials: include`.
- El frontend limpia siempre los tokens locales aunque el backend responda 401.

## RedirecciÃ³n por rol

- `GUARDIAN` â `/padre/cuestionario`
- `PSYCHOLOGIST` â `/psicologo/cuestionario`

## Rutas protegidas

- Las rutas de plataforma estÃ¡n envueltas por `ProtectedRoute`.
- Si no hay sesiÃ³n vÃ¡lida, se redirige a `/inicio-sesion` con aviso breve.

## Interacciones

- Enlace âRegÃ­strateâ â `/registro`.
- Enlace âÂ¿Olvidaste tu contraseÃ±a?â â `/recuperar-contrasena`.

## Flujo de usuario

1. Ingresa usuario y contraseÃ±a.
2. Presiona **Ingresar**.
3. Si hay MFA, navega a `/mfa/challenge` o `/mfa/setup`.
4. Si no hay MFA, entra directo a la plataforma segÃºn rol.

## Estilos clave

- Inputs con borde **#E0E0E0**, foco en **#1790E9**.
- BotÃ³n principal **#1790E9** con hover **#1370c0**.
- Mensajes con `.validation-error` y `.validation-success`.

## Clases CSS clave

- `.auth-container`, `.auth-content`, `.form-input`, `.password-toggle`, `.btn-primary`.

## Responsive

- `max-width: 768px`: se oculta panel izquierdo y el contenido se centra.
- `max-width: 480px`: padding reducido, tipografÃ­as pequeÃ±as.

## Refresh de sesiÃ³n

- Endpoint: `POST /api/auth/refresh`.
- Header: `X-CSRF-Token` con el valor de la cookie `csrf_refresh_token`.
- `credentials: include` para enviar cookies.
- Si el access token expira, el frontend intenta refresh de forma silenciosa.
- Si falla (401), se limpia la sesiÃ³n local y se redirige a `/inicio-sesion`.
- Se reintenta una sola vez en requests protegidos cuando hay 401.


## Authorization (token crudo)

- Los endpoints protegidos usan `Authorization: <access_token>` (sin `Bearer`).
- El access token se lee desde `sessionStorage` con la clave `cognia_access_token`.

## Perfil (/api/auth/me)

- Endpoint: `GET /api/auth/me`
- Headers: `Accept: application/json`, `Authorization: <access_token>`
- `credentials: include` para enviar cookies.
- Si no hay token, se considera no autenticado y se redirige a login.
