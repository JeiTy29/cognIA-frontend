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

## Selección de rol

- Por defecto usa `VITE_DEV_ROLE`.
- Override opcional por query param en local:
  - `?devRole=guardian`
  - `?devRole=psychologist`

## Comportamiento en UI

- Acceso directo a rutas protegidas sin login real.
- Perfil mock en memoria (no usa `/me`).
- No guarda tokens en storage.
- Muestra un badge discreto:
  - “DEV AUTH BYPASS — Guardian” o “DEV AUTH BYPASS — Psicólogo”.

## Producción

En build/Vercel el bypass está **inactivo** porque `import.meta.env.DEV` es `false`.
