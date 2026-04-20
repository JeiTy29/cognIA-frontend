# Estructura del proyecto frontend (vigente)

## Directorios principales

## `src/`

- `components/`: componentes reutilizables (layout, sidebar, modal, selects, MFA views, etc.).
- `context/`: estado global de autenticacion (`AuthProvider`).
- `hooks/`: logica de orquestacion por caso de uso (`auth`, `metrics`, `dashboard`, `reports`, `questionnaires`, `admin`).
- `pages/`: vistas por dominio:
  - `Inicio`
  - `Autenticacion`
  - `Plataforma`
  - `Administrador`
- `services/`: integraciones HTTP por modulo:
  - `api/` (cliente HTTP base)
  - `auth/`
  - `questionnaires/`
  - `dashboard/`
  - `reports/`
  - `admin/`
  - `problemReports/`
- `styles/`: estilos globales (`globals.css`, `theme.css`).
- `utils/`: helpers transversales (roles, jwt, bypass dev, storage, csrf, etc.).

## `docs/`

- `docs/proyecto/`: documentacion tecnica general (arquitectura, flujos, navegacion, modulos, consumo API, estado).
- `docs/vistas/`: documentacion historica por vistas/secciones.

## Archivos raiz relevantes

- `src/main.tsx`: bootstrap (`BrowserRouter` + `AuthProvider` + `App`).
- `src/App.tsx`: mapa de rutas y composicion de areas protegidas.
- `package.json`: scripts de ciclo de vida (`dev`, `build`, `lint`, `preview`).

## Convenciones tecnicas observables

1. Co-localizacion por feature: paginas y estilos juntos por modulo.
2. Hook por caso de uso: la mayoria de vistas usa hook propio para estado, filtros, paginacion y acciones.
3. Servicio por dominio: cada modulo encapsula endpoints en su carpeta de `services`.
4. Error handling consistente: `ApiError` propagado desde `httpClient`.

## Nota de alcance documental

Esta estructura refleja lo visible en frontend. No afirma estructura ni contratos internos del backend.
