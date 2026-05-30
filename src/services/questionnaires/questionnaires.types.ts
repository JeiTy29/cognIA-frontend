export type QuestionnaireV2Mode = 'short' | 'medium' | 'complete';
export type QuestionnaireV2Role = 'guardian' | 'psychologist';
type FlexibleString<T extends string> = T | (string & {});
export type QuestionnaireRiskLevel = FlexibleString<'baja' | 'intermedia' | 'relevante' | 'alta'>;
export type QuestionnaireV2Status =
    FlexibleString<'draft' | 'in_progress' | 'submitted' | 'processed' | 'failed' | 'archived'>;
export type QuestionnaireResponseType = FlexibleString<
    | 'likert'
    | 'boolean'
    | 'integer'
    | 'number'
    | 'text'
    | 'likert_0_4'
    | 'likert_1_5'
    | 'frequency_0_3'
    | 'intensity_0_10'
    | 'count'
    | 'ordinal'
    | 'text_context'
>;
export type QuestionnaireResponseValue = string | number | boolean | null;
export type QuestionnaireTagVisibility = 'private' | 'shared';
export type QuestionnairePrimitive = string | number | boolean | null;
export type QuestionnaireHistoryStatusFilter =
    | 'draft'
    | 'in_progress'
    | 'submitted'
    | 'processed'
    | 'failed'
    | 'archived';

export interface PaginationDTO {
    page: number;
    page_size: number;
    total: number;
    pages: number;
}

export interface QuestionnaireTemplateV2DTO {
    id: string;
    name?: string;
    version?: string;
    description?: string | null;
    is_active?: boolean;
    is_archived?: boolean;
    [key: string]: unknown;
}

export interface QuestionnaireQuestionV2DTO {
    id: string;
    code?: string;
    text: string;
    response_type: QuestionnaireResponseType;
    position?: number;
    response_min?: number | null;
    response_max?: number | null;
    response_step?: number | null;
    min_value?: number | null;
    max_value?: number | null;
    min?: number | null;
    max?: number | null;
    minimum?: number | null;
    maximum?: number | null;
    step?: number | null;
    increment?: number | null;
    response_options?: unknown[] | null;
    answer?: QuestionnaireResponseValue;
    answer_value?: string | null;
    answer_updated_at?: string | null;
    answered?: boolean;
    help_text?: string | null;
    context?: string | null;
    description?: string | null;
    guidance?: string | null;
    hint?: string | null;
    instructions?: string | null;
    explanation?: string | null;
    section_title?: string | null;
    question_id?: string;
    question_code?: string;
    session_item_id?: string;
    section?: string | null;
    feature?: string | null;
    [key: string]: unknown;
}

export interface QuestionnaireAnswerV2DTO {
    question_id: string;
    question_code?: string | null;
    section?: string | null;
    answer: QuestionnaireResponseValue;
    answer_value?: string | null;
    updated_at?: string | null;
    [key: string]: unknown;
}

export interface QuestionnaireOptionDTO {
    value: QuestionnairePrimitive;
    label: string;
}

export interface QuestionnaireEvaluationResultDTO {
    summary?: string | null;
    operational_recommendation?: string | null;
    primary_domain?: QuestionnaireEvaluationDomainDTO | null;
    observed_indicators?: QuestionnaireObservedIndicatorDTO[] | string[] | null;
    completion_quality_score?: number | null;
    missingness_score?: number | null;
    needs_professional_review?: boolean | null;
    safety_flags?: string[] | null;
    urgent_referral_recommended?: boolean | null;
    safety_signal_items?: string[] | null;
    inconsistency_flags?: string[] | null;
    clinical_consistency_warnings?: string[] | null;
    score_type?: string | null;
    score_label?: string | null;
    score_explanation?: string | null;
    developmental_context_notes?: string[] | string | null;
    data_quality?: Record<string, unknown> | null;
    [key: string]: unknown;
}

export interface QuestionnaireEvaluationDomainDTO {
    domain?: string | null;
    domain_code?: string | null;
    domain_label?: string | null;
    probability?: number | null;
    alert_level?: string | null;
    confidence_pct?: number | null;
    confidence_band?: string | null;
    model_id?: string | null;
    model_version?: string | null;
    mode?: string | null;
    operational_class?: string | null;
    operational_caveat?: string | null;
    result_summary?: string | null;
    needs_professional_review?: boolean | null;
    score_type?: string | null;
    score_label?: string | null;
    score_explanation?: string | null;
    [key: string]: unknown;
}

export interface QuestionnaireObservedIndicatorDTO {
    code?: string | null;
    label?: string | null;
    text?: string | null;
    question?: string | null;
    question_text?: string | null;
    answer?: string | number | boolean | null;
    answer_label?: string | null;
    value?: number | null;
    score?: number | null;
    domain?: string | null;
    domain_code?: string | null;
    domain_label?: string | null;
    [key: string]: unknown;
}

export interface QuestionnaireHistoryResponseItemDTO {
    question_id?: string | null;
    question_code?: string | null;
    code?: string | null;
    prompt?: string | null;
    question?: string | null;
    question_text?: string | null;
    text?: string | null;
    section?: string | null;
    section_title?: string | null;
    domain?: string | null;
    domain_code?: string | null;
    domain_label?: string | null;
    answer?: QuestionnaireResponseValue;
    answer_value?: QuestionnaireResponseValue;
    answer_label?: string | null;
    value?: QuestionnaireResponseValue;
    missing?: boolean | null;
    is_missing?: boolean | null;
    [key: string]: unknown;
}

export interface QuestionnaireHistoryResponsesV2Response {
    session_id?: string | null;
    items: QuestionnaireHistoryResponseItemDTO[];
    warnings?: string[];
    permissions?: Record<string, unknown> | null;
    [key: string]: unknown;
}

export interface QuestionnaireEvaluationComorbidityDTO {
    coexistence_key?: string | null;
    domains?: string[];
    combined_risk_score?: number | null;
    coexistence_level?: string | null;
    summary?: string | null;
    [key: string]: unknown;
}

export interface QuestionnaireSubmitResponseV2DTO {
    session_id?: string;
    questionnaire_id?: string;
    status?: QuestionnaireV2Status;
    submitted_at?: string | null;
    processed_at?: string | null;
    result?: QuestionnaireEvaluationResultDTO | null;
    domains?: QuestionnaireEvaluationDomainDTO[];
    comorbidity?: QuestionnaireEvaluationComorbidityDTO[];
    metadata?: Record<string, unknown> | null;
    [key: string]: unknown;
}

export interface QuestionnaireSecureResultsV2DTO {
    session: QuestionnaireSessionV2DTO;
    result: QuestionnaireEvaluationResultDTO | null;
    domains: QuestionnaireEvaluationDomainDTO[];
    comorbidity: QuestionnaireEvaluationComorbidityDTO[];
    [key: string]: unknown;
}

export interface QuestionnaireClinicalNarrativeV2DTO {
    sintesis_general?: string | null;
    niveles_de_compatibilidad?: string | null;
    indicadores_principales_observados?: string | null;
    impacto_funcional?: string | null;
    recomendacion_profesional?: string | null;
    aclaracion_importante?: string | null;
    [key: string]: unknown;
}

export interface QuestionnaireClinicalDomainV2DTO {
    domain?: string | null;
    probability?: number | null;
    compatibility_level?: QuestionnaireRiskLevel | null;
    risk_level?: QuestionnaireRiskLevel | null;
    confidence_pct?: number | null;
    confidence_band?: string | null;
    operational_class?: string | null;
    caveat?: string | null;
    main_indicators?: string[] | null;
    [key: string]: unknown;
}

export interface QuestionnaireClinicalComorbidityV2DTO {
    has_comorbidity_signal?: boolean | null;
    severity?: string | null;
    domains?: string[] | null;
    summary?: string | null;
    [key: string]: unknown;
}

export interface QuestionnaireClinicalSectionV2DTO {
    key?: string | null;
    title?: string | null;
    content?: string | null;
    [key: string]: unknown;
}

export interface QuestionnaireClinicalSummaryV2DTO {
    session_id?: string | null;
    report_version?: string | null;
    generated_at?: string | null;
    overall_risk_level?: QuestionnaireRiskLevel | null;
    simulated_diagnostic_text?: QuestionnaireClinicalNarrativeV2DTO | null;
    sections?: QuestionnaireClinicalSectionV2DTO[] | Record<string, string | null> | null;
    domains?: QuestionnaireClinicalDomainV2DTO[];
    comorbidity?: QuestionnaireClinicalComorbidityV2DTO | null;
    disclaimer?: string | null;
    [key: string]: unknown;
}

export interface ActiveQuestionnairesV2Response {
    items: QuestionnaireTemplateV2DTO[];
    pagination: PaginationDTO;
}

export interface CreateQuestionnaireSessionV2Payload {
    mode: QuestionnaireV2Mode;
    role: QuestionnaireV2Role;
    child_age_years?: 6 | 7 | 8 | 9 | 10 | 11;
    child_sex_assigned_at_birth?: string;
    case_id?: string;
    case_public_id?: string;
    case_label?: string;
    metadata?: Record<string, unknown>;
}

export interface QuestionnaireSessionV2DTO {
    id: string;
    session_id?: string;
    questionnaire_id?: string;
    questionnaire_template_id?: string;
    status?: QuestionnaireV2Status;
    mode?: QuestionnaireV2Mode;
    role?: QuestionnaireV2Role;
    mode_key?: string | null;
    progress_pct?: number | null;
    progress_percent?: number | null;
    total_questions?: number | null;
    answered_count?: number | null;
    version?: string | null;
    result?: QuestionnaireEvaluationResultDTO | null;
    domains?: QuestionnaireEvaluationDomainDTO[];
    comorbidity?: QuestionnaireEvaluationComorbidityDTO[];
    metadata?: Record<string, unknown> | null;
    title?: string | null;
    case?: QuestionnaireCaseDTO | null;
    case_id?: string | null;
    case_public_id?: string | null;
    case_label?: string | null;
    case_private_label?: string | null;
    case_display_label?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    processed_at?: string | null;
    submitted_at?: string | null;
    applied_at?: string | null;
    completed_by_user_id?: string | null;
    completed_by_display_name?: string | null;
    completed_by_role?: string | null;
    respondent_relationship?: string | null;
    answers?: QuestionnaireAnswerV2DTO[] | Record<string, QuestionnaireResponseValue>;
    [key: string]: unknown;
}

export interface QuestionnaireSessionPageV2Response {
    items: QuestionnaireQuestionV2DTO[];
    pagination: PaginationDTO;
}

export interface PatchSessionAnswersV2Payload {
    answers: QuestionnaireAnswerV2DTO[];
    mark_final?: boolean;
    include_answers?: boolean;
}

export interface QuestionnaireHistoryItemV2DTO {
    id: string;
    session_id?: string | null;
    questionnaire_session_id?: string | null;
    questionnaire_id?: string | null;
    share_code?: string | null;
    case_id?: string | null;
    case_public_id?: string | null;
    case_display_label?: string | null;
    case_private_label?: string | null;
    tags?: Array<QuestionnaireTagDTO | string>;
    latest_alert_level?: string | null;
    dominant_domain?: string | null;
    needs_professional_review?: boolean | null;
    submitted_at?: string | null;
    processed_at?: string | null;
    applied_at?: string | null;
    completed_by_user_id?: string | null;
    completed_by_display_name?: string | null;
    completed_by_role?: string | null;
    respondent_relationship?: string | null;
    safety_flags?: string[] | null;
    urgent_referral_recommended?: boolean | null;
    inconsistency_flags?: string[] | null;
    score_label?: string | null;
    score_explanation?: string | null;
    status?: QuestionnaireV2Status;
    mode?: QuestionnaireV2Mode;
    role?: QuestionnaireV2Role;
    title?: string | null;
    name?: string | null;
    case?: QuestionnaireCaseDTO | null;
    case_label?: string | null;
    version?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
    [key: string]: unknown;
}

export interface QuestionnaireHistoryListV2Response {
    items: QuestionnaireHistoryItemV2DTO[];
    pagination: PaginationDTO;
    filters?: Record<string, unknown> | null;
    summary?: Record<string, unknown> | null;
    charts?: Record<string, QuestionnaireDashboardChartPointDTO[]> | null;
}

export interface QuestionnaireCasesFiltersV2 {
    status?: string;
    q?: string;
    label?: string;
    case_public_id?: string;
    has_sessions?: boolean;
    latest_alert_level?: string;
    date_from?: string;
    date_to?: string;
    page?: number;
    page_size?: number;
}

export interface QuestionnaireHistoryFiltersV2 {
    status?: QuestionnaireHistoryStatusFilter;
    case_id?: string;
    case_public_id?: string;
    case_label?: string;
    tag?: string;
    q?: string;
    date_from?: string;
    date_to?: string;
    domain?: string;
    alert_level?: string;
    needs_professional_review?: boolean;
    page?: number;
    page_size?: number;
}

export interface QuestionnaireGuardianDashboardFiltersV2 {
    months?: number;
    date_from?: string;
    date_to?: string;
    case_id?: string;
    case_public_id?: string;
    case_label?: string;
    q?: string;
    domain?: string;
    alert_level?: string;
}

export interface QuestionnairePsychologistDashboardFiltersV2 {
    q?: string;
    case_public_id?: string;
    date_from?: string;
    date_to?: string;
    domain?: string;
    alert_level?: string;
    review_status?: string;
    page?: number;
    page_size?: number;
}

export interface QuestionnaireDashboardChartPointDTO {
    key?: string | null;
    label?: string | null;
    name?: string | null;
    date?: string | null;
    month?: string | null;
    domain?: string | null;
    alert_level?: string | null;
    value?: number | null;
    count?: number | null;
    sessions?: number | null;
    total?: number | null;
    [key: string]: unknown;
}

export interface QuestionnaireCaseV2DTO {
    case_id: string;
    case_public_id?: string | null;
    private_label?: string | null;
    display_label?: string | null;
    status?: string | null;
    sessions_count?: number | null;
    processed_sessions_count?: number | null;
    draft_sessions_count?: number | null;
    in_progress_sessions_count?: number | null;
    latest_session_id?: string | null;
    latest_processed_at?: string | null;
    latest_alert_level?: string | null;
    latest_domain?: string | null;
    tags?: Array<QuestionnaireTagDTO | string>;
    [key: string]: unknown;
}

export interface QuestionnaireCasesListV2Response {
    items: QuestionnaireCaseV2DTO[];
    pagination: PaginationDTO;
    warnings?: string[];
    [key: string]: unknown;
}

export interface QuestionnaireCaseDetailV2Response {
    case: QuestionnaireCaseV2DTO | null;
    sessions: QuestionnaireHistoryItemV2DTO[];
    domain_summary: QuestionnaireDashboardChartPointDTO[];
    trend: QuestionnaireDashboardChartPointDTO[];
    warnings?: string[];
    [key: string]: unknown;
}

export interface QuestionnaireGuardianDashboardV2Response {
    period?: Record<string, unknown> | null;
    filters?: Record<string, unknown> | null;
    summary?: Record<string, unknown> | null;
    charts?: {
        alerts_by_month?: QuestionnaireDashboardChartPointDTO[];
        alerts_by_domain?: QuestionnaireDashboardChartPointDTO[];
        alerts_by_level?: QuestionnaireDashboardChartPointDTO[];
        sessions_by_case?: QuestionnaireDashboardChartPointDTO[];
        cases_by_alert_level?: QuestionnaireDashboardChartPointDTO[];
        [key: string]: QuestionnaireDashboardChartPointDTO[] | undefined;
    } | null;
    cases?: QuestionnaireCaseV2DTO[];
    warnings?: string[];
    [key: string]: unknown;
}

export interface QuestionnairePsychologistDashboardV2Response {
    filters?: Record<string, unknown> | null;
    summary?: Record<string, unknown> | null;
    aggregates?: {
        by_domain?: QuestionnaireDashboardChartPointDTO[];
        by_alert_level?: QuestionnaireDashboardChartPointDTO[];
        by_review_status?: QuestionnaireDashboardChartPointDTO[];
        by_date?: QuestionnaireDashboardChartPointDTO[];
        by_case?: QuestionnaireDashboardChartPointDTO[];
        [key: string]: QuestionnaireDashboardChartPointDTO[] | undefined;
    } | null;
    charts?: {
        alerts_by_domain?: QuestionnaireDashboardChartPointDTO[];
        alerts_by_level?: QuestionnaireDashboardChartPointDTO[];
        reviews_by_status?: QuestionnaireDashboardChartPointDTO[];
        alerts_by_date?: QuestionnaireDashboardChartPointDTO[];
        cases_by_alert?: QuestionnaireDashboardChartPointDTO[];
        [key: string]: QuestionnaireDashboardChartPointDTO[] | undefined;
    } | null;
    items?: QuestionnaireHistoryItemV2DTO[];
    pagination?: PaginationDTO;
    warnings?: string[];
    [key: string]: unknown;
}

export interface QuestionnairePsychologistShareRequestV2DTO {
    grant_id: string;
    status?: string | null;
    case_id?: string | null;
    case_public_id?: string | null;
    case_display_label?: string | null;
    case_private_label?: string | null;
    latest_alert_level?: string | null;
    dominant_domain?: string | null;
    needs_professional_review?: boolean | null;
    created_at?: string | null;
    updated_at?: string | null;
    can_tag?: boolean | null;
    can_download_pdf?: boolean | null;
    [key: string]: unknown;
}

export interface QuestionnairePsychologistShareRequestsV2Response {
    items: QuestionnairePsychologistShareRequestV2DTO[];
    pagination: PaginationDTO;
    summary?: Record<string, unknown> | null;
    charts?: {
        by_status?: QuestionnaireDashboardChartPointDTO[];
        by_alert_level?: QuestionnaireDashboardChartPointDTO[];
        by_domain?: QuestionnaireDashboardChartPointDTO[];
        over_time?: QuestionnaireDashboardChartPointDTO[];
        pending_age?: QuestionnaireDashboardChartPointDTO[];
        [key: string]: QuestionnaireDashboardChartPointDTO[] | undefined;
    } | null;
    warnings?: string[];
    [key: string]: unknown;
}

export interface QuestionnaireNotificationV2DTO {
    notification_id: string;
    type?: string | null;
    title?: string | null;
    message?: string | null;
    is_read?: boolean | null;
    created_at?: string | null;
    [key: string]: unknown;
}

export interface QuestionnaireNotificationsV2Response {
    items: QuestionnaireNotificationV2DTO[];
    pagination?: PaginationDTO;
    [key: string]: unknown;
}

export interface QuestionnaireTagDTO {
    id?: string;
    tag_id?: string;
    label: string;
    tag?: string;
    color?: string | null;
    visibility?: QuestionnaireTagVisibility | null;
    visibility_label?: 'Privado' | 'Compartido' | '--';
    created_at?: string | null;
    updated_at?: string | null;
    [key: string]: unknown;
}

export interface AddQuestionnaireTagPayload {
    tag: string;
    color?: string;
    visibility?: QuestionnaireTagVisibility;
}

export interface ShareQuestionnairePayload {
    expires_in_hours?: number;
    max_uses?: number;
    grantee_user_id?: string;
    grant_can_tag?: boolean;
    grant_can_download_pdf?: boolean;
    share_scope?: 'session' | 'case';
}

export interface QuestionnaireShareResponseDTO {
    questionnaire_id?: string;
    share_code?: string;
    share_code_id?: string;
    shared_path?: string;
    shared_url?: string;
    url?: string;
    share_url?: string;
    public_url?: string;
    link?: string;
    expires_at?: string | null;
    max_uses?: number | null;
    uses?: number | null;
    case?: {
        case_public_id?: string | null;
        [key: string]: unknown;
    } | null;
    grantee?: QuestionnaireShareGranteeDTO | null;
    grant?: QuestionnaireShareGrantDTO | null;
    [key: string]: unknown;
}

export interface QuestionnaireSharedSessionDTO {
    session_id: string;
    questionnaire_id: string;
    status: string;
    mode: FlexibleString<QuestionnaireV2Mode>;
    role: FlexibleString<QuestionnaireV2Role>;
    mode_key?: string;
    progress_pct?: number | null;
    version?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
}

export interface QuestionnaireSharedResultDTO {
    summary?: string | null;
    operational_recommendation?: string | null;
    completion_quality_score?: number | null;
    missingness_score?: number | null;
    needs_professional_review?: boolean | null;
}

export interface QuestionnaireSharedDomainDTO {
    domain: string;
    probability?: number | null;
    alert_level?: string | null;
    confidence_pct?: number | null;
    confidence_band?: string | null;
    model_id?: string | null;
    model_version?: string | null;
    mode?: string | null;
    operational_class?: string | null;
    operational_caveat?: string | null;
    result_summary?: string | null;
    needs_professional_review?: boolean | null;
}

export interface QuestionnaireSharedComorbidityDTO {
    coexistence_key: string;
    domains: string[];
    combined_risk_score?: number | null;
    coexistence_level?: string | null;
    summary?: string | null;
}

export interface QuestionnairePdfInfoV2DTO {
    status?: string;
    file_id?: string;
    filename?: string;
    mime_type?: string;
    size_bytes?: number;
    generated_at?: string | null;
    updated_at?: string | null;
    download_url?: string;
    [key: string]: unknown;
}

export interface QuestionnaireHistoryDetailV2DTO extends QuestionnaireHistoryItemV2DTO {
    tags?: QuestionnaireTagDTO[];
    answers?: QuestionnaireAnswerV2DTO[] | Record<string, QuestionnaireResponseValue>;
    metadata?: Record<string, unknown> | null;
    permissions?: Record<string, boolean> | null;
    safety_signal_items?: string[] | null;
    clinical_consistency_warnings?: string[] | null;
    developmental_context_notes?: string[] | string | null;
    [key: string]: unknown;
}

export interface QuestionnaireSharedDataV2DTO {
    session: QuestionnaireSharedSessionDTO | null;
    result: QuestionnaireSharedResultDTO | null;
    domains: QuestionnaireSharedDomainDTO[];
    comorbidity: QuestionnaireSharedComorbidityDTO[];
    questionnaire_id?: string;
    share_code?: string;
    shared_url?: string;
    shared_path?: string;
    [key: string]: unknown;
}

export interface DownloadPdfResult {
    blob: Blob;
    filename: string;
}

export type QuestionnaireCaseStatus = FlexibleString<'active' | 'archived'>;
export type QuestionnaireAlertLevel =
    FlexibleString<'low' | 'moderate' | 'elevated' | 'high' | 'critical_review'>;
export type QuestionnaireReviewStatus =
    FlexibleString<'pending' | 'in_review' | 'reviewed' | 'orientation_recommended' | 'closed'>;

export interface QuestionnaireCaseDTO {
    case_id: string;
    case_public_id?: string | null;
    private_label?: string | null;
    display_label?: string | null;
    status?: QuestionnaireCaseStatus | null;
    sessions_count?: number | null;
    latest_session_id?: string | null;
    latest_processed_at?: string | null;
    latest_alert_level?: QuestionnaireAlertLevel | null;
    created_at?: string | null;
    updated_at?: string | null;
    [key: string]: unknown;
}

export interface QuestionnaireCaseDomainSummaryDTO {
    domain?: string | null;
    latest_probability?: number | null;
    latest_alert_level?: QuestionnaireAlertLevel | null;
    max_probability?: number | null;
    sessions_with_alert?: number | null;
    [key: string]: unknown;
}

export interface QuestionnaireCaseTrendDomainDTO {
    domain?: string | null;
    probability?: number | null;
    alert_level?: QuestionnaireAlertLevel | null;
    [key: string]: unknown;
}

export interface QuestionnaireCaseTrendPointDTO {
    date?: string | null;
    session_id?: string | null;
    domains?: QuestionnaireCaseTrendDomainDTO[];
    [key: string]: unknown;
}

export interface QuestionnaireCaseDetailDTO {
    case: QuestionnaireCaseDTO | null;
    sessions: QuestionnaireSessionV2DTO[];
    domain_summary: QuestionnaireCaseDomainSummaryDTO[];
    trend: QuestionnaireCaseTrendPointDTO[];
    [key: string]: unknown;
}

export interface QuestionnaireCaseListResponseDTO {
    items: QuestionnaireCaseDTO[];
    pagination: PaginationDTO;
}

export interface CreateQuestionnaireCasePayload {
    private_label: string;
    metadata?: Record<string, unknown>;
}

export interface UpdateQuestionnaireCasePayload {
    private_label?: string;
    status?: QuestionnaireCaseStatus;
}

export interface GuardianDashboardCaseDTO {
    case: QuestionnaireCaseDTO | null;
    sessions_count?: number | null;
    latest_session?: QuestionnaireSessionV2DTO | null;
    domain_breakdown?: QuestionnaireCaseDomainSummaryDTO[];
    trend?: QuestionnaireCaseTrendPointDTO[];
    chart_data?: Record<string, unknown> | null;
    [key: string]: unknown;
}

export interface GuardianDashboardDTO {
    period?: {
        months?: number | null;
        date_from?: string | null;
        date_to?: string | null;
        [key: string]: unknown;
    } | null;
    summary?: {
        total_cases?: number | null;
        total_sessions?: number | null;
        processed_sessions?: number | null;
        cases_needing_professional_review?: number | null;
        highest_alert_level?: QuestionnaireAlertLevel | null;
        [key: string]: unknown;
    } | null;
    cases: GuardianDashboardCaseDTO[];
    warnings?: string[];
    [key: string]: unknown;
}

export interface PsychologistSearchItemDTO {
    user_id: string;
    username?: string | null;
    full_name?: string | null;
    email?: string | null;
    department?: string | null;
    city?: string | null;
    same_department?: boolean | null;
    same_city?: boolean | null;
    professional_location?: string | null;
    colpsic_verified?: boolean | null;
    [key: string]: unknown;
}

export interface PsychologistSearchResponseDTO {
    items: PsychologistSearchItemDTO[];
    pagination: PaginationDTO;
    recommendation?: {
        basis?: string | null;
        department?: string | null;
        city?: string | null;
        [key: string]: unknown;
    } | null;
    warnings?: string[];
}

export interface ShareWithPsychologistPayload {
    grantee_user_id: string;
    grant_can_tag: boolean;
    grant_can_download_pdf: boolean;
    share_scope: 'session';
    expires_in_hours?: number;
    max_uses?: number;
}

export interface QuestionnaireShareGrantDTO {
    grant_id?: string | null;
    request_status?: string | null;
    can_view?: boolean | null;
    can_download_pdf?: boolean | null;
    can_tag?: boolean | null;
    requested_at?: string | null;
    responded_at?: string | null;
    response_message?: string | null;
    [key: string]: unknown;
}

export interface QuestionnaireShareGranteeDTO {
    user_id?: string | null;
    username?: string | null;
    full_name?: string | null;
    email?: string | null;
    department?: string | null;
    city?: string | null;
    professional_location?: string | null;
    [key: string]: unknown;
}

export interface PsychologistShareRequestDTO {
    grant_id: string;
    request_status?: 'pending' | 'accepted' | 'rejected' | (string & {}) | null;
    requested_at?: string | null;
    responded_at?: string | null;
    case?: {
        case_public_id?: string | null;
        [key: string]: unknown;
    } | null;
    session?: QuestionnaireSessionV2DTO | null;
    guardian?: {
        user_id?: string | null;
        display_name?: string | null;
        [key: string]: unknown;
    } | null;
    summary?: {
        needs_professional_review?: boolean | null;
        highest_alert_level?: QuestionnaireAlertLevel | null;
        domains?: QuestionnaireEvaluationDomainDTO[];
        result_summary?: string | null;
        [key: string]: unknown;
    } | null;
    can_accept?: boolean | null;
    can_reject?: boolean | null;
    [key: string]: unknown;
}

export interface PsychologistShareRequestsResponseDTO {
    items: PsychologistShareRequestDTO[];
    pagination: PaginationDTO;
    summary?: {
        pending_count?: number | null;
        accepted_count?: number | null;
        rejected_count?: number | null;
        [key: string]: unknown;
    } | null;
}

export interface AcceptShareRequestPayload {
    message?: string;
}

export interface RejectShareRequestPayload {
    message?: string;
}

export interface QuestionnaireDashboardAggregateDTO {
    domain?: string | null;
    alert_level?: QuestionnaireAlertLevel | null;
    review_status?: QuestionnaireReviewStatus | null;
    count?: number | null;
    max_probability?: number | null;
    [key: string]: unknown;
}

export interface PsychologistDashboardItemDTO {
    session_id: string;
    case_public_id?: string | null;
    status?: QuestionnaireV2Status | null;
    processed_at?: string | null;
    guardian?: {
        user_id?: string | null;
        display_name?: string | null;
        [key: string]: unknown;
    } | null;
    domains?: QuestionnaireEvaluationDomainDTO[];
    needs_professional_review?: boolean | null;
    review_status?: QuestionnaireReviewStatus | null;
    latest_review?: QuestionnaireProfessionalReviewDTO | null;
    can_review?: boolean | null;
    can_download_pdf?: boolean | null;
    [key: string]: unknown;
}

export interface PsychologistDashboardDTO {
    filters?: Record<string, unknown> | null;
    summary?: {
        total_shared_sessions?: number | null;
        total_cases?: number | null;
        pending_reviews?: number | null;
        reviewed_cases?: number | null;
        cases_needing_professional_review?: number | null;
        highest_alert_level?: QuestionnaireAlertLevel | null;
        [key: string]: unknown;
    } | null;
    aggregates?: {
        by_domain?: QuestionnaireDashboardAggregateDTO[];
        by_alert_level?: QuestionnaireDashboardAggregateDTO[];
        by_review_status?: QuestionnaireDashboardAggregateDTO[];
        [key: string]: unknown;
    } | null;
    items: PsychologistDashboardItemDTO[];
    pagination: PaginationDTO;
    [key: string]: unknown;
}

export interface QuestionnaireProfessionalReviewDTO {
    review_id: string;
    session_id?: string | null;
    case_id?: string | null;
    owner_user_id?: string | null;
    psychologist_user_id?: string | null;
    review_status?: QuestionnaireReviewStatus | null;
    initial_concept?: string | null;
    recommendation?: string | null;
    visible_to_guardian?: boolean | null;
    is_diagnostic?: boolean | null;
    created_at?: string | null;
    updated_at?: string | null;
    [key: string]: unknown;
}

export interface ProfessionalReviewPayload {
    review_status: QuestionnaireReviewStatus;
    initial_concept?: string;
    recommendation?: string;
    visible_to_guardian?: boolean;
}

export interface QuestionnaireReportPreviewAnswerDTO {
    question_id?: string | null;
    question_code?: string | null;
    prompt?: string | null;
    raw_answer?: QuestionnaireResponseValue;
    raw_answer_display?: string | null;
    normalized_answer?: string | null;
    domain?: string | null;
    section_title?: string | null;
    [key: string]: unknown;
}

export interface QuestionnaireReportPreviewPdfDTO {
    available?: boolean | null;
    file_name?: string | null;
    download_url?: string | null;
    [key: string]: unknown;
}

export interface QuestionnaireReportPreviewDTO {
    session?: QuestionnaireSessionV2DTO | null;
    result?: QuestionnaireEvaluationResultDTO | null;
    domains: QuestionnaireEvaluationDomainDTO[];
    comorbidity: QuestionnaireEvaluationComorbidityDTO[];
    answers: QuestionnaireReportPreviewAnswerDTO[];
    professional_reviews: QuestionnaireProfessionalReviewDTO[];
    pdf?: QuestionnaireReportPreviewPdfDTO | null;
    disclaimer?: string | null;
    permissions?: Record<string, boolean> | null;
    empty_state?: Record<string, unknown> | null;
    warnings?: string[];
    data_quality?: Record<string, unknown> | null;
    [key: string]: unknown;
}
