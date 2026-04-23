# Frontend CognIA - Deploy Self-Hosted Ubuntu

Esta guia documenta la configuracion del repositorio para despliegue profesional del frontend en un servidor Ubuntu self-hosted, manteniendo CI normal aunque el servidor este offline.

## 1. Parametros operativos

- Rama de despliegue: `main`
- Ruta del repo frontend en servidor: `/opt/cognia/frontend`
- Compose global del stack: `/opt/cognia`
- Servicio frontend en Docker Compose: `frontend`
- Servicio gateway/reverse proxy: `gateway`
- Label esperado del runner self-hosted: `cognia-frontend`
- Runner labels completos requeridos por workflow:
  `[self-hosted, linux, x64, cognia-frontend]`

## 2. Workflows del repositorio

### 2.1 CI normal (GitHub-hosted)

Archivo: `.github/workflows/ci-frontend.yml`

- Corre en `ubuntu-latest`
- Se ejecuta en `push`, `pull_request` y `workflow_dispatch`
- Ejecuta validacion estable del proyecto:
  - `npm ci`
  - `npm run build`

Uso recomendado:
- Este workflow debe ser la senal principal para integrar cambios.

### 2.2 Deploy best effort (self-hosted)

Archivo: `.github/workflows/deploy-frontend.yml`

- Corre solo en runner self-hosted con label `cognia-frontend`
- Se ejecuta en:
  - `push` a `main`
  - `workflow_dispatch`
- Usa `concurrency` para serializar despliegues en `main`

Flujo del deploy:
1. Valida prerequisitos (`git`, `docker`, `curl`, rutas esperadas).
2. Registra commit actual desplegado en `/opt/cognia/frontend`.
3. Actualiza el repo local del servidor:
   - `cd /opt/cognia/frontend`
   - `git fetch origin main`
   - `git checkout main`
   - `git reset --hard origin/main`
4. Reconstruye y levanta frontend + gateway:
   - `cd /opt/cognia`
   - `docker compose up -d --build frontend gateway`
5. Verifica disponibilidad en `http://localhost`.
6. Si falla verificacion:
   - rollback automatico al commit previo
   - reconstruye `frontend` + `gateway`
   - vuelve a verificar `http://localhost`
7. Siempre muestra:
   - `docker compose ps`
   - logs recientes de `frontend`

## 3. Requisitos de servidor Ubuntu

Prerequisitos minimos:
- Docker Engine + Docker Compose plugin
- Git
- Curl
- Runner de GitHub Actions instalado y online en el servidor
- Permisos del usuario del runner para operar:
  - `/opt/cognia/frontend`
  - `/opt/cognia`
  - `docker compose`

Estructura esperada:
- Repo frontend clonado en `/opt/cognia/frontend`
- Stack compose operativo desde `/opt/cognia`

## 4. Configuracion inicial recomendada (bootstrap)

1. Preparar rutas:
   - `sudo mkdir -p /opt/cognia`
2. Clonar frontend:
   - `cd /opt/cognia`
   - `git clone <repo-frontend> frontend`
3. Asegurar que el compose global de CognIA existe en `/opt/cognia`.
4. Registrar runner self-hosted con label `cognia-frontend`.
5. Ejecutar deploy manual inicial (`workflow_dispatch`) para validar pipeline end-to-end.

## 5. Verificacion operativa de deploy activo

En el servidor:
1. `cd /opt/cognia`
2. `docker compose ps`
3. `docker compose logs --tail=200 frontend`
4. `curl -fsS http://localhost`

Si `curl` responde y los servicios estan `up`, el deploy se considera activo.

## 6. Rollback manual (si se requiere)

Si se necesita rollback manual inmediato:

1. Elegir commit estable:
   - `cd /opt/cognia/frontend`
   - `git log --oneline -n 20`
2. Aplicar rollback:
   - `git reset --hard <commit_estable>`
3. Reconstruir servicios:
   - `cd /opt/cognia`
   - `docker compose up -d --build frontend gateway`
4. Verificar:
   - `docker compose ps`
   - `curl -fsS http://localhost`

## 7. Politica de branch protection recomendada

El deploy self-hosted es best effort por dependencia del estado del servidor/runner.

- No marcar `Deploy Frontend (Self-Hosted)` como required check.
- Marcar `Frontend CI` como check principal de integracion.
- Si el runner self-hosted esta offline, el equipo mantiene flujo normal con CI GitHub-hosted.

## 8. Nota sobre build y servicio

Este repositorio esta orientado a que el frontend se construya en el entorno Docker del servidor y luego sea servido via Nginx dentro del stack de produccion.
