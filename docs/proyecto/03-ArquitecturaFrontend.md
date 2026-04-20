# Arquitectura del Frontend (estado vigente)

## Alcance y evidencia

Este documento describe la arquitectura **actual** del frontend con base en evidencia del repositorio local `JeiTy29/cognIA-frontend`.

- Fuente principal: `src/main.tsx`, `src/App.tsx`, `src/context/AuthContext.tsx`, `src/components/*`, `src/hooks/*`, `src/services/*`.
- Limite: sin backend en ejecucion, por lo que no se valida comportamiento real del servidor.
- Regla documental: cuando un comportamiento depende de payloads ambiguos o normalizadores defensivos, se marca como **inferido desde el consumo del frontend**.

## Arquitectura de ejecucion

### Bootstrap

Punto de entrada (`src/main.tsx`):

1. `React.StrictMode`
2. `BrowserRouter`
3. `AuthProvider`
4. `App`

Esto implica que toda la app consume estado de autenticacion desde contexto y enrutamiento cliente con React Router.

### Capas tecnicas

1. Presentacion: `src/pages/*` y `src/components/*`.
2. Navegacion/guardas: `src/App.tsx`, `src/components/ProtectedRoute/*`, `src/components/SidebarLayout/*`, `src/components/Sidebar/*`.
3. Estado de sesion/autenticacion: `src/context/AuthContext.tsx`.
4. Orquestacion de casos de uso: `src/hooks/*`.
5. Integracion HTTP: `src/services/*`, con base comun en `src/services/api/httpClient.ts`.

## Autenticacion y sesion

### AuthProvider

`AuthProvider` gestiona:

- `accessToken`, `roles`, `userId`, `expiresAt`
- `isAuthenticated`, `isAuthLoading`
- `profile`, `profileStatus`, `profileErrorStatus`
- refresco de sesion (`refreshSession`)
- recarga de perfil (`reloadProfile`)
- cierre de sesion (`logout`)

### Persistencia local

Se observa persistencia en storage para token y expiracion:

- lectura/escritura via `src/utils/auth/storage.ts` (consumo visible desde `AuthContext` y `httpClient`)

### Refresh de token

`httpClient` intenta refresh automatico en respuestas `401` (si `retryAuth !== false`):

1. llama `refreshAccessToken` (`POST /api/auth/refresh`)
2. actualiza storage
3. emite evento `auth:refresh`
4. reintenta la request original

### Carga de perfil

`AuthProvider` consulta `/api/auth/me` cuando hay sesion valida; si recibe `401` cierra sesion.

## Navegacion y control de acceso

La arquitectura de rutas completas y su matriz por rol se documenta formalmente en `09-NavegacionFrontendVigente.md`.

Resumen tecnico:

- Rutas publicas y de autenticacion en `App.tsx`.
- Ruta publica compartida: `/cuestionario/compartido/:questionnaireId/:shareCode`.
- Areas protegidas por layout con sidebar:
  - `/padre/*`
  - `/psicologo/*`
  - `/admin/*`
- Proteccion por dos niveles:
  - `ProtectedRoute` general (autenticacion)
  - `ProtectedRoute allowedRoles=[...]` por area
- Redirect por defecto por rol con `getDefaultRouteForRoles`.

## Sidebar y layout de aplicacion

- `SidebarLayout` determina rol efectivo desde `primaryRole` del contexto (con fallback por prefijo de ruta).
- `SidebarConfig` define menu por rol:
  - padre: cuestionario, historial, ayuda, cuenta
  - psicologo: cuestionario, historial, sugerencias, ayuda, cuenta
  - admin: metricas, dashboard, cuestionarios, evaluaciones, usuarios, psicologos, auditoria, reportes, cuenta

## Capa de servicios HTTP

`src/services/api/httpClient.ts` concentra wrappers:

- `apiGet`, `apiPost`, `apiPostNoBody`, `apiPostFormData`, `apiPatch`, `apiPut`, `apiDelete`
- variantes para blob: `apiGetBlob`, `apiGetBlobWithMeta`
- clase `ApiError` con `status` y `payload`

Patron de autenticacion:

- `auth: true` agrega `Authorization` usando token almacenado.
- `credentials: 'include'` se usa en varios modulos para cookies/sesion.

## Modulos funcionales principales

El frontend vigente implementa, entre otros:

- Autenticacion (registro, login, MFA, password reset, perfil)
- Cuestionario V2 (sesion, respuestas, submit, historial, share, PDF, vista compartida)
- Administracion (metricas operativas, dashboard analitico, cuestionarios, evaluaciones, usuarios, psicologos, auditoria, reportes de incidencias)
- Ayuda y reporte de problemas para usuarios no admin

El detalle modulo por modulo se documenta en `10-ModulosFrontendVigentes.md`.

## Estilo y UI

- CSS por modulo/pagina (archivos `.css` junto a componentes).
- Estilos globales en `src/styles/globals.css` y tema en `src/styles/theme.css`.
- Uso extendido de componentes comunes (`Modal`, `CustomSelect`, layout/sidebar).

## Riesgos y limites observables desde frontend

1. Existen normalizadores defensivos (especialmente en `questionnaires.api.ts`) que aceptan multiples variantes de shape.  
   - Esto permite robustez de cliente, pero parte de la semantica es **inferida desde consumo frontend** y no verificable solo con este repositorio.
2. No se detecta un esquema tipado unico compartido con backend (p. ej. OpenAPI generado en cliente); los contratos se mantienen manualmente por servicio.
3. El frontend depende de `VITE_API_BASE_URL`; sin esta variable la app lanza error al iniciar `httpClient`.

## Referencias relacionadas

- Navegacion formal: `09-NavegacionFrontendVigente.md`
- Flujos de usuario: `05-FlujosUsuarios.md`
- Consumo de API: `08-MigracionEndpointsActivos.md`
- Modulos funcionales: `10-ModulosFrontendVigentes.md`
- Bypass de desarrollo: `11-BypassAutenticacionDesarrollo.md`
- Estado y vacios de calidad: `07-EstadoProyecto.md`
