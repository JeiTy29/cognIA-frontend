export const REPORT_SECTION_DESCRIPTIONS = {
    metricsSummary:
        'Esta sección resume el estado general del sistema con indicadores de disponibilidad, latencia y volumen de solicitudes.',
    metricsApiHealth:
        'Esta tabla consolida señales operativas de disponibilidad de la API. Sus valores permiten identificar el estado general del servicio y cualquier alerta relevante para el periodo consultado.',
    metricsEmailHealth:
        'Esta tabla describe la disponibilidad del servicio de correo y su contexto operativo. Los valores indican si el envío de comunicaciones administrativas se encuentra habilitado y con qué nivel de confianza.',
    metricsHttpDistribution:
        'Esta tabla agrupa las respuestas HTTP por familia. Los totales permiten interpretar si predominan solicitudes exitosas, redirecciones, errores de cliente o errores del servidor.',
    metricsDataQuality:
        'Esta tabla muestra indicadores agregados de calidad de datos tomados desde dashboard. Los valores deben interpretarse como contexto complementario y no alteran la vista visible del módulo.',
    metricsModelMonitoring:
        'Esta tabla presenta señales agregadas de monitoreo de modelos. Sus valores ofrecen contexto operativo sobre seguimiento, estabilidad y observaciones recientes del sistema analítico.',
    metricsDrift:
        'Esta tabla resume indicadores agregados de drift cuando están disponibles. Los valores ayudan a detectar cambios relevantes en el comportamiento de entradas o resultados del sistema.',
    metricsEquity:
        'Esta tabla resume indicadores agregados de equidad y consistencia. Debe leerse como una referencia complementaria de monitoreo y no como un diagnóstico técnico exhaustivo.',
    usersSummary:
        'Esta sección resume la cantidad de usuarios incluidos en el reporte y su distribución general por rol y estado.',
    usersRoleDistribution:
        'Esta tabla muestra la cantidad de usuarios agrupados por rol dentro de la plataforma. Los valores permiten identificar la proporción de administradores, psicólogos y padres o tutores en el conjunto consultado.',
    usersStatusDistribution:
        'Esta tabla presenta la distribución de usuarios por estado de cuenta. Los valores indican cuántos registros incluidos en el reporte se encuentran activos o inactivos.',
    usersGrowthSeries:
        'Esta tabla muestra la cantidad de usuarios registrados por mes a partir de información complementaria de dashboard. Cada fila corresponde a un mes calendario y el valor indica nuevas cuentas registradas durante ese periodo.',
    usersAdoptionHistory:
        'Esta tabla resume información histórica de adopción complementaria proveniente de dashboard. Sus valores permiten contextualizar el crecimiento o uso general sin modificar la vista visible de usuarios.',
    usersRetention:
        'Esta tabla muestra indicadores complementarios de retención cuando están disponibles. Los valores ayudan a interpretar permanencia o continuidad de uso a nivel agregado.',
    usersDetailedList:
        'Esta tabla lista los usuarios incluidos en el reporte según la configuración seleccionada. Cada fila representa un registro administrativo con correo, rol visible, estado y fecha de creación.',
    psychologistsSummary:
        'Esta sección resume el estado administrativo y de verificación de los perfiles profesionales incluidos en el reporte.',
    psychologistsVerificationDistribution:
        'Esta tabla agrupa los psicólogos por estado de verificación y disponibilidad administrativa. Los valores ayudan a identificar cuántos perfiles están aprobados, pendientes o rechazados.',
    psychologistsDetailedList:
        'Esta tabla muestra los perfiles profesionales incluidos en el reporte. Cada fila contiene usuario, correo, nombre completo, tarjeta profesional y estado de verificación.',
    psychologistsHumanReview:
        'Esta tabla resume información complementaria relacionada con revisión humana o validación profesional. Sus valores se incluyen solo dentro del PDF como contexto administrativo.',
    psychologistsGrowth:
        'Esta tabla muestra indicadores agregados de crecimiento de usuarios profesionales cuando están disponibles. Cada fila aporta contexto mensual o histórico del universo profesional.',
    questionnairesSummary:
        'Esta sección presenta el estado general de las plantillas incluidas en el reporte y su contexto administrativo dentro del sistema.',
    questionnairesTemplatesTable:
        'Esta tabla lista las plantillas incluidas en el reporte. Los valores permiten revisar nombre, versión, estado y última actualización de cada cuestionario administrativo.',
    questionnairesFunnel:
        'Esta tabla resume el embudo operativo de cuestionarios cuando el backend entrega datos agregados. Sus valores ayudan a interpretar cuántos cuestionarios fueron creados, enviados o procesados.',
    questionnairesVolumeSeries:
        'Esta tabla muestra el volumen mensual de cuestionarios a partir de datos agregados de dashboard. Cada fila representa un mes calendario y su valor asociado.',
    questionnairesQualitySeries:
        'Esta tabla resume indicadores agregados de calidad relacionados con cuestionarios o respuestas. Debe interpretarse como un complemento operativo del reporte.',
    questionnairesAdoptionHistory:
        'Esta tabla presenta información histórica de adopción complementaria asociada al uso de cuestionarios. Sus valores ofrecen contexto adicional sobre actividad o evolución en el periodo consultado.',
    auditSummary:
        'Esta sección resume el universo de eventos de auditoría incluidos según el alcance y filtros seleccionados para el reporte.',
    auditByCategory:
        'Esta tabla agrupa los eventos por categoría operativa. Los valores ayudan a identificar qué tipos de acciones fueron más frecuentes dentro del periodo consultado.',
    auditByResult:
        'Esta tabla resume los eventos según su resultado. Permite interpretar si predominan acciones exitosas, fallidas, denegadas o con errores de validación.',
    auditFrequentActions:
        'Esta tabla presenta las acciones más frecuentes registradas en auditoría. Los valores permiten reconocer patrones de uso o cambios administrativos recurrentes.',
    auditFrequentSections:
        'Esta tabla agrupa los eventos por sección o módulo afectado. Ayuda a ubicar qué áreas del sistema concentraron mayor actividad registrada.',
    auditEventsTable:
        'Esta tabla lista los eventos de auditoría incluidos en el reporte según los filtros seleccionados. Cada fila representa una acción registrada por el sistema junto con su actor, resultado y sección afectada.',
    auditApiHealth:
        'Esta tabla agrega señales operativas de salud de la API para contextualizar el comportamiento general del sistema durante el periodo revisado en auditoría.',
    auditExecutiveSummary:
        'Esta tabla presenta un resumen ejecutivo complementario proveniente de dashboard. Sus valores ayudan a contextualizar la actividad auditada sin reemplazar el detalle de eventos.',
    problemReportsSummary:
        'Esta sección resume el estado general de los reportes de problemas incluidos en el documento.',
    problemReportsByStatus:
        'Esta tabla agrupa los reportes de problemas por estado. Los valores permiten identificar cuántos casos permanecen abiertos, en proceso o resueltos.',
    problemReportsByModule:
        'Esta tabla presenta la distribución de reportes por módulo de origen. Los valores ayudan a reconocer qué áreas funcionales concentran más incidencias.',
    problemReportsDetailedList:
        'Esta tabla lista los reportes de problemas incluidos en el documento. Cada fila muestra la fecha, el módulo, una descripción resumida y el estado administrativo del caso.',
    problemReportsApiHealth:
        'Esta tabla agrega señales de salud de la API para contextualizar técnicamente los reportes de problemas cuando existe información complementaria disponible.',
    problemReportsDataQuality:
        'Esta tabla muestra indicadores agregados de calidad de datos que pueden ayudar a interpretar patrones técnicos asociados a los reportes de problemas.',
    dashboardUnavailable:
        'No fue posible cargar información complementaria de dashboard para esta sección.'
} as const;
