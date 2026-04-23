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

Este repositorio mantiene separacion estricta entre integracion continua y despliegue:

1. Workflow CI (GitHub-hosted)
   - Workflow: `Frontend CI (Required)`
   - Job: `frontend-ci-required`
   - Archivo: `.github/workflows/ci-frontend.yml`
   - Runner: `ubuntu-latest`
   - Trigger: `push`, `pull_request`, `workflow_dispatch`
   - Pasos:
     - `npm ci`
     - `npm run build` (gating)
     - `npm run lint` (advisory, non-blocking)

2. Workflow Deploy (self-hosted, no requerido)
   - Workflow: `Frontend Deploy (Self-Hosted, Non-Required)`
   - Job: `frontend-deploy-self-hosted`
   - Archivo: `.github/workflows/deploy-frontend.yml`
   - Runner labels: `[self-hosted, linux, x64, cognia-frontend]`
   - Trigger: `push` a `main` + `workflow_dispatch`
   - Orquestacion: `scripts/ops/deploy_frontend_self_hosted.sh`
   - Incluye preflight (`docker compose ps`, `docker network ls`, `docker info`, `iptables --version`), recuperacion segura y validacion estricta de commit + healthcheck final.

## Modelo operativo de despliegue

- Rama operativa de despliegue: `main`
- Repo en servidor Ubuntu: `/opt/cognia/frontend`
- Compose global del stack: `/opt/cognia`
- Servicios Docker usados por deploy: `frontend` y `gateway`
- El frontend se reconstruye en el servidor y se sirve via Nginx dentro del stack Docker.
- Vercel deja de ser el destino principal para despliegue operativo de este repo.

## Importante para branch protection

El deploy self-hosted es **best effort** y depende de disponibilidad del runner/host Ubuntu.

- `Frontend CI (Required) / frontend-ci-required` es el candidato a required check.
- `Frontend Deploy (Self-Hosted, Non-Required) / frontend-deploy-self-hosted` **no** debe marcarse como required check.
- Si el runner self-hosted esta offline, el flujo de desarrollo normal continua con CI en GitHub-hosted.

## Guia operativa completa

Para bootstrap, recuperacion de Docker host, verificacion real y rollback manual:

- [docs/ops/frontend-self-hosted-deploy.md](docs/ops/frontend-self-hosted-deploy.md)
