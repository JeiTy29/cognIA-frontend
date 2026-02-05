# DEV AUTH BYPASS (solo local)

## Propósito

Permite visualizar rutas protegidas en `vite dev` sin depender del backend cuando hay bloqueo por CORS.

## Condición de activación (doble)

- `import.meta.env.DEV` debe ser **true**.
- `import.meta.env.VITE_DEV_AUTH_BYPASS` debe ser **'true'**.

Si cualquiera falla, el bypass queda inactivo.

## Variables en .env.local (no se versiona)

```
VITE_DEV_AUTH_BYPASS=true
VITE_DEV_ROLE=guardian
```

`.env.local` está en `.gitignore`, no se sube a producción.

## Modos (disponible vs activo)

- **devBypassEnabled**: indica que el bypass está disponible (solo en DEV + env flag).
- **devAuthActive**: indica si el bypass está activado en runtime.
  - Se guarda en `sessionStorage` con la key: `cognia_dev_auth_active`.
  - Por defecto es **false** (modo público).

## Cómo activar/desactivar en runtime (solo DEV)

- Query param:
  - `?devAuth=on` activa el bypass.
  - `?devAuth=off` desactiva el bypass.
- Toggle visual (solo en DEV): botón “Activar DEV” / “Modo público”.

## Selección de rol

- Por defecto usa `VITE_DEV_ROLE`.
- Override opcional por query param en local:
  - `?devRole=guardian`
  - `?devRole=psychologist`

## Comportamiento en UI

- **devAuthActive=true**: acceso directo a rutas protegidas sin login real.
- Perfil mock en memoria (no usa `/me`).
- No guarda tokens en storage.
- Badge discreto:
  - “DEV AUTH BYPASS — Guardian” o “DEV AUTH BYPASS — Psicólogo”.

## Producción

En build/Vercel el bypass está **inactivo** porque `import.meta.env.DEV` es `false`.
