# Registro de cambios del frontend (implementaciones)

## Alcance del registro

Este documento consolida cambios implementados en el frontend que afectan comportamiento funcional o integracion API.

- Fuente: evidencia del repositorio frontend local.
- Si un cambio no puede verificarse solo con frontend, se marca como inferido.

## 2026-04-27 - Normalizacion de lenguaje natural en vistas de resultados/admin

### 1) Utilidad transversal de presentacion natural

- Archivo:
  - `src/utils/presentation/naturalLanguage.ts`
- Cambio:
  - se consolido una capa comun para formateo y traduccion de presentacion:
    - fechas `es-CO`,
    - booleanos (`Si/No`),
    - numeros, porcentajes y tamanos de archivo,
    - estados, roles, modos, dominios y niveles de alerta/confianza,
    - traduccion de MIME y modulos de origen,
    - conversion de claves tecnicas a etiquetas legibles,
    - construccion de filas seguras para objetos dinamicos,
    - mapeo de errores API a mensajes entendibles para usuario.

### 2) Resultados compartidos e historial con lenguaje menos tecnico

- Archivos:
  - `src/pages/Plataforma/CuestionarioCompartido/CuestionarioCompartido.tsx`
  - `src/pages/Plataforma/CuestionarioCompartido/CuestionarioCompartido.css`
  - `src/pages/Plataforma/Historial/HistorialBase.tsx`
  - `src/pages/Plataforma/Historial/HistorialBase.css`
- Cambio:
  - se reduce exposicion de campos crudos en primer nivel (IDs/modelos/mode_key).
  - campos tecnicos se reubican como referencia interna secundaria.
  - dominios, alertas, bandas de confianza, comorbilidad y puntajes se muestran en espanol claro.
  - se agrega advertencia visible de uso orientativo (alerta temprana / no diagnostico definitivo).
  - se sustituyen mensajes tecnicos por mensajes de usuario en errores de carga/acciones.

### 3) Auditoria y dashboard con mejor humanizacion

- Archivos:
  - `src/pages/Administrador/Auditoria/Auditoria.tsx`
  - `src/pages/Administrador/Dashboard/Dashboard.tsx`
- Cambio:
  - auditoria amplia diccionarios de acciones y etiquetas, y renderiza `raw` con filas traducidas.
  - dashboard mejora normalizacion de etiquetas/valores y mantiene HTTP como detalle tecnico secundario.

### 4) Cuestionarios admin y reportes con etiquetas naturales

- Archivos:
  - `src/pages/Administrador/Cuestionarios/PreguntasCuestionario.tsx`
  - `src/pages/Administrador/Reportes/Reportes.tsx`
- Cambio:
  - `Template ID` se presenta como `Referencia de plantilla`.
  - `response_type` deja de mostrarse crudo en el listado de preguntas agregadas.
  - `Min/Max` se muestran como `Minimo/Maximo` y se mejora ayuda de opciones (`valor|texto visible`).
  - reportes traduce `source_module`, `source_path` y MIME de adjuntos.
  - metadata (si llega) se renderiza con filas seguras en lugar de estructura cruda.

### 5) Verificacion

- `npm run build`: exitoso.
- `npm run lint`: falla por reglas existentes fuera de este cambio (`react-hooks/set-state-in-effect` en hooks/paginas ya presentes y `no-useless-escape` en `questionnaires.api.ts`).

## 2026-04-25 - Reestructuracion integral del README principal del frontend

### 1) README.md reescrito para onboarding tecnico

- Archivos:
  - `README.md`
- Cambio:
  - se reemplaza el README previo (breve y centrado en CI/deploy) por una version completa, autosuficiente y orientada a onboarding tecnico.
  - el nuevo contenido documenta:
    - objetivo y alcance del frontend,
    - stack real del repositorio,
    - arquitectura y estructura de carpetas,
    - navegacion por rutas/roles,
    - modulos funcionales vigentes,
    - integracion API desde capa de servicios,
    - instalacion, configuracion y ejecucion local,
    - validacion local de calidad,
    - CI/CD y despliegue self-hosted con nombres de workflows/jobs vigentes,
    - limitaciones y consideraciones de verificabilidad desde frontend.

### 2) Criterio documental aplicado

- Archivos:
  - `README.md`
  - `docs/proyecto/12-RegistroCambiosFrontend.md`
- Cambio:
  - se mantiene alineacion con la politica de documentacion (`docs/proyecto/13-PoliticaDocumentacionCambios.md`):
    - sin inventar contratos backend,
    - diferenciando evidencia visible en frontend de inferencias,
    - evitando referencias a contexto externo de edicion.

## 2026-04-24 - Ajustes funcionales en Auditoria, Cuestionarios, Mi Cuenta, Historial y Cuestionario

### 1) Auditoria: retiro de bloque tecnico en detalle

- Archivos:
  - `src/pages/Administrador/Auditoria/Auditoria.tsx`
  - `src/pages/Administrador/Auditoria/Auditoria.css`
- Cambio:
  - se elimina el bloque expandible de datos tecnicos completos (raw/JSON) del modal de detalle.
  - el detalle queda enfocado en informacion humanizada.

### 2) Cuestionarios admin: limpieza de columna de acciones

- Archivos:
  - `src/pages/Administrador/Cuestionarios/Cuestionarios.tsx`
  - `src/pages/Administrador/Cuestionarios/Cuestionarios.css`
- Cambio:
  - accion principal visible: `Gestionar preguntas`.
  - acciones secundarias (`Clonar`, `Publicar`, `Archivar`) pasan a menu contextual `Acciones`.
  - se conserva funcionalidad, mejora jerarquia visual.

### 3) Mi Cuenta: MFA obligatorio para admin/psicologo

- Archivos:
  - `src/pages/Plataforma/MiCuenta/MiCuenta.tsx`
  - `src/pages/Plataforma/MiCuenta/MiCuenta.css`
- Cambio:
  - perfiles admin y psicologo ya no muestran opcion de `Desactivar MFA`.
  - se agrega indicador visual `Obligatorio`.
  - si MFA no esta activo, se mantiene CTA de activacion.

### 4) Historial: lenguaje y flujo share/PDF mas claros

- Archivos:
  - `src/pages/Plataforma/Historial/HistorialBase.tsx`
  - `src/pages/Plataforma/Historial/HistorialBase.css`
- Cambios:
  - etiquetas y formato de valores mas naturales.
  - se eliminan controles `Permitir tags` y `Permitir descarga PDF`.
  - se reorganiza bloque final en dos grupos:
    - `Compartir resultado` (generar/copiar/abrir/regenerar enlace)
    - `Documento PDF` (generar/consultar estado/descargar)

### 5) Cuestionario: mejoras de presentacion y validacion

- Archivos:
  - `src/pages/Plataforma/Cuestionario/Cuestionario.tsx`
  - `src/pages/Plataforma/Cuestionario/Cuestionario.css`
- Cambios:
  - rol del cuestionario en curso mostrado en chip visual humanizado.
  - estado `Guardando...` centrado y estable en boton de avance.
  - restricciones numericas reforzadas con min/max/step (y defaults conservadores si no llegan).
  - labels de opcion multiple limpian prefijos numericos de codigo interno (solo visual, sin alterar valor enviado).

## 2026-04-23 - Ajustes visuales MFA/Admin y limpieza Dashboard

### 1) MFA challenge: control de modo sin checkbox

- Vista: `src/pages/Autenticacion/MFA/MFA.tsx`
- Estilos: `src/pages/Autenticacion/MFA/MFA.css`
- Cambios:
  - se reemplazo checkbox de recovery por control segmentado:
    - `Codigo TOTP`
    - `Codigo de recuperacion`
  - se mantiene envio condicional de payload:
    - `code` en modo TOTP
    - `recovery_code` en modo recovery
  - foco natural al cambiar de modo (cajas/input recovery).

### 2) Dashboard: eliminacion total de generacion de reportes

- Vista: `src/pages/Administrador/Dashboard/Dashboard.tsx`
- Estilos: `src/pages/Administrador/Dashboard/Dashboard.css`
- Eliminado:
  - botones `Generar reporte` y `Reportes adicionales`
  - estados/loading/error/success de reportes en dashboard
  - render de salida de reportes
  - hook y servicios dedicados al flujo:
    - `src/hooks/reports/useDashboardReports.ts`
    - `src/services/reports/reports.api.ts`
    - `src/services/reports/reports.mappers.ts`
    - `src/services/reports/reports.types.ts`

### 3) Estandarizacion de paginacion (`Tamaño`)

- Vistas actualizadas:
  - `src/pages/Administrador/Usuarios/Usuarios.tsx`
  - `src/pages/Administrador/Auditoria/Auditoria.tsx`
  - `src/pages/Administrador/Cuestionarios/Cuestionarios.tsx`
  - `src/pages/Administrador/Psicologos/Psicologos.tsx`
  - `src/pages/Administrador/Evaluaciones/Evaluaciones.tsx`
  - `src/pages/Plataforma/Historial/HistorialBase.tsx`
- Resultado:
  - etiqueta visible estandarizada a `Tamaño`.

### 4) Usuarios admin: iconografia y micro-ajustes de accion

- Archivos:
  - `src/pages/Administrador/Usuarios/Usuarios.tsx`
  - `src/pages/Administrador/Usuarios/Usuarios.css`
- Cambios:
  - icono de desactivar pasa de papelera a bloqueo.
  - boton de copiar ID con mejor tamaño/alineacion y foco visible.

### 5) Auditoria: detalle en lenguaje mas natural

- Archivos:
  - `src/pages/Administrador/Auditoria/Auditoria.tsx`
  - `src/pages/Administrador/Auditoria/Auditoria.css`
- Cambios:
  - el modal prioriza campos humanizados (accion, actor, objetivo, resumen, fecha).
  - campos complementarios con labels naturales.
  - datos tecnicos completos en bloque secundario desplegable.

## 2026-04-22 - Admin Cuestionarios + Continuidad V2

### 1) Creacion de plantilla de cuestionario (admin)

- Endpoint integrado: `POST /api/v1/questionnaires`
- Servicio: `src/services/admin/questionnaires.ts`
- Hook: `src/hooks/useAdminQuestionnaires.ts`
- UI: `src/pages/Administrador/Cuestionarios/Cuestionarios.tsx`
- Comportamiento:
  - boton `Crear plantilla`
  - modal con `name`, `version`, `description`
  - refresco de listado y mensaje de exito.

### 2) Agregar pregunta a plantilla (admin)

- Endpoint integrado: `POST /api/v1/questionnaires/{template_id}/questions`
- Servicio: `src/services/admin/questionnaires.ts`
- UI nueva:
  - `src/pages/Administrador/Cuestionarios/PreguntasCuestionario.tsx`
  - `src/pages/Administrador/Cuestionarios/PreguntasCuestionario.css`
- Ruta agregada:
  - `/admin/cuestionarios/:templateId/preguntas`
- Comportamiento:
  - accion `Gestionar preguntas` por plantilla
  - formulario de alta de pregunta con campos base (`code`, `text`, `response_type`, `position`, opcionales).

### 3) Continuar sesion de Questionnaire V2

- Endpoint adicional usado antes de crear sesion:
  - `GET /api/v2/questionnaires/history` con estados `draft` / `in_progress`
- Vista: `src/pages/Plataforma/Cuestionario/Cuestionario.tsx`
- Comportamiento:
  - si hay sesion reutilizable, la UI muestra:
    - `Continuar cuestionario`
    - `Empezar de nuevo`
  - continuar:
    - reutiliza `session_id`
    - restaura respuestas y contexto de avance
  - empezar de nuevo:
    - crea nueva sesion (`POST /api/v2/questionnaires/sessions`).

### 4) Alineacion de rol V2 (`guardian`)

- Tipo actualizado:
  - `QuestionnaireV2Role = 'guardian' | 'psychologist'`
- Mapeo UI->API:
  - `padre -> guardian`
  - `psicologo -> psychologist`
- Documentacion alineada:
  - `docs/vistas/Plataforma/Cuestionario.md`

## 2026-04-22 - MFA challenge + Dashboard UX/reportes

### 1) MFA challenge con 6 cajas de codigo

- Vista: `src/pages/Autenticacion/MFA/MFA.tsx`
- Estilos: `src/pages/Autenticacion/MFA/MFA.css`
- Cambios:
  - input unico reemplazado por 6 cajas (1 digito por caja)
  - autoavance al escribir
  - retroceso con backspace
  - pegado de codigo completo distribuido automaticamente
  - se mantiene flujo alterno de recovery code

### 2) Reportes de Dashboard desacoplados de `adoption_history`

- Archivos:
  - `src/services/reports/reports.types.ts`
  - `src/services/reports/reports.mappers.ts`
  - `src/pages/Administrador/Dashboard/Dashboard.tsx`
- Cambios:
  - normalizacion del dataset por secciones
  - render por familia (series, resumenes, bloques estructurados)
  - eliminacion del fallback que bloqueaba visualizacion cuando no habia `adoption_history`

### 3) Normalizacion textual/visual de Dashboard

- Archivos:
  - `src/pages/Administrador/Dashboard/Dashboard.tsx`
  - `src/pages/Administrador/Dashboard/Dashboard.css`
  - `src/hooks/dashboard/useDashboard.ts`
- Cambios:
  - titulos en lenguaje mas claro para administracion
  - contexto breve por seccion
  - periodos y labels tecnicos formateados en lenguaje natural

### 4) Documentacion asociada

- `docs/vistas/Autenticacion/MFA.md`
- `docs/vistas/Administrador/Dashboard.md`

## Registro continuo

Toda implementacion nueva debe agregar una entrada en este archivo con:

1. fecha
2. modulo afectado
3. endpoints consumidos/ajustados
4. cambios de UI/flujo
5. archivos principales modificados
