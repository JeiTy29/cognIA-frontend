# RestablecerContrasena

## Objetivo

Implementar el flujo completo de recuperacion de contrasena desde Login hasta reset final, usando endpoints reales y sin depender de sesion autenticada.

## Endpoints

### 1) Solicitar enlace de restablecimiento
- `POST /api/auth/password/forgot`
- Body:
```json
{ "email": "string" }
```
- Respuestas relevantes:
  - `200` -> `{ "msg": "ok" }`
  - `429` -> demasiados intentos

### 2) Verificar token
- `GET /api/auth/password/reset/verify?token=STRING`
- Respuestas relevantes:
  - `200` -> `{ "valid": true }`
  - `400` -> token invalido o expirado

### 3) Reset de contrasena
- `POST /api/auth/password/reset`
- Body:
```json
{
  "token": "string",
  "newPassword": "string",
  "confirmNewPassword": "string"
}
```
- Respuestas relevantes:
  - `200` -> `{ "msg": "ok" }`
  - `400` -> solicitud invalida/token invalido o expirado
  - `429` -> demasiados intentos

## Login: modal "Olvidaste tu contrasena"

Ubicacion: `src/pages/Autenticacion/InicioSesion/InicioSesion.tsx`

Flujo:
1. Click en `¿Olvidaste tu contraseña?` abre modal.
2. Se valida email (requerido + formato).
3. Click en `Enviar` consume `POST /api/auth/password/forgot`.
4. En `200`, muestra confirmacion generica:
   - `Si el correo está registrado, recibirás instrucciones para restablecer tu contraseña.`
5. Boton final: `Volver a iniciar sesión` (cierra modal).

Estados:
- Loading: bloquea input y botones.
- Error `429`: `Demasiados intentos. Espera un momento e inténtalo de nuevo.`
- Error inesperado: `No se pudo procesar la solicitud. Intenta más tarde.`

Regla de privacidad:
- Nunca se expone si el correo existe o no.

## Vista de reset con token

Ubicacion: `src/pages/Autenticacion/RestablecerContraseña/RestablecerContraseña.tsx`

Ruta publica activa:
- `/restablecer-contrasena?token=...`

### Verificacion al montar
1. Si no existe `token` en query:
   - redirige a `/inicio-sesion`
   - mensaje contextual: `Acceso inválido: falta el token de restablecimiento.`
2. Si existe token:
   - consume `GET /api/auth/password/reset/verify?token=...`
   - si `400` o `{ valid: false }`, redirige a login con:
     - `El enlace de restablecimiento es inválido o ha expirado.`
3. Solo con token valido se habilita el formulario.

### Submit del reset
- Boton principal: `Actualizar contraseña`.
- Envio real a `POST /api/auth/password/reset`.

Validaciones frontend:
- Campos requeridos.
- Coincidencia entre nueva y confirmacion.
- Reglas de contrasena del proyecto (checklist visual).

Manejo de errores por status:
- `400`: `No se pudo actualizar la contraseña. Verifica el enlace e inténtalo de nuevo.`
- `429`: `Demasiados intentos. Espera un momento e inténtalo de nuevo.`
- Otro: `Ocurrió un error inesperado. Intenta más tarde.`

Comportamiento adicional:
- En error `400`, se muestra accion `Solicitar nuevo enlace` que redirige a Login y abre el modal de recuperacion.

Exito:
- Mensaje de confirmacion: `Contraseña actualizada.`
- CTA: `Iniciar sesión`.

## Integracion tecnica

Servicios agregados en `src/services/auth/auth.api.ts`:
- `requestPasswordReset(email)`
- `verifyResetToken(token)`
- `resetPassword({ token, newPassword, confirmNewPassword })`

Tipos agregados en `src/services/auth/auth.types.ts`:
- `ForgotPasswordRequest`, `ForgotPasswordResponse`
- `VerifyResetTokenResponse`
- `ResetPasswordRequest`, `ResetPasswordResponse`

Notas:
- Estos endpoints no fuerzan `Authorization`.
- Se usa `httpClient` central con `VITE_API_BASE_URL`.
- No se usan `alert()` nativos.
