# Navegacion formal vigente del frontend

## Fuente de verdad usada

- `src/App.tsx`
- `src/components/ProtectedRoute/ProtectedRoute.tsx`
- `src/components/SidebarLayout/SidebarLayout.tsx`
- `src/components/Sidebar/SidebarConfig.tsx`
- `src/utils/auth/roles.ts`

## 1. Tipos de ruta

## 1.1 Rutas publicas (sin sesion)

| Ruta | Vista |
|---|---|
| `/` | Bienvenida de inicio |
| `/nuestro-sistema` | Informacion del sistema (con Header/Footer) |
| `/sobre-nosotros` | Informacion institucional (con Header/Footer) |
| `/trastornos` | Informacion de trastornos (con Header/Footer) |
| `/cuestionario/compartido/:questionnaireId/:shareCode` | Vista publica compartida |

## 1.2 Rutas de autenticacion

| Ruta | Vista |
|---|---|
| `/inicio-sesion` | Login |
| `/registro` | Registro |
| `/bienvenida` | Bienvenida autenticacion |
| `/restablecer-contrasena` | Reset de contrasena |
| `/mfa` | Setup/challenge MFA |

## 1.3 Rutas protegidas por layout

Las rutas privadas comparten `SidebarLayout` y doble validacion de guardas.

### Area padre (`allowedRoles: ['padre']`)

| Ruta | Vista |
|---|---|
| `/padre` | Redirect interno a `/padre/cuestionario` |
| `/padre/cuestionario` | Cuestionario |
| `/padre/historial` | Historial |
| `/padre/cuenta` | Mi Cuenta |
| `/padre/ayuda` | Ayuda |

### Area psicologo (`allowedRoles: ['psicologo']`)

| Ruta | Vista |
|---|---|
| `/psicologo` | Redirect interno a `/psicologo/cuestionario` |
| `/psicologo/cuestionario` | Cuestionario |
| `/psicologo/historial` | Historial |
| `/psicologo/sugerencias` | Sugerencias |
| `/psicologo/cuenta` | Mi Cuenta |
| `/psicologo/ayuda` | Ayuda |

### Area admin (`allowedRoles: ['admin']`)

| Ruta | Vista |
|---|---|
| `/admin` | Redirect interno a `/admin/metricas` |
| `/admin/metricas` | Metricas operativas |
| `/admin/dashboard` | Dashboard analitico |
| `/admin/cuestionarios` | Gestion de cuestionarios |
| `/admin/cuestionarios/:templateId/preguntas` | Gestion de preguntas de plantilla |
| `/admin/evaluaciones` | Gestion de evaluaciones |
| `/admin/usuarios` | Gestion de usuarios |
| `/admin/psicologos` | Revision de psicologos |
| `/admin/auditoria` | Auditoria |
| `/admin/reportes` | Reportes de incidencias |
| `/admin/cuenta` | Mi Cuenta |

## 2. Guardas y autorizacion

## 2.1 Guarda general (`ProtectedRoute` sin `allowedRoles`)

Comportamiento:

1. Si hay carga auth/perfil en curso, no renderiza contenido.
2. Si no hay sesion, redirige a `/inicio-sesion` con mensaje.
3. Si hay sesion, permite continuar al siguiente nivel de rutas.

## 2.2 Guarda por rol (`ProtectedRoute` con `allowedRoles`)

Comportamiento:

1. Normaliza roles (`ADMIN`, `PSYCHOLOGIST`, `GUARDIAN`).
2. Si rol no autorizado:
   - muestra pantalla de acceso denegado
   - permite navegar a ruta por defecto de su rol
3. Si rol autorizado, renderiza `Outlet`.

## 3. Redirecciones por defecto

Definidas en `getDefaultRouteForRoles`:

- Admin -> `/admin/metricas`
- Psicologo -> `/psicologo/cuestionario`
- Padre/Tutor -> `/padre/cuestionario`

Adicionalmente:

- Ruta comodin `*`:
  - sin sesion -> `/`
  - con sesion -> default route por rol

## 4. Sidebar por rol

Configuracion en `SidebarConfig.tsx`.

- Padre:
  - Cuestionario, Historial, Ayuda, Cuenta
- Psicologo:
  - Cuestionario, Historial, Sugerencias, Ayuda, Cuenta
- Admin:
  - Metricas, Dashboard, Cuestionarios, Evaluaciones, Usuarios, Psicologos, Auditoria, Reportes, Cuenta

`SidebarLayout` usa `primaryRole` del contexto y, como fallback, prefijo de path.

## 5. Relacion con AuthProvider

`AuthProvider` define:

- `isAuthenticated`
- `roles`
- `primaryRole`

Estos valores gobiernan:

- accesos a rutas protegidas
- redirect por rol
- seleccion de menu en sidebar

## 6. Ruta publica compartida

La ruta `/cuestionario/compartido/:questionnaireId/:shareCode` es publica.

- No pasa por `ProtectedRoute`.
- Renderiza `CuestionarioCompartido`.
- Maneja errores de enlace en la propia pantalla.

## 7. Limites de verificabilidad

Desde frontend se puede confirmar estructura de rutas y guardas.

No es posible confirmar solo con frontend:

- existencia efectiva de todos los recursos backend por entorno
- politicas de autorizacion del servidor mas alla de errores que la UI maneja
