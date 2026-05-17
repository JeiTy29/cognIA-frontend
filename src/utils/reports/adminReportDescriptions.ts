export const REPORT_SECTION_DESCRIPTIONS = {
    metricsSummary:
        'Esta sección resume el estado general del sistema con indicadores de disponibilidad, latencia y volumen de solicitudes.',
    metricsHttpDistribution:
        'Aquí se agrupan las respuestas HTTP por familia para identificar rápidamente si predominan solicitudes exitosas o errores.',
    metricsDashboard:
        'Estos indicadores complementarios provienen de endpoints agregados de dashboard y solo se incluyen dentro del PDF.',
    usersSummary:
        'Esta sección resume la cantidad de usuarios incluidos en el reporte y su distribución general por rol y estado.',
    usersTable:
        'La tabla presenta los usuarios incluidos en el reporte con su correo, rol visible, estado y fecha de creación.',
    userGrowth:
        'Este bloque muestra la evolución reciente del registro de usuarios para aportar contexto operativo al reporte.',
    psychologistsVerification:
        'Esta sección resume el estado de verificación de los psicólogos y su disponibilidad administrativa dentro de la plataforma.',
    psychologistsTable:
        'La tabla incluye los perfiles profesionales seleccionados con tarjeta, estado de verificación y fecha de creación.',
    questionnairesSummary:
        'Este resumen presenta el estado actual de las plantillas y su volumen administrativo dentro del sistema.',
    questionnairesTable:
        'La tabla lista las plantillas incluidas en el reporte con su versión, estado y última actualización visible.',
    questionnaireFunnel:
        'El embudo muestra el avance general de cuestionarios creados, enviados y procesados como contexto del uso de la plataforma.',
    questionnaireQuality:
        'Este bloque resume indicadores agregados de volumen o calidad de respuestas cuando están disponibles para el PDF.',
    auditEvents:
        'Esta sección resume los eventos administrativos incluidos en el reporte según el alcance y filtros seleccionados.',
    auditActionDistribution:
        'Aquí se agrupan las acciones más frecuentes para identificar patrones de uso, cambios administrativos y eventos relevantes.',
    auditTable:
        'La tabla muestra los eventos de auditoría incluidos con fecha, actor, acción, categoría, resultado y un resumen sanitizado.',
    problemReportsStatus:
        'Este resumen presenta la distribución de reportes de problemas por estado y ayuda a priorizar el seguimiento operativo.',
    problemReportsTable:
        'La tabla lista los reportes incluidos con módulo, descripción resumida, estado y fecha de creación.',
    dashboardUnavailable:
        'No fue posible cargar información complementaria de dashboard para esta sección.'
} as const;
