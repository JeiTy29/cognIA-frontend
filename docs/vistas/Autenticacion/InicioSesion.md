# Vista: Inicio de Sesión

## Descripción general

Formulario de acceso con credenciales (nombre de usuario + contraseña). Inicia el flujo de autenticación y decide si el usuario entra directo a la plataforma o debe completar MFA.

## Ubicación

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
- Acción: guarda `access_token` en sessionStorage y redirige a la plataforma según rol.

2) **MFA requerido (challenge)**
- Respuesta: `{ mfa_required: true, challenge_id, expires_in, msg, error }`
- Acción: navega a `/mfa/challenge` usando `state` con `challengeId` (no se persiste).

3) **MFA enrollment requerido**
- Respuesta: `{ mfa_enrollment_required: true, enrollment_token, token_type, expires_in, msg, error }`
- Acción: navega a `/mfa/setup` usando `state` con `enrollmentToken` (no se persiste).

## Manejo de errores

- 400/401: “Usuario o contraseña incorrectos.”
- Otros: “Ocurrió un error al iniciar sesión. Intenta nuevamente.”

## Estado y lógica

- `username`, `password`, `loading`, `errorMessage`, `infoMessage`.
- `mostrarContrasena` alterna tipo `text/password`.
- Si el usuario ya está autenticado, se redirige automáticamente a la plataforma.

### Validación rápida de usuario

- Validación local con regex: `^[A-Za-z0-9._-]{3,32}$`.
- Diferencia mayúsculas/minúsculas.

## Almacenamiento de sesión

- `access_token`: se guarda en **sessionStorage** (persistente al recargar, se pierde al cerrar la pestaña).
- Se decodifica el JWT para extraer `roles` y `exp`.
- **No** se guardan en storage: `challenge_id` ni `enrollment_token`.

## Manejo de errores esperados

- Credenciales inválidas se manejan como flujo normal (sin logs ni errores no capturados).

## Logout (referencia técnica)

- Endpoint: `POST /api/auth/logout`
- Header requerido: `X-CSRF-Token` con el valor de la cookie `csrf_refresh_token`.
- Se envían cookies con `credentials: include`.
- El frontend limpia siempre los tokens locales aunque el backend responda 401.

## Redirección por rol

- `GUARDIAN` → `/padre/cuestionario`
- `PSYCHOLOGIST` → `/psicologo/cuestionario`

## Rutas protegidas

- Las rutas de plataforma están envueltas por `ProtectedRoute`.
- Si no hay sesión válida, se redirige a `/inicio-sesion` con aviso breve.

## Interacciones

- Enlace “Regístrate” → `/registro`.
- Enlace “¿Olvidaste tu contraseña?” → `/recuperar-contrasena`.

## Flujo de usuario

1. Ingresa usuario y contraseña.
2. Presiona **Ingresar**.
3. Si hay MFA, navega a `/mfa/challenge` o `/mfa/setup`.
4. Si no hay MFA, entra directo a la plataforma según rol.

## Estilos clave

- Inputs con borde **#E0E0E0**, foco en **#1790E9**.
- Botón principal **#1790E9** con hover **#1370c0**.
- Mensajes con `.validation-error` y `.validation-success`.

## Clases CSS clave

- `.auth-container`, `.auth-content`, `.form-input`, `.password-toggle`, `.btn-primary`.

## Responsive

- `max-width: 768px`: se oculta panel izquierdo y el contenido se centra.
- `max-width: 480px`: padding reducido, tipografías pequeñas.

## Refresh de sesión

- Endpoint: `POST /api/auth/refresh`.
- Header: `X-CSRF-Token` con el valor de la cookie `csrf_refresh_token`.
- `credentials: include` para enviar cookies.
- Si el access token expira, el frontend intenta refresh de forma silenciosa.
- Si falla (401), se limpia la sesión local y se redirige a `/inicio-sesion`.
- Se reintenta una sola vez en requests protegidos cuando hay 401.

## Authorization (Bearer)

- Los endpoints protegidos usan `Authorization: Bearer <access_token>`.
- El access token se lee desde `sessionStorage` con la clave `cognia_access_token`.

## Perfil (/api/auth/me)

- Endpoint: `GET /api/auth/me`
- Headers: `Accept: application/json`, `Authorization: Bearer <access_token>`
- `credentials: include` para enviar cookies.
- Si no hay token, se considera no autenticado y se redirige a login.
- Datos usados en UI (Mi Cuenta):
  - `username`, `email`, `user_type/roles`, `full_name`, `professional_card_number`, `mfa_enabled`.
- Datos guardados para futuro DTO/admin (no visibles):
  - `id`, `is_active`, `roles`, `mfa_confirmed_at`, `mfa_method`, `created_at`, `updated_at`.
