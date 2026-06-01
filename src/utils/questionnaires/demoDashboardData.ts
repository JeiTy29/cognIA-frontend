import type {
    GuardianDashboardDTO,
    PsychologistDashboardDTO,
    PsychologistShareRequestsResponseDTO,
    QuestionnaireCaseDTO,
    QuestionnaireCaseDetailDTO,
    QuestionnaireCasesListV2Response,
    QuestionnaireDashboardChartPointDTO,
    QuestionnaireGuardianDashboardV2Response,
    QuestionnaireHistoryDetailV2DTO,
    QuestionnaireHistoryItemV2DTO,
    QuestionnaireHistoryListV2Response,
    QuestionnairePdfInfoV2DTO,
    QuestionnairePsychologistDashboardV2Response,
    QuestionnaireSessionV2DTO,
    QuestionnaireShareResponseDTO
} from '../../services/questionnaires/questionnaires.types';

const DEV_AUTH_ACTIVE_KEY = 'cognia_dev_auth_active';

function getIsoDate(monthsBack: number, day = 12) {
    const value = new Date();
    value.setMonth(value.getMonth() - monthsBack);
    value.setDate(day);
    value.setHours(14, 30, 0, 0);
    return value.toISOString();
}

function pagination(total: number, page = 1, pageSize = 10) {
    return {
        page,
        page_size: pageSize,
        total,
        pages: Math.max(1, Math.ceil(total / pageSize))
    };
}

export function isDevDashboardDemoEnabled() {
    if (!import.meta.env.DEV || typeof window === 'undefined') return false;
    if (import.meta.env.VITE_ENABLE_DEMO_DATA !== 'true') return false;
    if (!['localhost', '127.0.0.1'].includes(window.location.hostname)) return false;
    const queryValue = new URLSearchParams(window.location.search).get('devAuth');
    return queryValue === 'on' || window.sessionStorage.getItem(DEV_AUTH_ACTIVE_KEY) === 'true';
}

const demoCases: QuestionnaireCaseDTO[] = [
    {
        case_id: 'demo-case-mateo',
        case_public_id: 'CASO-A1F4C3',
        display_label: 'Mateo - seguimiento escolar',
        private_label: 'Mateo - seguimiento escolar',
        status: 'active',
        sessions_count: 5,
        processed_sessions_count: 5,
        latest_session_id: 'demo-session-mateo-5',
        latest_processed_at: getIsoDate(0, 18),
        latest_alert_level: 'high',
        latest_domain: 'conduct',
        created_at: getIsoDate(5, 4),
        updated_at: getIsoDate(0, 18)
    },
    {
        case_id: 'demo-case-sofia',
        case_public_id: 'CASO-E79FCF',
        display_label: 'Sofía - bienestar emocional',
        private_label: 'Sofía - bienestar emocional',
        status: 'active',
        sessions_count: 4,
        processed_sessions_count: 4,
        latest_session_id: 'demo-session-sofia-4',
        latest_processed_at: getIsoDate(0, 16),
        latest_alert_level: 'elevated',
        latest_domain: 'depression',
        created_at: getIsoDate(4, 7),
        updated_at: getIsoDate(0, 16)
    },
    {
        case_id: 'demo-case-lucas',
        case_public_id: 'CASO-C45B21',
        display_label: 'Lucas - rutina y atención',
        private_label: 'Lucas - rutina y atención',
        status: 'active',
        sessions_count: 6,
        processed_sessions_count: 6,
        latest_session_id: 'demo-session-lucas-6',
        latest_processed_at: getIsoDate(0, 20),
        latest_alert_level: 'critical_review',
        latest_domain: 'adhd',
        created_at: getIsoDate(6, 5),
        updated_at: getIsoDate(0, 20)
    }
];

const demoDomains = {
    'demo-case-mateo': [
        { domain: 'conduct', latest_probability: 0.82, max_probability: 0.91, latest_alert_level: 'high', sessions_with_alert: 4 },
        { domain: 'adhd', latest_probability: 0.48, max_probability: 0.61, latest_alert_level: 'moderate', sessions_with_alert: 2 }
    ],
    'demo-case-sofia': [
        { domain: 'depression', latest_probability: 0.69, max_probability: 0.76, latest_alert_level: 'elevated', sessions_with_alert: 3 },
        { domain: 'anxiety', latest_probability: 0.53, max_probability: 0.58, latest_alert_level: 'moderate', sessions_with_alert: 2 }
    ],
    'demo-case-lucas': [
        { domain: 'adhd', latest_probability: 0.88, max_probability: 0.93, latest_alert_level: 'critical_review', sessions_with_alert: 5 },
        { domain: 'conduct', latest_probability: 0.58, max_probability: 0.64, latest_alert_level: 'moderate', sessions_with_alert: 2 }
    ]
} as const;

function demoSession(caseItem: QuestionnaireCaseDTO, index: number, monthsBack: number, alertLevel: string, domain: string): QuestionnaireSessionV2DTO {
    const id = `demo-session-${caseItem.case_id}-${index}`;
    return {
        id,
        session_id: id,
        questionnaire_id: `demo-questionnaire-${index}`,
        status: 'processed',
        mode: 'complete',
        role: 'guardian',
        title: 'Evaluacion orientativa de seguimiento',
        case_id: caseItem.case_id,
        case_public_id: caseItem.case_public_id,
        case_display_label: caseItem.display_label,
        case_private_label: caseItem.private_label,
        processed_at: getIsoDate(monthsBack, 8 + index),
        created_at: getIsoDate(monthsBack, 7 + index),
        updated_at: getIsoDate(monthsBack, 8 + index),
        latest_alert_level: alertLevel,
        dominant_domain: domain,
        needs_professional_review: alertLevel === 'high' || alertLevel === 'critical_review',
        domains: [
            {
                domain,
                probability: alertLevel === 'critical_review' ? 0.9 : alertLevel === 'high' ? 0.82 : alertLevel === 'elevated' ? 0.68 : 0.42,
                alert_level: alertLevel
            }
        ]
    };
}

function demoSessionsForCase(caseItem: QuestionnaireCaseDTO) {
    if (caseItem.case_id === 'demo-case-lucas') {
        return [
            demoSession(caseItem, 1, 5, 'moderate', 'adhd'),
            demoSession(caseItem, 2, 4, 'elevated', 'adhd'),
            demoSession(caseItem, 3, 3, 'high', 'adhd'),
            demoSession(caseItem, 4, 2, 'high', 'conduct'),
            demoSession(caseItem, 5, 1, 'critical_review', 'adhd'),
            demoSession(caseItem, 6, 0, 'critical_review', 'adhd')
        ];
    }
    if (caseItem.case_id === 'demo-case-mateo') {
        return [
            demoSession(caseItem, 1, 4, 'low', 'conduct'),
            demoSession(caseItem, 2, 3, 'moderate', 'conduct'),
            demoSession(caseItem, 3, 2, 'elevated', 'adhd'),
            demoSession(caseItem, 4, 1, 'high', 'conduct'),
            demoSession(caseItem, 5, 0, 'high', 'conduct')
        ];
    }
    return [
        demoSession(caseItem, 1, 4, 'low', 'anxiety'),
        demoSession(caseItem, 2, 3, 'moderate', 'depression'),
        demoSession(caseItem, 3, 1, 'elevated', 'depression'),
        demoSession(caseItem, 4, 0, 'elevated', 'depression')
    ];
}

function toHistoryItem(session: QuestionnaireSessionV2DTO): QuestionnaireHistoryItemV2DTO {
    return {
        id: session.session_id ?? session.id,
        session_id: session.session_id,
        questionnaire_id: session.questionnaire_id,
        case_id: session.case_id,
        case_public_id: session.case_public_id,
        case_display_label: session.case_display_label,
        case_private_label: session.case_private_label,
        latest_alert_level: typeof session.latest_alert_level === 'string' ? session.latest_alert_level : null,
        dominant_domain: typeof session.dominant_domain === 'string' ? session.dominant_domain : null,
        needs_professional_review: session.needs_professional_review === true,
        status: session.status,
        mode: session.mode,
        role: session.role,
        processed_at: session.processed_at,
        created_at: session.created_at,
        updated_at: session.updated_at,
        title: session.title,
        tags: ['seguimiento', 'demo']
    };
}

const demoHistoryItems = demoCases
    .flatMap((caseItem) => demoSessionsForCase(caseItem).map(toHistoryItem))
    .sort((left, right) => Date.parse(right.processed_at ?? '') - Date.parse(left.processed_at ?? ''));

const guardianCharts = {
    alerts_by_month: [
        { month: getIsoDate(5), value: 2 },
        { month: getIsoDate(4), value: 3 },
        { month: getIsoDate(3), value: 4 },
        { month: getIsoDate(2), value: 5 },
        { month: getIsoDate(1), value: 6 },
        { month: getIsoDate(0), value: 7 }
    ],
    alerts_by_domain: [
        { domain: 'adhd', value: 8 },
        { domain: 'conduct', value: 6 },
        { domain: 'depression', value: 4 },
        { domain: 'anxiety', value: 2 }
    ],
    alerts_by_level: [
        { alert_level: 'low', value: 2 },
        { alert_level: 'moderate', value: 4 },
        { alert_level: 'elevated', value: 5 },
        { alert_level: 'high', value: 4 },
        { alert_level: 'critical_review', value: 2 }
    ],
    sessions_by_case: [
        { label: 'Lucas - rutina y atención', case_public_id: 'CASO-C45B21', value: 6 },
        { label: 'Mateo - seguimiento escolar', case_public_id: 'CASO-A1F4C3', value: 5 },
        { label: 'Sofía - bienestar emocional', case_public_id: 'CASO-E79FCF', value: 4 }
    ],
    cases_by_alert_level: [
        { alert_level: 'critical_review', value: 1 },
        { alert_level: 'high', value: 1 },
        { alert_level: 'elevated', value: 1 }
    ]
} satisfies Record<string, QuestionnaireDashboardChartPointDTO[]>;

export function getDemoQuestionnaireCasesResponse(page = 1, pageSize = 50): QuestionnaireCasesListV2Response {
    return {
        items: demoCases,
        pagination: pagination(demoCases.length, page, pageSize),
        warnings: ['Datos demo visibles solo en modo desarrollo.']
    };
}

export function getDemoGuardianDashboard(): GuardianDashboardDTO {
    return {
        period: { months: 3, date_from: getIsoDate(3), date_to: getIsoDate(0) },
        summary: {
            total_cases: 3,
            total_sessions: 15,
            processed_sessions: 15,
            cases_needing_professional_review: 2,
            highest_alert_level: 'critical_review'
        },
        charts: guardianCharts,
        cases: demoCases.map((caseItem) => ({
            case: caseItem,
            sessions_count: caseItem.sessions_count,
            latest_session: demoSessionsForCase(caseItem).at(-1) ?? null,
            domain_breakdown: [...(demoDomains[caseItem.case_id as keyof typeof demoDomains] ?? [])],
            trend: demoSessionsForCase(caseItem).map((session) => ({
                date: session.processed_at,
                session_id: session.session_id,
                domains: session.domains
            }))
        })),
        warnings: ['Datos demo visibles solo en modo desarrollo.']
    };
}

export function getDemoGuardianDashboardV2(): QuestionnaireGuardianDashboardV2Response {
    return {
        ...getDemoGuardianDashboard(),
        filters: { months: 3 },
        cases: demoCases,
        summary: {
            total_cases: 3,
            total_sessions: 15,
            processed_sessions: 15,
            cases_needing_professional_review: 2,
            cases_with_alerts: 3,
            highest_alert_level: 'critical_review'
        }
    };
}

export function getDemoQuestionnaireCaseDetail(caseId: string): QuestionnaireCaseDetailDTO {
    const caseItem = demoCases.find((item) => item.case_id === caseId) ?? demoCases[0];
    const sessions = demoSessionsForCase(caseItem);
    return {
        case: caseItem,
        sessions,
        domain_summary: [...(demoDomains[caseItem.case_id as keyof typeof demoDomains] ?? [])],
        trend: sessions.map((session) => ({
            date: session.processed_at,
            session_id: session.session_id,
            domains: session.domains
        }))
    };
}

export function getDemoQuestionnaireHistoryResponse(page = 1, pageSize = 10): QuestionnaireHistoryListV2Response {
    const start = (page - 1) * pageSize;
    const items = demoHistoryItems.slice(start, start + pageSize);
    return {
        items,
        pagination: pagination(demoHistoryItems.length, page, pageSize),
        summary: {
            total: demoHistoryItems.length,
            processed: demoHistoryItems.length,
            with_alert: demoHistoryItems.length,
            needs_professional_review: demoHistoryItems.filter((item) => item.needs_professional_review).length,
            without_case: 0
        },
        charts: {
            alerts_by_date: guardianCharts.alerts_by_month,
            sessions_by_month: guardianCharts.alerts_by_month,
            history_by_case: guardianCharts.sessions_by_case,
            sessions_by_case: guardianCharts.sessions_by_case,
            alerts_by_domain: guardianCharts.alerts_by_domain,
            alerts_by_level: guardianCharts.alerts_by_level
        }
    };
}

export function getDemoQuestionnaireHistoryDetail(sessionId: string): QuestionnaireHistoryDetailV2DTO {
    const item = demoHistoryItems.find((entry) => entry.id === sessionId || entry.session_id === sessionId) ?? demoHistoryItems[0];
    return {
        ...item,
        applied_at: item.applied_at ?? item.created_at,
        submitted_at: item.submitted_at ?? item.created_at,
        processed_at: item.processed_at ?? item.updated_at,
        completed_by_user_id: 'demo-guardian-1',
        completed_by_display_name: 'Acudiente familiar',
        completed_by_role: 'guardian',
        respondent_relationship: 'Padre/Tutor',
        domain_code: item.dominant_domain,
        domain_label: item.dominant_domain === 'adhd' ? 'TDAH' : item.dominant_domain,
        score_type: 'orientative',
        score_label: 'Riesgo orientativo alto',
        score_value: 90,
        score_explanation: 'El porcentaje resume señales orientativas del cuestionario y no representa una probabilidad diagnóstica.',
        safety_flags: item.latest_alert_level === 'critical_review' ? ['Señal sensible reportada'] : [],
        urgent_referral_recommended: item.latest_alert_level === 'critical_review',
        safety_signal_items: item.latest_alert_level === 'critical_review' ? ['Revisar señales de seguridad con un profesional autorizado.'] : [],
        inconsistency_flags: item.latest_alert_level === 'high' ? ['Respuestas con variación relevante entre dominios.'] : [],
        developmental_context_notes: ['Interpretar los resultados junto con contexto familiar, escolar y evolutivo.'],
        tags: [
            { id: 'demo-tag-1', label: 'seguimiento', color: '#0f5f9f', visibility: 'private', visibility_label: 'Privado' },
            { id: 'demo-tag-2', label: 'revisión prioritaria', color: '#842a5c', visibility: 'shared', visibility_label: 'Compartido' }
        ],
        permissions: {
            can_tag: true,
            can_share: true,
            can_request_review: true,
            can_generate_pdf: true,
            can_download_pdf: true
        },
        answers: [
            { question_id: 'demo-q1', question_text: 'Atención sostenida durante actividades escolares', answer: 'Frecuente' },
            { question_id: 'demo-q2', question_text: 'Cambios recientes en estado de ánimo', answer: 'Ocasional' }
        ],
        metadata: {
            source: 'Datos demo de desarrollo',
            data_quality: 'suficiente'
        }
    };
}

export function getDemoQuestionnaireShareResponse(sessionId: string): QuestionnaireShareResponseDTO {
    return {
        questionnaire_id: sessionId,
        share_code: 'DEMO-SHARE',
        shared_path: `/cuestionario/compartido/${sessionId}/DEMO-SHARE`,
        shared_url: `http://127.0.0.1:5173/cuestionario/compartido/${sessionId}/DEMO-SHARE`,
        expires_at: getIsoDate(-1, 28),
        max_uses: 3,
        uses: 0
    };
}

export function getDemoQuestionnairePdfInfo(sessionId: string): QuestionnairePdfInfoV2DTO {
    return {
        status: 'ready',
        file_id: `demo-pdf-${sessionId}`,
        filename: `reporte-${sessionId}.pdf`,
        mime_type: 'application/pdf',
        size_bytes: 128000,
        generated_at: getIsoDate(0, 20),
        updated_at: getIsoDate(0, 20),
        download_url: `/api/v2/questionnaires/history/${sessionId}/pdf/download`
    };
}

const psychologistItems = demoHistoryItems.slice(0, 8).map((item, index) => ({
    session_id: item.session_id ?? item.id,
    case_public_id: item.case_public_id,
    case_display_label: item.case_display_label,
    status: 'processed',
    processed_at: item.processed_at,
    guardian: { display_name: index % 2 === 0 ? 'Acudiente familiar' : 'Tutor escolar' },
    domains: [
        {
            domain: item.dominant_domain,
            probability: item.latest_alert_level === 'critical_review' ? 0.91 : item.latest_alert_level === 'high' ? 0.82 : 0.66,
            alert_level: item.latest_alert_level
        }
    ],
    needs_professional_review: item.needs_professional_review,
    review_status: index % 3 === 0 ? 'pending' : index % 3 === 1 ? 'in_review' : 'reviewed',
    can_review: true,
    can_download_pdf: true
}));

const psychologistCharts = {
    alerts_by_domain: guardianCharts.alerts_by_domain,
    alerts_by_level: guardianCharts.alerts_by_level,
    reviews_by_status: [
        { review_status: 'pending', value: 3 },
        { review_status: 'in_review', value: 2 },
        { review_status: 'reviewed', value: 3 }
    ],
    alerts_by_date: guardianCharts.alerts_by_month,
    cases_by_alert: guardianCharts.sessions_by_case
} satisfies Record<string, QuestionnaireDashboardChartPointDTO[]>;

export function getDemoPsychologistDashboard(page = 1, pageSize = 10): PsychologistDashboardDTO {
    return {
        summary: {
            total_shared_sessions: psychologistItems.length,
            total_cases: 3,
            pending_reviews: 3,
            reviewed_cases: 3,
            cases_needing_professional_review: 4,
            highest_alert_level: 'critical_review'
        },
        aggregates: {
            by_domain: psychologistCharts.alerts_by_domain,
            by_alert_level: psychologistCharts.alerts_by_level,
            by_review_status: psychologistCharts.reviews_by_status
        },
        charts: psychologistCharts,
        items: psychologistItems,
        pagination: pagination(psychologistItems.length, page, pageSize)
    };
}

export function getDemoPsychologistDashboardV2(page = 1, pageSize = 10): QuestionnairePsychologistDashboardV2Response {
    return {
        filters: { page, page_size: pageSize },
        summary: {
            total_shared_sessions: psychologistItems.length,
            total_cases: 3,
            pending_reviews: 3,
            reviewed_cases: 3,
            cases_needing_professional_review: 4,
            highest_alert_level: 'critical_review'
        },
        aggregates: {
            by_domain: psychologistCharts.alerts_by_domain,
            by_alert_level: psychologistCharts.alerts_by_level,
            by_review_status: psychologistCharts.reviews_by_status,
            by_date: psychologistCharts.alerts_by_date,
            by_case: psychologistCharts.cases_by_alert
        },
        charts: psychologistCharts,
        items: demoHistoryItems.slice(0, pageSize),
        pagination: pagination(demoHistoryItems.length, page, pageSize)
    };
}

export function getDemoShareRequests(page = 1, pageSize = 10): PsychologistShareRequestsResponseDTO {
    const items = [
        {
            grant_id: 'demo-request-1',
            request_status: 'pending',
            requested_at: getIsoDate(0, 19),
            case: { case_public_id: 'CASO-C45B21' },
            guardian: { display_name: 'Acudiente familiar' },
            summary: {
                needs_professional_review: true,
                highest_alert_level: 'critical_review',
                domains: [{ domain: 'adhd', probability: 0.91, alert_level: 'critical_review' }],
                result_summary: 'Señales persistentes de inatención e hiperactividad que sugieren priorizar revisión.'
            },
            can_accept: true,
            can_reject: true
        },
        {
            grant_id: 'demo-request-2',
            request_status: 'pending',
            requested_at: getIsoDate(0, 15),
            case: { case_public_id: 'CASO-A1F4C3' },
            guardian: { display_name: 'Tutor escolar' },
            summary: {
                needs_professional_review: true,
                highest_alert_level: 'high',
                domains: [{ domain: 'conduct', probability: 0.82, alert_level: 'high' }],
                result_summary: 'Indicadores conductuales elevados en las últimas sesiones.'
            },
            can_accept: true,
            can_reject: true
        },
        {
            grant_id: 'demo-request-3',
            request_status: 'accepted',
            requested_at: getIsoDate(1, 10),
            responded_at: getIsoDate(1, 12),
            case: { case_public_id: 'CASO-E79FCF' },
            guardian: { display_name: 'Acudiente familiar' },
            summary: {
                needs_professional_review: false,
                highest_alert_level: 'elevated',
                domains: [{ domain: 'depression', probability: 0.68, alert_level: 'elevated' }],
                result_summary: 'Seguimiento emocional aceptado para revisión orientativa.'
            },
            can_accept: false,
            can_reject: false
        },
        {
            grant_id: 'demo-request-4',
            request_status: 'rejected',
            requested_at: getIsoDate(2, 6),
            responded_at: getIsoDate(2, 8),
            case: { case_public_id: 'CASO-B52D10' },
            guardian: { display_name: 'Acudiente familiar' },
            summary: {
                needs_professional_review: false,
                highest_alert_level: 'moderate',
                domains: [{ domain: 'anxiety', probability: 0.52, alert_level: 'moderate' }],
                result_summary: 'Solicitud rechazada por falta de alcance o disponibilidad.'
            },
            can_accept: false,
            can_reject: false
        }
    ];

    return {
        items,
        pagination: pagination(items.length, page, pageSize),
        summary: {
            pending_count: 2,
            accepted_count: 1,
            rejected_count: 1
        }
    };
}

export function getDemoMetricsSnapshot() {
    return {
        uptime_seconds: 391240,
        requests_total: 18420,
        latency_ms_avg: 84,
        latency_ms_max: 420,
        status_counts: {
            200: 16980,
            201: 420,
            302: 140,
            400: 360,
            401: 180,
            500: 42
        }
    };
}

export function getDemoMetricsHistory() {
    return {
        requestHistory: [12000, 12840, 13750, 14520, 15130, 16290, 17100, 18420],
        latencyHistory: [96, 88, 102, 79, 73, 85, 91, 84]
    };
}
