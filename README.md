# CognIA Frontend (`JeiTy29/cognIA-frontend`)

Cliente web de CognIA para autenticacion, diligenciamiento de cuestionarios, consulta de historial y operacion administrativa.

Este README funciona como entrada tecnica principal del repositorio y esta basado en evidencia del frontend versionado. Cuando un comportamiento depende del backend en ejecucion, se indica como inferido desde consumo del cliente.

## Tabla de contenido
- [1. Vision general](#1-vision-general)
- [2. Objetivo y alcance funcional](#2-objetivo-y-alcance-funcional)
- [3. Stack tecnologico](#3-stack-tecnologico)
- [4. Arquitectura y organizacion del proyecto](#4-arquitectura-y-organizacion-del-proyecto)
- [5. Navegacion y control de acceso](#5-navegacion-y-control-de-acceso)
- [6. Modulos principales](#6-modulos-principales)
- [7. Integracion con backend](#7-integracion-con-backend)
- [8. Requisitos previos](#8-requisitos-previos)
- [9. Instalacion y configuracion](#9-instalacion-y-configuracion)
- [10. Ejecucion en desarrollo](#10-ejecucion-en-desarrollo)
- [11. Validacion local y calidad](#11-validacion-local-y-calidad)
- [12. CI/CD y despliegue self-hosted](#12-cicd-y-despliegue-self-hosted)
- [13. Documentacion interna del repositorio](#13-documentacion-interna-del-repositorio)
- [14. Limitaciones y consideraciones](#14-limitaciones-y-consideraciones)
- [15. Creditos y contexto institucional](#15-creditos-y-contexto-institucional)

## 1. Vision general

CognIA Frontend es una aplicacion React + TypeScript que expone:

- area publica e informativa,
- autenticacion con MFA,
- area operativa para padre/tutor y psicologo,
- panel administrativo con modulos de supervision operativa y analitica.

Su objetivo funcional es apoyar flujos de tamizaje y seguimiento sobre cuestionarios de salud mental infantil en entorno de apoyo, no diagnostico automatico.

## 2. Objetivo y alcance funcional

El frontend cumple el rol de interfaz principal del ecosistema CognIA:

- consume APIs de autenticacion, cuestionarios, historial y administracion,
- administra sesion y proteccion de rutas por rol,
- renderiza resultados y artefactos compartidos/PDF,
- habilita operacion de modulos admin (metricas, dashboard, usuarios, auditoria, etc.).

Actores de uso visibles en el frontend:

- `padre` (guardian en contratos API de Questionnaire V2),
- `psicologo` (psychologist en contratos API de Questionnaire V2),
- `admin`.

## 3. Stack tecnologico

Tecnologias principales observadas en `package.json`:

- React `19.2.0`
- React DOM `19.2.0`
- React Router DOM `7.10.1`
- TypeScript `~5.9.3`
- Vite `^7.2.4`
- ESLint `^9.39.1`

Dependencias funcionales adicionales:

- `qrcode` para flujos de MFA.
- `axios` presente en dependencias (la capa HTTP principal usa `fetch` via `src/services/api/httpClient.ts`).

## 4. Arquitectura y organizacion del proyecto

Estructura principal:

```text
cognIA-frontend/
|- .github/workflows/         # CI y deploy
|- docs/                      # documentacion tecnica y de vistas
|- public/                    # assets estaticos
|- scripts/                   # utilidades operativas versionadas
|- src/
|  |- components/             # componentes reutilizables
|  |- context/                # AuthProvider y contexto global
|  |- hooks/                  # orquestacion por caso de uso
|  |- pages/                  # vistas por dominio (Inicio, Auth, Plataforma, Admin)
|  |- services/               # integracion API por modulo
|  |- styles/                 # estilos globales y tema
|  |- utils/                  # helpers transversales
|- .env.example
|- package.json
|- README.md
```

Patrones tecnicos relevantes:

- Bootstrap: `src/main.tsx` (`BrowserRouter` + `AuthProvider` + `App`).
- Navegacion y guardas en `src/App.tsx` y `src/components/ProtectedRoute`.
- Capa HTTP base en `src/services/api/httpClient.ts` con manejo unificado de errores y refresh de token.
- Servicios por dominio (`auth`, `questionnaires`, `dashboard`, `admin`, `problemReports`).

## 5. Navegacion y control de acceso

Resumen de rutas vigentes:

- Publicas:
  - `/`, `/nuestro-sistema`, `/sobre-nosotros`, `/trastornos`
  - `/cuestionario/compartido/:questionnaireId/:shareCode`
- Autenticacion:
  - `/inicio-sesion`, `/registro`, `/bienvenida`, `/restablecer-contrasena`, `/mfa`
- Privadas por rol (con `SidebarLayout` + `ProtectedRoute`):
  - `/padre/*`
  - `/psicologo/*`
  - `/admin/*`

Redirecciones por defecto desde `src/utils/auth/roles.ts`:

- admin -> `/admin/metricas`
- psicologo -> `/psicologo/cuestionario`
- padre -> `/padre/cuestionario`

Para detalle completo de rutas y guardas: `docs/proyecto/09-NavegacionFrontendVigente.md`.

## 6. Modulos principales

Modulos funcionales visibles en el frontend:

- Autenticacion:
  - registro, login, MFA, recuperacion/restablecimiento de contrasena.
- Plataforma (padre/psicologo):
  - cuestionario V2, historial, vista compartida, ayuda, mi cuenta.
- Administracion:
  - metricas operativas (`/admin/metricas`),
  - dashboard analitico (`/admin/dashboard`),
  - cuestionarios y preguntas de plantilla,
  - evaluaciones,
  - usuarios,
  - psicologos,
  - auditoria,
  - reportes de incidencias (`/admin/reportes`).

Inventario tecnico detallado: `docs/proyecto/10-ModulosFrontendVigentes.md`.

## 7. Integracion con backend

La integracion se concentra en `src/services/**` sobre una capa HTTP comun (`httpClient.ts`).

Caracteristicas observables de la capa API:

- wrappers `apiGet/apiPost/apiPatch/apiPut/apiDelete`,
- `ApiError` con `status` y `payload`,
- refresh automatico ante `401` cuando aplica,
- soporte de `auth: true` para Bearer token,
- soporte de `credentials: 'include'`.

Familias de endpoints consumidas por el frontend:

- Auth y seguridad: `/api/auth/*`, `/api/mfa/*`
- Questionnaire V2: `/api/v2/questionnaires/*`
- Admin tradicional: `/api/admin/*`
- Dashboard analitico: `/api/v2/dashboard/*`
- Problem reports: `/api/problem-reports*`, `/api/admin/problem-reports*`
- Health/metrica operativa admin: `/healthz`, `/readyz`, `/api/admin/metrics`, `/api/admin/email/health`

Referencia completa de consumo: `docs/proyecto/08-MigracionEndpointsActivos.md`.

## 8. Requisitos previos

- Node.js 22 (alineado con CI actual en GitHub Actions).
- npm (se usa lockfile y `npm ci`).
- Acceso a un backend compatible con los endpoints consumidos.

Opcional para bypass de desarrollo:

- configurar `VITE_DEV_AUTH_BYPASS` y `VITE_DEV_ROLE` en entorno local.

## 9. Instalacion y configuracion

1. Clonar repositorio:

```bash
git clone https://github.com/JeiTy29/cognIA-frontend.git
cd cognIA-frontend
```

2. Instalar dependencias:

```bash
npm ci
```

3. Preparar variables de entorno:

Linux/macOS:

```bash
cp .env.example .env.local
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Variables relevantes observables:

- `VITE_API_BASE_URL`: base URL del backend.
- `VITE_DEV_AUTH_BYPASS`: habilita bypass de autenticacion solo en desarrollo.
- `VITE_DEV_ROLE`: rol simulado cuando bypass esta activo (`guardian`, `psychologist`, `admin`).

## 10. Ejecucion en desarrollo

Iniciar servidor local:

```bash
npm run dev
```

Comportamiento esperado:

- Vite levanta servidor de desarrollo local.
- la app consume `VITE_API_BASE_URL`.
- con bypass activado, es posible recorrer rutas privadas en modo desarrollo.

Preview de build:

```bash
npm run preview
```

## 11. Validacion local y calidad

Checks disponibles en el repositorio:

```bash
npm run build
npm run lint
```

Estado observable:

- existe build de produccion (`tsc -b && vite build`),
- existe lint (`eslint .`),
- no hay script `test` en `package.json` al momento de esta revision.

## 12. CI/CD y despliegue self-hosted

El repositorio separa CI normal de despliegue operativo.

### CI (GitHub-hosted, recomendado para required check)

- Workflow: `Frontend CI (Required)`
- Job: `frontend-ci-required`
- Archivo: `.github/workflows/ci-frontend.yml`
- Runner: `ubuntu-latest`
- Trigger: `push`, `pull_request`, `workflow_dispatch`
- Ejecucion: `npm ci` + `npm run build` + `npm run lint` (lint advisory)

### Deploy (self-hosted, best effort, no requerido)

- Workflow: `Frontend Deploy (Self-Hosted, Non-Required)`
- Job: `frontend-deploy-self-hosted`
- Archivo: `.github/workflows/deploy-frontend.yml`
- Runner labels: `[self-hosted, linux, x64, cognia-frontend]`
- Trigger: `push` a `main` y `workflow_dispatch`

Modelo operativo esperado por el workflow:

- rama de despliegue: `main`,
- repo en servidor: `/opt/cognia/frontend`,
- compose global: `/opt/cognia`,
- servicios Docker: `frontend` y `gateway`,
- healthcheck final: `http://localhost`,
- rollback automatico basico al commit previo ante falla del deploy.

Branch protection recomendado:

- marcar como required: `Frontend CI (Required) / frontend-ci-required`
- no marcar como required: `Frontend Deploy (Self-Hosted, Non-Required) / frontend-deploy-self-hosted`

## 13. Documentacion interna del repositorio

Documentos clave para onboarding tecnico:

- Arquitectura: `docs/proyecto/03-ArquitecturaFrontend.md`
- Estructura: `docs/proyecto/04-EstructuraProyecto.md`
- Flujos de usuario: `docs/proyecto/05-FlujosUsuarios.md`
- Navegacion vigente: `docs/proyecto/09-NavegacionFrontendVigente.md`
- Modulos vigentes: `docs/proyecto/10-ModulosFrontendVigentes.md`
- Bypass de desarrollo: `docs/proyecto/11-BypassAutenticacionDesarrollo.md`
- Registro de cambios: `docs/proyecto/12-RegistroCambiosFrontend.md`
- Politica documental: `docs/proyecto/13-PoliticaDocumentacionCambios.md`
- Vistas por modulo: `docs/vistas/**`

## 14. Limitaciones y consideraciones

- Este repositorio no valida por si solo la disponibilidad real del backend.
- Los contratos API documentados aqui describen consumo del frontend, no certificacion integral del backend.
- Parte de la normalizacion (sobre todo en cuestionarios) es defensiva y puede aceptar variantes de payload inferidas desde cliente.
- El bypass de autenticacion (`VITE_DEV_AUTH_BYPASS`) es una herramienta de desarrollo local; no es un flujo funcional de produccion.
- `vercel.json` puede existir en el repo por compatibilidad historica, pero el despliegue operativo documentado actualmente esta orientado a servidor Ubuntu self-hosted.

## 15. Creditos y contexto institucional

Con base en contenido visible en vistas publicas y footer del frontend, CognIA se presenta como un desarrollo academico vinculado a la Universidad de Cundinamarca (sede/extensiones en Facatativa) y orientado a apoyo de tamizaje temprano.

La descripcion institucional de detalle debe mantenerse alineada con el contenido oficial de las secciones publicas del producto (`/sobre-nosotros`, footer y legales).
