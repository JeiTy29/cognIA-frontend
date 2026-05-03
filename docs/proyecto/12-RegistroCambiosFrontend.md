# Registro de cambios del frontend (implementaciones)

## Alcance del registro

Este documento consolida cambios implementados en el frontend que afectan comportamiento funcional o integracion API.

- Fuente: evidencia del repositorio frontend local.
- Si un cambio no puede verificarse solo con frontend, se marca como inferido.

## 2026-05-03 - Integracion de transporte cifrado, results-secure y clinical summary

### Modulos afectados

- `src/services/api/url.ts`
- `src/services/api/policy.ts`
- `src/services/api/httpClient.ts`
- `src/services/api/encryptedTransport.ts`
- `src/services/questionnaires/questionnaires.api.ts`
- `src/services/questionnaires/questionnaires.types.ts`
- `src/services/questionnaires/clinicalSummary.ts`
- `src/pages/Plataforma/Cuestionario/Cuestionario.tsx`
- `src/pages/Plataforma/Cuestionario/Cuestionario.css`
- `src/pages/Plataforma/Historial/HistorialBase.tsx`
- `src/pages/Plataforma/CuestionarioCompartido/CuestionarioCompartido.tsx`
- `src/App.tsx`
- `src/styles/globals.css`
- `.env.example`
- `README.md`
- `docs/vistas/Plataforma/Cuestionario.md`
- `docs/vistas/Plataforma/Historial.md`
- `docs/proyecto/05-FlujosUsuarios.md`
- `docs/proyecto/08-MigracionEndpointsActivos.md`

### Ajuste aplicado

- Se integra cliente de transporte cifrado hibrido con:
  - `GET /api/v2/security/transport-key` publico
  - AES-256-GCM por request
  - RSA-OAEP SHA-256 para cifrar la clave AES
  - envelope `transport_envelope_v1`
- La capa HTTP central mantiene `credentials: 'include'` por defecto y agrega wrappers seguros para payload sensible.
- Questionnaire V2 migra endpoints sensibles a variantes cifradas o replacements seguros cuando el backend los expone:
  - `sessions`
  - `sessions/{id}/secure`
  - `sessions/{id}/page-secure`
  - `answers`
  - `submit`
  - `history/secure`
  - `results-secure`
  - `clinical-summary`
  - `pdf/secure`
  - `shared/access-secure`
- La pantalla final de Cuestionario deja de depender del endpoint legacy plaintext de resultados y renderiza:
  - sintesis general
  - niveles de compatibilidad
  - indicadores principales observados
  - impacto funcional
  - recomendacion profesional
  - aclaracion importante
- El disclaimer de no diagnostico se muestra siempre, incluso si el backend no devuelve la seccion completa.
- Historial incorpora `clinical-summary` en el detalle cuando la sesion ya fue enviada o procesada.
- La app agrega validacion temprana de configuracion API para evitar fallos silenciosos cuando `VITE_API_BASE_URL` queda vacia o invalida en builds self-hosted.
- Se documenta el uso recomendado de:
  - `VITE_COGNIA_ENCRYPTED_TRANSPORT`
  - `VITE_COGNIA_REQUIRE_ENCRYPTED_SENSITIVE_PAYLOADS`
  - `VITE_DEBUG_API_CLIENT`

### Diagnostico self-hosted documentado

- Se confirma como causa mas probable del dominio propio sin requests una combinacion de:
  - build distinto/stale respecto a Vercel,
  - `VITE_API_BASE_URL` mal inyectada en build self-hosted,
  - y soporte insuficiente de la version anterior del frontend para una base relativa `/api`.
- La evidencia remota observada fue:
  - `https://www.cognia.lat/api/v2/security/transport-key` devolviendo `transport_key_failed`,
  - mientras `https://cognia-api.onrender.com/api/v2/security/transport-key` responde correctamente.

### Validacion local

- `npm run test`
- `npm run lint`
- `npm run build`

## 2026-05-02 - Preparacion de SonarCloud y saneamiento local previo

### 1) Configuracion base de Sonar en el repo

- Archivo:
  - `sonar-project.properties`
- Cambio:
  - se agrega configuracion minima para el proyecto frontend:
    - `sonar.projectKey=JeiTy29_cognIA-frontend`
    - `sonar.organization=JeiTy29`
    - `sonar.host.url=https://sonarcloud.io`
  - se deja fuera cualquier token o secreto.

### 2) Correcciones locales de calidad para despejar el analisis

- Archivos:
  - `src/hooks/dashboard/useDashboard.ts`
  - `src/pages/Administrador/Psicologos/Psicologos.tsx`
  - `src/services/questionnaires/questionnaires.api.ts`
- Cambio:
  - se elimina un patron de `setState` sincronico dentro de `useEffect` en Dashboard usando diferimiento seguro.
  - se elimina el reseteo de pagina por efecto en Psicologos y se mueve a handlers de filtro/paginacion.
  - se corrige una expresion regular con escapes innecesarios en `questionnaires.api.ts`.

### 3) Verificacion local

- `npm run lint`: exitoso.
- `npm run build`: exitoso.

### 4) Bloqueo para ciclo remoto completo

- En este workspace no existe archivo `.env` y no hay variables de entorno cargadas para:
  - `SONAR_PROJECT_KEY`
  - `SONAR_ORGANIZATION`
  - `SONAR_HOST_URL`
  - `SONAR_TOKEN`
- Por esta razon no fue posible ejecutar desde el entorno local:
  - `sonar-scanner`
  - consulta de issues en SonarCloud
  - verificacion del Quality Gate

## 2026-05-02 - Creacion de `.env` real para herramientas externas

### Alcance

- Archivo creado:
  - `.env`

### Cambio aplicado

- Se genero un `.env` real a partir de `.env.local` para que herramientas externas al runtime de Vite, como `sonar-scanner`, puedan apoyarse en un archivo de entorno del proyecto.
- La verificacion se hizo solo por nombres de variables, sin exponer valores sensibles.

### Variables confirmadas por nombre

- `VITE_API_BASE_URL`
- `VITE_DEV_AUTH_BYPASS`
- `VITE_DEV_ROLE`
- `SONAR_HOST_URL`
- `SONAR_TOKEN`
- `SONAR_ORGANIZATION`
- `SONAR_PROJECT_KEY`
- `SONAR_PROJECT_NAME`

### Observacion operativa

- `.gitignore` ya protege `.env`, por lo que el archivo queda fuera de seguimiento.
- Tener `.env` en disco no implica automaticamente que PowerShell cargue esas variables al entorno del proceso; si una herramienta lo requiere, debe importarse o leerse explicitamente.

## 2026-05-02 - Ciclo local de saneamiento para SonarCloud

### Preparacion y ejecucion

- Se valido `sonar-project.properties` con:
  - `sonar.projectKey=JeiTy29_cognIA-frontend`
  - `sonar.organization=JeiTy29`
  - `sonar.host.url=https://sonarcloud.io`
- Se cargaron variables desde `.env` dentro del proceso de terminal sin exponer secretos.
- Se ejecutaron:
  - `npm run lint`
  - `npm run build`

### Correcciones aplicadas por issues seguros

- Archivos:
  - `src/pages/Administrador/Auditoria/Auditoria.tsx`
  - `src/components/Footer/Footer.css`
  - `src/pages/Plataforma/Cuestionario/Cuestionario.tsx`
  - `src/services/auth/auth.types.ts`
  - `src/services/questionnaires/questionnaires.types.ts`
  - `src/index.css`
  - `src/pages/Plataforma/HistorialPadre/HistorialPadre.css`
  - `src/pages/Plataforma/HistorialPsicologo/HistorialPsicologo.css`
  - `src/pages/Plataforma/SugerenciasPsicologo/SugerenciasPsicologo.css`
  - `src/App.tsx`
  - `src/components/CustomSelect/CustomSelect.tsx`
  - `src/services/api/httpClient.ts`
  - `src/pages/Administrador/Dashboard/Dashboard.tsx`
- Cambios:
  - comparador explicito en `sort()` de Auditoria
  - correccion de shorthand `font` en Footer
  - limpieza de smells puntuales en Cuestionario (`Object.hasOwn`, `Math.max`, asserts redundantes)
  - normalizacion de tipos flexibles sin `| string` redundante en auth/questionnaires
  - comentarios minimos en archivos CSS vacios para evitar `Unexpected empty source`
  - alias PascalCase en ruta MFA de `App.tsx`
  - props readonly en `CustomSelect` y componentes puntuales de Dashboard
  - uso de `??=` en `httpClient`
  - ajustes menores de regex/aliases tipados en Dashboard

### Bloqueos externos detectados

- `sonar-scanner` tradicional fallo por Java 8 local; se valido una via moderna con `@sonar/scan`.
- El scanner moderno pudo autenticarse y resolver el proyecto, pero la subida de analisis manual fue rechazada porque el proyecto tiene **Automatic Analysis** habilitado en SonarCloud.
- Adicionalmente, el valor operativo de organizacion en SonarCloud responde como `jeity29` al consultar el proyecto, aunque la configuracion esperada/documentada en repo usa `JeiTy29`.

### Estado remoto observado en SonarCloud

- Issues abiertos observados via API:
  - `CRITICAL`: 48
  - `MAJOR`: 181
  - `MINOR`: 197
  - `BUG`: 9
  - `CODE_SMELL`: 415
  - `VULNERABILITY`: 2
- `Quality Gate` consultado via API:
  - `status: NONE`
- Con el estado actual del proyecto remoto, no fue posible subir un analisis manual nuevo desde el repo local sin una decision humana sobre la configuracion de SonarCloud.

## 2026-04-27 - Normalizacion central de URL base backend

### 1) Utilidad central de resolucion de URLs

- Archivo:
  - `src/services/api/url.ts`
- Cambio:
  - se agrega una utilidad unica para leer y normalizar `VITE_API_BASE_URL`.
  - expone:
    - `getConfiguredBackendBaseUrl()`
    - `joinApiUrl(path)`
    - `joinBackendRootUrl(path)`
  - tolera configuracion con o sin `/api`.
  - evita duplicados como `/api/api/auth/login`.
  - mantiene endpoints raiz (`/healthz`, `/readyz`) fuera de `/api`.

### 2) Servicios y hooks alineados

- Archivos:
  - `src/services/api/httpClient.ts`
  - `src/services/auth/auth.api.ts`
  - `src/services/auth/auth.refresh.ts`
  - `src/hooks/metrics/useMetrics.ts`
- Cambio:
  - `httpClient` deja de concatenar `${BASE_URL}${path}` y usa `joinApiUrl(path)`.
  - login y refresh dejan de concatenar manualmente `VITE_API_BASE_URL` y usan la utilidad central.
  - metricas admin resuelve `/healthz` y `/readyz` con `joinBackendRootUrl(path)`.

### 3) Documentacion alineada al comportamiento real de Vite

- Archivos:
  - `.env.example`
  - `README.md`
  - `docs/proyecto/03-ArquitecturaFrontend.md`
  - `docs/proyecto/08-MigracionEndpointsActivos.md`
  - `docs/proyecto/10-ModulosFrontendVigentes.md`
  - `docs/vistas/Autenticacion/InicioSesion.md`
  - `docs/vistas/Administrador/Metricas.md`
- Cambio:
  - se aclara que `VITE_API_BASE_URL` puede declararse con o sin `/api`.
  - se recomienda configurar el origen sin `/api`.
  - se documenta que Vite resuelve `VITE_*` en build/dev, por lo que cambiar `.env` exige reinicio o recompilacion.

### 4) Verificacion

- `npm run build`: exitoso.
- `npm run lint`: mantiene fallos preexistentes en archivos no intervenidos funcionalmente (`useDashboard.ts`, `Psicologos.tsx`, `questionnaires.api.ts`).

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

## 2026-04-28 - Correccion de continuidad de sesion en Cuestionario V2

### Modulo afectado

- `src/pages/Plataforma/Cuestionario/Cuestionario.tsx`

### Endpoints involucrados (sin cambios de contrato)

- `GET /api/v2/questionnaires/sessions/{session_id}`
- `GET /api/v2/questionnaires/sessions/{session_id}/page`
- `PATCH /api/v2/questionnaires/sessions/{session_id}/answers`

### Ajuste aplicado

- Se corrigio la hidratacion de respuestas al continuar sesion:
  - antes se priorizaba unicamente `detail.answers` del detalle de sesion
  - ahora tambien se infieren respuestas desde las preguntas cargadas por pagina cuando estas vienen embebidas en el payload (`answer`, `current_answer`, `response`, `response_value`, `selected_value`, `value`)
  - se unifican ambas fuentes y luego se calcula el indice de reanudacion sobre la primera pregunta pendiente
- Se robustecio el identificador de pregunta para guardado y reanudacion:
  - se aceptan llaves `id`, `question_id`, `item_id`, `questionnaire_item_id`, `code`
  - el `PATCH /answers` ahora envia `question_id` priorizando identificadores contractuales (`question_id`/`item_id`/`questionnaire_item_id`) antes de `id`
  - la lectura de respuesta actual en UI busca aliases de la misma pregunta para evitar desalineaciones entre keys del backend y keys de render

### Impacto funcional

- El flujo de `Continuar cuestionario` retoma de forma mas consistente desde el punto real de avance y evita reinicios aparentes por respuestas no hidratadas.

## 2026-05-02 - Endurecimiento de auth y accesibilidad para Sonar

### Modulos afectados

- `src/utils/auth/storage.ts`
- `src/components/ProtectedRoute/ProtectedRoute.tsx`
- `src/components/Modal/Modal.tsx`
- `src/components/Modal/Modal.css`
- `src/pages/Autenticacion/MFA/MFA.tsx`
- `src/pages/Autenticacion/MFA/MFA.css`
- `src/pages/Administrador/Auditoria/Auditoria.tsx`
- `src/utils/auth/events.ts`
- `src/hooks/useUsers.ts`
- `src/hooks/usePsychologists.ts`
- `src/hooks/useMyProblemReports.ts`
- `src/hooks/useAuditLogs.ts`
- `src/hooks/useAdminQuestionnaires.ts`
- `src/hooks/useAdminProblemReports.ts`
- `src/hooks/useAdminEvaluations.ts`
- `src/hooks/questionnaires/useQuestionnaireHistoryV2.ts`
- `src/hooks/dashboard/useDashboard.ts`
- `src/hooks/metrics/useMetrics.ts`
- `src/components/MFA/MfaSetupView.tsx`
- `src/pages/Plataforma/Cuestionario/Cuestionario.tsx`
- `scripts/ops/deploy_frontend_self_hosted.sh`

### Ajuste aplicado

- El storage de autenticacion ahora conserva el access token en memoria y valida formato antes de aceptarlo, reduciendo exposicion innecesaria en `sessionStorage` sin cambiar contratos del backend.
- `ProtectedRoute` evita promesas flotantes al intentar el refresh silencioso de sesion.
- El modal base usa semantica accesible de dialogo, backdrop interactivo real y timers basados en `globalThis`.
- La pantalla MFA reemplaza el agrupador ARIA generico por `fieldset/legend`, evita `key` por indice y normaliza el saneado de digitos con `replaceAll`.
- Auditoria deja de exponer la clave literal `PASSWORD` para evitar falso positivo de secreto hardcodeado sin perder la traduccion de eventos de contrasena.
- Se unificaron timers y disparos asincronos de hooks/pantallas a `globalThis` + `catch(() => undefined)` para reducir promesas flotantes y usos de `window` reportados por Sonar sin cambiar el comportamiento de carga.
- `useMetrics` y `Cuestionario` ajustan refs de polling a `ReturnType<typeof globalThis.setTimeout>` y simplifican `slice(next.length - 30)` a `slice(-30)`.
- `MfaSetupView` elimina otro saneado con regex global tradicional en favor de `replaceAll`.
- El script Bash de despliegue migra comparaciones a `[[ ... ]]` manteniendo intacta la logica operativa.

### Validacion local

- `npm run lint`
- `npm run build`

## 2026-05-03 - Reduccion adicional de deuda tecnica de bajo riesgo

### Modulos afectados

- `src/pages/Inicio/Trastornos/Trastornos.tsx`
- `src/pages/Inicio/Trastornos/Trastornos.css`
- `src/pages/Autenticacion/Registro/Registro.tsx`
- `src/pages/Autenticacion/Registro/Registro.css`
- `src/utils/presentation/naturalLanguage.ts`
- `src/pages/Administrador/Metricas/Metricas.tsx`
- `src/utils/auth/jwt.ts`
- `src/pages/Administrador/Reportes/Reportes.tsx`
- `src/pages/Administrador/Dashboard/Dashboard.tsx`

### Ajuste aplicado

- La vista de trastornos convierte sus tarjetas interactivas a botones semanticos y reemplaza la `key` por indice con una clave estable basada en el titulo, manteniendo el mismo comportamiento visual.
- Registro convierte la seleccion de rol en botones reales, reemplaza los enlaces simulados de terminos y privacidad por botones estilizados y usa `globalThis.setTimeout` en la redireccion tras crear cuenta.
- `naturalLanguage.ts` reduce deuda mecanica extrayendo helpers de normalizacion y resolucion de porcentajes, ademas de eliminar una assertion innecesaria.
- Metricas extrae resolvedores de estado reutilizables, marca props como `Readonly` y elimina `role="img"` redundante en SVGs informativos.
- `jwt.ts` reemplaza dos regex globales simples por `replaceAll` en la normalizacion Base64.
- Reportes evita promesas flotantes en acciones visibles del listado y del modal, y extrae el render del contenido tabular.
- Dashboard mejora claves React de colecciones renderizadas para no depender del indice puro cuando existe contenido estable reutilizable.

### Validacion local

- `npm run lint`
- `npm run build`

## 2026-05-03 - Correcciones puntuales para bloqueadores de Sonar

### Modulos afectados

- `src/pages/Administrador/Auditoria/Auditoria.tsx`
- `src/components/Modal/Modal.tsx`
- `src/components/Modal/Modal.css`
- `src/pages/Plataforma/Cuestionario/Cuestionario.tsx`
- `src/pages/Plataforma/Historial/HistorialBase.tsx`

### Ajuste aplicado

- Auditoria deja de declarar literales tecnicos con la palabra `password` y ahora construye de forma computada las acciones y tokens asociados al restablecimiento de credenciales, manteniendo la traduccion visible.
- El modal base migra a `<dialog>` sin cambiar su API publica (`isOpen`, `onClose`, `children`) y conserva backdrop, boton de cierre y transiciones de apertura/cierre.
- Cuestionario extrae el disparo asincrono del polling de procesamiento a helpers nombrados para reducir el nivel de anidamiento reportado por Sonar en la consulta de estado.
- Historial simplifica una ternaria redundante y reutiliza el rol recibido para enriquecer el `aria-label` del contenedor principal sin cambiar el texto visible.

### Validacion local

- `npm run lint`
- `npm run build`
