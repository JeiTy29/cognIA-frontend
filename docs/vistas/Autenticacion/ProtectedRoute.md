# ProtectedRoute

## Ubicacion
- Componente: `src/components/ProtectedRoute/ProtectedRoute.tsx`
- Estilos: `src/components/ProtectedRoute/ProtectedRoute.css`

## Proposito
Controlar acceso a rutas privadas por estado de autenticacion y por rol, sin romper la continuidad visual del area operativa.

## Props
- `allowedRoles?: string[]`
  - Si no se envia, valida solo autenticacion (guard general).
  - Si se envia, valida autenticacion + rol (guard por seccion).
  - Acepta nombres de app (`padre`, `psicologo`, `admin`) y equivalentes backend (`GUARDIAN`, `PSYCHOLOGIST`, `ADMIN`).
  - `'*'` habilita acceso para cualquier usuario autenticado.

## Comportamiento

### Usuario no autenticado
- Redirige a `/inicio-sesion`.
- Envia `state.message` con texto de acceso requerido.

### Carga de sesion/perfil (post-login)
- Condicion de carga: `isAuthLoading` o `profileStatus === 'loading'`.
- Si el usuario ya esta autenticado y el guard es general (sin `allowedRoles`):
  - Renderiza `Outlet` durante la carga.
  - Resultado: el `SidebarLayout` se monta de inmediato y se mantiene el shell autenticado visible.
- Si el usuario ya esta autenticado y el guard es por rol (`allowedRoles`):
  - Renderiza un estado neutro de carga en contenido (`auth-guard-content-loading`).
  - Esto evita mostrar pantalla publica y evita exponer contenido de una seccion antes de terminar validacion de rol.

### Usuario autenticado sin rol permitido
- Muestra pantalla de acceso denegado.
- Ofrece boton para volver a la ruta principal de su rol.
- Muestra bloque de soporte.

### Usuario autenticado con rol permitido
- Renderiza las rutas hijas normalmente (`Outlet`).

## Mapeo y redireccion por rol
- `GUARDIAN` -> `/padre/cuestionario`
- `PSYCHOLOGIST` -> `/psicologo/cuestionario`
- `ADMIN` -> `/admin/metricas`

## Nota de UX registrada
- El fallback de carga de rutas protegidas se resolvio para que el contexto visual operativo (sidebar + shell autenticado) aparezca antes de que termine de cargar el contenido interno.
- Con esto se elimina la sensacion de retorno a la vista publica durante la entrada al area operativa.
