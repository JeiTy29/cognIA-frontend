# Frontend CognIA - CI y Deploy Self-Hosted Ubuntu

Esta guia documenta la configuracion del repositorio para integracion continua estable y despliegue profesional del frontend CognIA en un servidor Ubuntu self-hosted.
El destino principal de despliegue pasa a ser Ubuntu self-hosted (no Vercel).

## 1) Parametros operativos del entorno

- Rama operativa de despliegue: `main`
- Ruta del repo frontend en servidor: `/opt/cognia/frontend`
- Compose global del stack: `/opt/cognia`
- Servicio frontend en Docker Compose: `frontend`
- Servicio gateway/reverse proxy: `gateway`
- Label esperado del runner self-hosted: `cognia-frontend`
- Labels completos requeridos por el workflow:
  `[self-hosted, linux, x64, cognia-frontend]`

## 2) Workflows y nombres estables

### 2.1 CI normal (GitHub-hosted, requerido)

- Workflow: `Frontend CI (Required)`
- Job: `frontend-ci-required`
- Archivo: `.github/workflows/ci-frontend.yml`
- Runner: `ubuntu-latest`
- Trigger: `push`, `pull_request`, `workflow_dispatch`
- Pasos:
  - `npm ci`
  - `npm run build` (gating)
  - `npm run lint` (advisory, no bloquea el resultado final del job)

Uso recomendado para branch protection:
- Marcar como required check: `Frontend CI (Required) / frontend-ci-required`

### 2.2 Deploy (self-hosted, NO requerido)

- Workflow: `Frontend Deploy (Self-Hosted, Non-Required)`
- Job: `frontend-deploy-self-hosted`
- Archivo: `.github/workflows/deploy-frontend.yml`
- Script versionado: `scripts/ops/deploy_frontend_self_hosted.sh`
- Trigger:
  - `push` a `main`
  - `workflow_dispatch`
- `concurrency`: `frontend-deploy-main-self-hosted`

Regla de branch protection:
- **No marcar** este workflow/job como required check.
- Es un deploy best effort porque depende de disponibilidad del runner self-hosted y salud del host Docker.

## 3) Flujo exacto del deploy en el script

El script `scripts/ops/deploy_frontend_self_hosted.sh` ejecuta:

1. Preflight de entorno:
   - valida binarios (`git`, `docker`, `curl`)
   - valida repo en `/opt/cognia/frontend`
   - valida compose file en `/opt/cognia`
2. Diagnostico inicial:
   - `docker compose ps`
   - `docker network ls`
   - `docker info`
   - `iptables --version`
3. Captura commit previo desplegado.
4. Actualizacion del repo en servidor:
   - `cd /opt/cognia/frontend`
   - `git fetch origin main`
   - `git checkout main`
   - `git reset --hard origin/main`
5. Deploy con compose:
   - `cd /opt/cognia`
   - `docker compose up -d --build frontend gateway`
6. Verificacion final real:
   - healthcheck `http://localhost`
   - validacion estricta de commit checkout esperado para el run
7. Si falla `docker compose up` por error de red/iptables Docker (incluyendo casos tipo `DOCKER-ISOLATION-STAGE-2`), intenta auto-recuperacion segura una sola vez:
   - `docker compose down --remove-orphans || true`
   - `docker network prune -f || true`
   - si hay `sudo -n` disponible: `sudo -n systemctl restart docker`
   - reintenta `docker compose up -d --build frontend gateway`
8. Si aun falla el deploy:
   - rollback automatico al commit previo
   - reconstruccion de `frontend` + `gateway`
   - nueva verificacion de healthcheck + commit
9. Siempre imprime diagnosticos finales:
   - `docker compose ps`
   - `docker network ls`
   - logs recientes de `frontend`

## 4) Prerequisitos exactos en Ubuntu para auto-recuperacion

Minimos obligatorios:
- Docker Engine + Docker Compose plugin funcionales
- Git
- Curl
- Runner de GitHub Actions activo en el host
- Permisos del usuario runner para:
  - `/opt/cognia/frontend`
  - `/opt/cognia`
  - ejecutar `docker compose`

Prerequisito recomendado para recuperacion completa de host Docker:
- `sudo -n` permitido para `systemctl restart docker` al usuario del runner.

Si `sudo -n` no esta disponible:
- el script continua con recuperacion parcial (`compose down` + `network prune`) y deja diagnostico explicito.

## 5) Bootstrap desde cero

1. Preparar ruta base:
   - `sudo mkdir -p /opt/cognia`
2. Clonar frontend:
   - `cd /opt/cognia`
   - `git clone <repo-frontend> frontend`
3. Validar que el compose global de CognIA exista en `/opt/cognia`.
4. Registrar runner self-hosted con label `cognia-frontend`.
5. Ejecutar `workflow_dispatch` del workflow de deploy para validar flujo completo.

## 6) Verificacion manual post-deploy

En servidor:
1. `cd /opt/cognia`
2. `docker compose ps`
3. `docker compose logs --tail=200 frontend`
4. `curl -fsS http://localhost`
5. `cd /opt/cognia/frontend && git rev-parse HEAD`

## 7) Rollback manual

1. Elegir commit estable:
   - `cd /opt/cognia/frontend`
   - `git log --oneline -n 20`
2. Aplicar rollback:
   - `git reset --hard <commit_estable>`
3. Reconstruir stack frontend/gateway:
   - `cd /opt/cognia`
   - `docker compose up -d --build frontend gateway`
4. Verificar:
   - `docker compose ps`
   - `curl -fsS http://localhost`
