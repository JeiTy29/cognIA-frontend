# Modulos frontend vigentes (documentacion funcional)

## Criterio de documentacion

Cada modulo se describe con:

- proposito funcional
- ruta(s)
- acceso por rol
- componente principal
- servicios/hooks consumidos
- acciones disponibles en UI
- limitaciones observables solo desde frontend

## Plataforma: Cuestionario

- Proposito: diligenciamiento del cuestionario V2 y finalizacion con procesamiento.
- Rutas:
  - `/padre/cuestionario`
  - `/psicologo/cuestionario`
- Rol: padre, psicologo.
- Componente: `src/pages/Plataforma/Cuestionario/Cuestionario.tsx`
- Servicios:
  - `src/services/questionnaires/questionnaires.api.ts`
- Acciones UI:
  - iniciar sesion de cuestionario
  - responder preguntas
  - guardar respuestas
  - enviar cuestionario
  - visualizar estado de procesamiento y resultado
- Limitaciones:
  - contrato exacto de payload submit/session no verificable solo con frontend; hay normalizacion defensiva.

## Plataforma: Historial

- Proposito: listar sesiones previas, abrir detalle, gestionar share/tags/pdf.
- Rutas:
  - `/padre/historial`
  - `/psicologo/historial`
- Rol: padre, psicologo.
- Componentes:
  - `src/pages/Plataforma/HistorialPadre/HistorialPadre.tsx`
  - `src/pages/Plataforma/HistorialPsicologo/HistorialPsicologo.tsx`
  - base comun: `src/pages/Plataforma/Historial/HistorialBase.tsx`
- Hooks/servicios:
  - `useQuestionnaireHistoryV2`
  - `questionnaires.api.ts` (history/detail/results/tags/share/pdf)
- Acciones UI:
  - filtrar por estado
  - paginar
  - abrir detalle
  - crear/eliminar tags
  - generar enlace compartido
  - generar/consultar/descargar PDF

## Plataforma: Vista compartida

- Proposito: mostrar recurso compartido de resultados sin autenticacion.
- Ruta: `/cuestionario/compartido/:questionnaireId/:shareCode`
- Rol: publico.
- Componente: `src/pages/Plataforma/CuestionarioCompartido/CuestionarioCompartido.tsx`
- Servicio:
  - `getSharedQuestionnaireV2`
- Acciones UI:
  - carga de metadata de sesion
  - render de resultado principal
  - render de dominios y comorbilidad
  - manejo de errores por codigo HTTP (400/403/404/410/5xx)

## Plataforma: MiCuenta

- Proposito: administracion de perfil autenticado y seguridad de cuenta.
- Rutas:
  - `/padre/cuenta`
  - `/psicologo/cuenta`
  - `/admin/cuenta`
- Rol: padre, psicologo, admin.
- Componente: `src/pages/Plataforma/MiCuenta/MiCuenta.tsx`
- Servicios:
  - `changePassword`, `logout`, `mfaDisable`, `reloadProfile` (via contexto)
- Acciones UI:
  - ver datos del perfil
  - cambiar contrasena
  - activar/desactivar MFA (flujo visible para guardian)
  - cerrar sesion
- Limitaciones:
  - no evidencia de edicion general de perfil (nombre/email) en esta vista.

## Plataforma: AyudaBase

- Proposito: soporte de usuario final y reporte de incidencias.
- Rutas:
  - `/padre/ayuda`
  - `/psicologo/ayuda`
- Rol: padre, psicologo.
- Componente: `src/pages/Plataforma/Ayuda/AyudaBase.tsx`
- Servicios/hooks:
  - `createProblemReport`
  - `useMyProblemReports`
- Acciones UI:
  - FAQ por rol
  - crear reporte con adjunto opcional
  - ver mis reportes con filtros y paginacion
  - ver detalle de reporte
  - canales de contacto (WhatsApp/Gmail/Outlook/copia correo)

## Plataforma: SugerenciasPsicologo

- Proposito: pantalla reservada para sugerencias del psicologo.
- Ruta: `/psicologo/sugerencias`
- Rol: psicologo.
- Componente: `src/pages/Plataforma/SugerenciasPsicologo/SugerenciasPsicologo.tsx`
- Estado funcional observado:
  - vista minimal con texto de placeholder.

## Admin: Metricas

- Proposito: monitoreo operativo tradicional (salud y snapshot).
- Ruta: `/admin/metricas`
- Rol: admin.
- Componente: `src/pages/Administrador/Metricas/Metricas.tsx`
- Hook/servicios:
  - `useMetrics`
  - `getAdminMetrics`, `getEmailHealth`, fetch directo a `/healthz` y `/readyz`
- Acciones UI:
  - ver estado servidor, base de datos y correo
  - ver snapshot de latencia/uptime/requests y codigos HTTP
  - recargar metricas

## Admin: Dashboard

- Proposito: lectura analitica/ejecutiva por bloques y meses.
- Ruta: `/admin/dashboard`
- Rol: admin.
- Componente: `src/pages/Administrador/Dashboard/Dashboard.tsx`
- Hooks/servicios:
  - `useDashboard` + `services/dashboard/*`
  - `useDashboardReports` + `services/reports/*`
- Acciones UI:
  - cambiar rango de meses
  - recargar bloques
  - generar reportes operativos contextuales por seccion
  - generar reportes adicionales (seguridad/cumplimiento y trazabilidad)
- Limitaciones:
  - si un bloque falla, se muestra error por bloque sin detener toda la pantalla.

## Admin: Cuestionarios

- Proposito: gestion administrativa de templates de cuestionario.
- Rutas:
  - `/admin/cuestionarios`
  - `/admin/cuestionarios/:templateId/preguntas`
- Rol: admin.
- Componente: `src/pages/Administrador/Cuestionarios/Cuestionarios.tsx`
- Componente secundario: `src/pages/Administrador/Cuestionarios/PreguntasCuestionario.tsx`
- Hook/servicio:
  - `useAdminQuestionnaires`
  - `services/admin/questionnaires.ts`
- Acciones UI:
  - listar y filtrar templates
  - crear plantilla
  - publicar
  - archivar
  - clonar template
  - abrir gestion de preguntas por plantilla
  - agregar pregunta a plantilla

## Admin: Evaluaciones

- Proposito: supervision y actualizacion de estado de evaluaciones.
- Ruta: `/admin/evaluaciones`
- Rol: admin.
- Componente: `src/pages/Administrador/Evaluaciones/Evaluaciones.tsx`
- Hook/servicio:
  - `useAdminEvaluations`
  - `services/admin/evaluations.ts`
- Acciones UI:
  - listar con filtros (estado, edad, fechas, orden)
  - cambiar estado de evaluacion

## Admin: Usuarios

- Proposito: gestion de usuarios del sistema.
- Ruta: `/admin/usuarios`
- Rol: admin.
- Componente: `src/pages/Administrador/Usuarios/Usuarios.tsx`
- Hook/servicio:
  - `useUsers`
  - `services/admin/users.ts`
- Acciones UI:
  - listar/paginar
  - filtrar por rol/tipo/estado y busqueda local
  - editar usuario
  - desactivar usuario
  - reset de password
  - reset de MFA

## Admin: Psicologos

- Proposito: revision de psicologos en estado pendiente/rechazado.
- Ruta: `/admin/psicologos`
- Rol: admin.
- Componente: `src/pages/Administrador/Psicologos/Psicologos.tsx`
- Hook/servicio:
  - `usePsychologists`
  - `services/admin/psychologists.ts`
  - usa `getAllUsers` para base de datos de usuarios
- Acciones UI:
  - aprobar psicologo
  - rechazar con razon
  - filtrar por estado de revision

## Admin: Auditoria

- Proposito: consulta de eventos de auditoria.
- Ruta: `/admin/auditoria`
- Rol: admin.
- Componente: `src/pages/Administrador/Auditoria/Auditoria.tsx`
- Hook/servicio:
  - `useAuditLogs`
  - `services/admin/audit.ts`
- Acciones UI:
  - buscar y filtrar por accion
  - ordenar por fecha
  - paginar
  - abrir detalle de evento (raw serializado)

## Admin: ReportesAdmin

- Proposito: gestion de reportes de incidencias enviados por usuarios.
- Ruta: `/admin/reportes`
- Rol: admin.
- Componente: `src/pages/Administrador/Reportes/Reportes.tsx`
- Hook/servicio:
  - `useAdminProblemReports`
  - `services/problemReports/problemReports.api.ts`
- Acciones UI:
  - listar con filtros avanzados
  - abrir detalle de reporte
  - actualizar estado y notas admin
  - visualizar metadatos y adjuntos

## Dependencias transversales comunes

- `AuthProvider` + `useAuth` para sesion y perfil.
- `CustomSelect` para filtros/selectores.
- `Modal` para confirmaciones y detalle.
- `ApiError` para mensajes de error por HTTP.
