# cognIA-frontend

Frontend de CognIA construido con React + TypeScript + Vite.

## Desarrollo local

1. Instalar dependencias:
   `npm ci`
2. Copiar variables base si aplica:
   `cp .env.example .env.local`
3. Ajustar `VITE_API_BASE_URL` al backend correspondiente.
4. Iniciar entorno local:
   `npm run dev`

Build local de verificacion:
`npm run build`

## CI/CD en GitHub Actions

Este repositorio queda configurado con dos workflows separados:

1. `Frontend CI` (`.github/workflows/ci-frontend.yml`)
   - Runner: GitHub-hosted (`ubuntu-latest`)
   - Trigger: `push`, `pull_request`, `workflow_dispatch`
   - Objetivo: validacion continua estable del frontend
   - Pasos: `npm ci` + `npm run build`

2. `Deploy Frontend (Self-Hosted)` (`.github/workflows/deploy-frontend.yml`)
   - Runner: self-hosted con labels:
     `[self-hosted, linux, x64, cognia-frontend]`
   - Trigger: `push` a `main` + `workflow_dispatch`
   - Objetivo: deploy inmediato en servidor Ubuntu
   - Estrategia: best effort deployment con rollback automatico basico

## Modelo operativo de despliegue

- Rama operativa de despliegue: `main`
- Repo en servidor: `/opt/cognia/frontend`
- Compose global: `/opt/cognia`
- Servicios Docker involucrados: `frontend` y `gateway`
- El frontend se reconstruye y se sirve via Nginx dentro del stack Docker.

## Importante para branch protection

El workflow de deploy self-hosted es best effort y depende de que el runner del servidor este online.

- No debe marcarse como required check.
- La senal principal para integrar cambios debe ser `Frontend CI`.
- Si el runner self-hosted esta offline, el flujo de desarrollo normal continua con CI en GitHub-hosted.

## Guia operativa completa

Para bootstrap, verificacion y rollback manual en Ubuntu:

- [docs/ops/frontend-self-hosted-deploy.md](docs/ops/frontend-self-hosted-deploy.md)
