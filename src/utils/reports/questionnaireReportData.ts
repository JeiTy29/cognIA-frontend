import type {
    QuestionnaireClinicalDomainV2DTO,
    QuestionnaireClinicalSummaryV2DTO,
    QuestionnaireEvaluationDomainDTO,
    QuestionnaireHistoryDetailV2DTO,
    QuestionnaireQuestionV2DTO,
    QuestionnaireResponseType,
    QuestionnaireResponseValue,
    QuestionnaireSecureResultsV2DTO,
    QuestionnaireSessionV2DTO
} from '../../services/questionnaires/questionnaires.types';
import {
    buildQuestionAnswerLabel,
    formatDomainLabel,
    normalizeClinicalTextPresentation
} from '../presentation/clinicalReport';
import {
    getAlertLevelLabel,
    getConfidenceBandLabel,
    getModeLabel,
    getRoleLabel,
    getStatusLabel,
    normalizeMojibakeText
} from '../presentation/naturalLanguage';
import {
    formatQuestionType,
    formatReportPercent
} from './reportFormatting';

export type AnsweredQuestionReportRow = {
    index: number;
    sectionLabel: string;
    domainLabel: string;
    questionText: string;
    answerLabel: string;
    normalizedAnswerLabel: string;
    responseTypeLabel: string;
    impactLabel: string;
    impactDescription: string;
};

export type QuestionnaireDomainReportRow = {
    key: string;
    domainLabel: string;
    probabilityValue: number | null;
    probabilityLabel: string;
    levelLabel: string;
    confidenceLabel: string;
};

export type QuestionnaireSectionSummaryRow = {
    sectionLabel: string;
    answeredCount: number;
};

export type QuestionnaireImpactDistributionRow = {
    label: string;
    count: number;
};

export type QuestionnaireCompletionSummary = {
    answeredCount: number;
    totalQuestions: number;
    ratio: number;
    ratioLabel: string;
    modeLabel: string;
    roleLabel: string;
    statusLabel: string;
};

export type QuestionnaireAlertReportDataset = {
    answeredQuestions: AnsweredQuestionReportRow[];
    answeredQuestionsNotice: string | null;
    domainRows: QuestionnaireDomainReportRow[];
    sectionSummaryRows: QuestionnaireSectionSummaryRow[];
    answeredQuestionsByDomain: Array<{ label: string; value: number }>;
    impactDistribution: QuestionnaireImpactDistributionRow[];
    completion: QuestionnaireCompletionSummary;
    summaryText: string;
    recommendationText: string;
    clarificationText: string;
    disclaimerText: string;
    sectionNarratives: Array<{ title: string; content: string }>;
};

type BuildDatasetArgs = {
    sessionDetail: QuestionnaireHistoryDetailV2DTO | QuestionnaireSessionV2DTO | null;
    sessionQuestions: QuestionnaireQuestionV2DTO[];
    results: QuestionnaireSecureResultsV2DTO | null;
    clinicalSummary: QuestionnaireClinicalSummaryV2DTO | null;
};

type PrimitiveAnswer = string | number | boolean | null;

function normalizeLookupKey(value: unknown) {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : '';
}

function toFiniteNumber(value: unknown) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim().length > 0) {
        const parsed = Number(value.replace(',', '.'));
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

function isPrimitiveAnswer(value: unknown): value is PrimitiveAnswer {
    return value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

function normalizeQuestionType(value: unknown): QuestionnaireResponseType {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
    if (normalized === 'count') return 'integer';
    if (normalized === 'text_context') return 'text';
    if (normalized === 'numeric' || normalized === 'float' || normalized === 'decimal') return 'number';
    return normalized as QuestionnaireResponseType;
}

function normalizeAnswerDictionary(value: unknown): Record<string, QuestionnaireResponseValue> {
    const next: Record<string, QuestionnaireResponseValue> = {};
    if (!value) return next;

    const assignValue = (keys: unknown[], answerValue: QuestionnaireResponseValue) => {
        keys.forEach((key) => {
            const normalized = normalizeLookupKey(key);
            if (!normalized) return;
            next[normalized] = answerValue;
        });
    };

    if (Array.isArray(value)) {
        value.forEach((item) => {
            if (!item || typeof item !== 'object' || Array.isArray(item)) return;
            const record = item as Record<string, unknown>;
            const answerValue = pickAnswerRecordValue(record);
            if (answerValue === undefined) return;
            assignValue(
                [
                    record.question_id,
                    record.questionId,
                    record.id,
                    record.item_id,
                    record.questionnaire_item_id,
                    record.question_code,
                    record.code
                ],
                answerValue
            );
        });
        return next;
    }

    if (typeof value === 'object') {
        Object.entries(value as Record<string, unknown>).forEach(([key, itemValue]) => {
            if (isPrimitiveAnswer(itemValue)) {
                next[key] = itemValue;
            }
        });
    }

    return next;
}

function pickAnswerRecordValue(record: Record<string, unknown>) {
    const candidates = [
        record.answer,
        record.value,
        record.response,
        record.response_value,
        record.selected_value,
        record.current_answer,
        record.answer_value
    ];

    for (const candidate of candidates) {
        if (candidate === null) return null;
        if (typeof candidate === 'string' || typeof candidate === 'number' || typeof candidate === 'boolean') {
            return candidate;
        }
    }

    return undefined;
}

function buildQuestionLookupKeys(question: QuestionnaireQuestionV2DTO) {
    const raw = question as Record<string, unknown>;
    return [
        normalizeLookupKey(question.id),
        normalizeLookupKey(question.code),
        normalizeLookupKey(raw.question_id),
        normalizeLookupKey(raw.question_code),
        normalizeLookupKey(raw.item_id),
        normalizeLookupKey(raw.questionnaire_item_id),
        normalizeLookupKey(raw.session_item_id)
    ].filter((value, index, items) => value.length > 0 && items.indexOf(value) === index);
}

function findAnswerForQuestion(
    answers: Record<string, QuestionnaireResponseValue>,
    question: QuestionnaireQuestionV2DTO
) {
    for (const key of buildQuestionLookupKeys(question)) {
        if (Object.hasOwn(answers, key)) {
            return answers[key];
        }
    }
    return undefined;
}

function coerceAnswerForQuestion(question: QuestionnaireQuestionV2DTO, value: QuestionnaireResponseValue | undefined) {
    if (value === null || value === undefined) return value;

    const type = normalizeQuestionType(question.response_type);
    if (type === 'boolean') {
        if (typeof value === 'boolean') return value;
        const text = String(value).trim().toLowerCase();
        if (['true', '1', 'si', 'sí', 'yes'].includes(text)) return true;
        if (['false', '0', 'no'].includes(text)) return false;
        return value;
    }

    if (['integer', 'number', 'count', 'likert', 'likert_0_4', 'likert_1_5', 'frequency_0_3', 'intensity_0_10'].includes(type)) {
        const parsed = Number(String(value).replace(',', '.'));
        if (Number.isFinite(parsed)) {
            return type === 'number' ? parsed : Math.trunc(parsed);
        }
    }

    return value;
}

function getQuestionText(question: QuestionnaireQuestionV2DTO) {
    const raw = question as Record<string, unknown>;
    return normalizeClinicalTextPresentation(
        raw.text ?? raw.prompt ?? raw.question_text ?? raw.question ?? raw.statement ?? raw.title ?? raw.label,
        'No fue posible recuperar el texto completo de la pregunta.'
    );
}

function inferDomainFromText(value: string | null | undefined) {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
    if (!normalized) return null;
    if (/(adhd|tdah|inatt|hypimp)/.test(normalized)) return 'TDAH';
    if (/(conduct|odd|dmdd|outburst)/.test(normalized)) return 'Conducta';
    if (/(elimination|enuresis|encopresis)/.test(normalized)) return 'Eliminación';
    if (/(anxiety|ansiedad|anx)/.test(normalized)) return 'Ansiedad';
    if (/(depression|depresi|depr)/.test(normalized)) return 'Depresión';
    return null;
}

function resolveQuestionDomain(question: QuestionnaireQuestionV2DTO) {
    const raw = question as Record<string, unknown>;
    const candidates: unknown[] = [
        raw.domain,
        raw.domain_label,
        raw.area,
        raw.section_domain,
        Array.isArray(raw.domains_final) ? raw.domains_final[0] : raw.domains_final,
        raw.feature
    ];

    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim().length > 0) {
            const inferred = inferDomainFromText(candidate);
            return inferred ?? formatDomainLabel(candidate);
        }
    }

    return 'General';
}

function resolveSectionLabel(question: QuestionnaireQuestionV2DTO) {
    const raw = question as Record<string, unknown>;
    return normalizeClinicalTextPresentation(
        raw.section_title ?? raw.section ?? 'General',
        'General'
    );
}

function getQuestionScale(question: QuestionnaireQuestionV2DTO) {
    const explicitMin = toFiniteNumber(question.response_min);
    const explicitMax = toFiniteNumber(question.response_max);
    if (explicitMin !== null || explicitMax !== null) {
        return {
            min: explicitMin,
            max: explicitMax
        };
    }

    const responseType = normalizeQuestionType(question.response_type);
    if (responseType === 'likert_0_4') return { min: 0, max: 4 };
    if (responseType === 'likert_1_5' || responseType === 'likert') return { min: 1, max: 5 };
    if (responseType === 'frequency_0_3') return { min: 0, max: 3 };
    if (responseType === 'intensity_0_10') return { min: 0, max: 10 };
    return { min: null, max: null };
}

function describeScaledImpact(question: QuestionnaireQuestionV2DTO, answer: number) {
    const { min, max } = getQuestionScale(question);
    if (min === null || max === null || max <= min) {
        return {
            impactLabel: 'Registrada',
            normalizedAnswerLabel: 'Valor registrado',
            impactDescription: 'Respuesta registrada para análisis del dominio correspondiente.'
        };
    }

    const relative = Math.min(1, Math.max(0, (answer - min) / (max - min)));
    if (relative <= 0.33) {
        return {
            impactLabel: 'Señal baja',
            normalizedAnswerLabel: 'Baja',
            impactDescription: 'Señal baja dentro de la escala de esta pregunta.'
        };
    }
    if (relative <= 0.66) {
        return {
            impactLabel: 'Señal intermedia',
            normalizedAnswerLabel: 'Intermedia',
            impactDescription: 'Señal intermedia dentro de la escala de esta pregunta.'
        };
    }
    return {
        impactLabel: 'Señal alta',
        normalizedAnswerLabel: 'Alta',
        impactDescription: 'Señal alta dentro de la escala de esta pregunta.'
    };
}

function describeQuestionImpact(question: QuestionnaireQuestionV2DTO, answer: QuestionnaireResponseValue) {
    const responseType = normalizeQuestionType(question.response_type);

    if (typeof answer === 'number') {
        if (['integer', 'number', 'count', 'likert', 'likert_0_4', 'likert_1_5', 'frequency_0_3', 'intensity_0_10'].includes(responseType)) {
            return describeScaledImpact(question, answer);
        }
    }

    if (responseType === 'boolean') {
        if (answer === true) {
            return {
                impactLabel: 'Afirmativa',
                normalizedAnswerLabel: 'Sí',
                impactDescription: 'Respuesta afirmativa registrada para interpretación del dominio correspondiente.'
            };
        }
        if (answer === false) {
            return {
                impactLabel: 'Negativa',
                normalizedAnswerLabel: 'No',
                impactDescription: 'Respuesta negativa registrada para interpretación del dominio correspondiente.'
            };
        }
    }

    if (responseType === 'text') {
        return {
            impactLabel: 'Contextual',
            normalizedAnswerLabel: 'Texto libre',
            impactDescription: 'Respuesta contextual registrada para revisión profesional.'
        };
    }

    return {
        impactLabel: 'Registrada',
        normalizedAnswerLabel: formatQuestionType(responseType),
        impactDescription: 'Respuesta registrada para análisis del dominio correspondiente.'
    };
}

function resolveAnswerLabel(question: QuestionnaireQuestionV2DTO, answer: QuestionnaireResponseValue) {
    const raw = question as Record<string, unknown>;
    const answerValue = typeof raw.answer_value === 'string' ? raw.answer_value : null;
    return buildQuestionAnswerLabel(question, answer, answerValue);
}

function buildAnswerRowFromQuestion(
    question: QuestionnaireQuestionV2DTO,
    answerLookup: Record<string, QuestionnaireResponseValue>,
    index: number
) {
    const raw = question as Record<string, unknown>;
    const embeddedAnswer = pickAnswerRecordValue(raw);
    const answer = embeddedAnswer !== undefined
        ? coerceAnswerForQuestion(question, embeddedAnswer)
        : coerceAnswerForQuestion(question, findAnswerForQuestion(answerLookup, question));

    if (answer === undefined || answer === null || (typeof answer === 'string' && answer.trim().length === 0)) {
        return null;
    }

    const impact = describeQuestionImpact(question, answer);
    return {
        index,
        sectionLabel: resolveSectionLabel(question),
        domainLabel: resolveQuestionDomain(question),
        questionText: getQuestionText(question),
        answerLabel: resolveAnswerLabel(question, answer),
        normalizedAnswerLabel: impact.normalizedAnswerLabel,
        responseTypeLabel: formatQuestionType(question.response_type),
        impactLabel: impact.impactLabel,
        impactDescription: impact.impactDescription
    } satisfies AnsweredQuestionReportRow;
}

function buildFallbackAnswerRows(
    sessionDetail: QuestionnaireHistoryDetailV2DTO | QuestionnaireSessionV2DTO | null
) {
    const answers = Array.isArray(sessionDetail?.answers) ? sessionDetail.answers : [];
    return answers
        .map((item, index) => {
            const record = item as Record<string, unknown>;
            const answer = pickAnswerRecordValue(record);
            if (answer === undefined || answer === null || (typeof answer === 'string' && answer.trim().length === 0)) {
                return null;
            }

            const domainLabel = inferDomainFromText(
                typeof record.question_code === 'string'
                    ? record.question_code
                    : (typeof record.question_id === 'string' ? record.question_id : '')
            ) ?? 'General';

            const normalizedAnswer =
                typeof answer === 'boolean'
                    ? (answer ? 'Sí' : 'No')
                    : normalizeMojibakeText(String(answer));

            return {
                index: index + 1,
                sectionLabel: normalizeClinicalTextPresentation(record.section, 'General'),
                domainLabel,
                questionText: 'No fue posible recuperar el texto completo de la pregunta.',
                answerLabel: normalizedAnswer,
                normalizedAnswerLabel: normalizedAnswer,
                responseTypeLabel: 'Respuesta registrada',
                impactLabel: 'Registrada',
                impactDescription: 'Respuesta registrada para análisis del dominio correspondiente.'
            } satisfies AnsweredQuestionReportRow;
        })
        .filter((item): item is AnsweredQuestionReportRow => item !== null);
}

export function buildAnsweredQuestionsDataset({
    sessionDetail,
    sessionQuestions
}: Pick<BuildDatasetArgs, 'sessionDetail' | 'sessionQuestions'>) {
    const answerLookup = normalizeAnswerDictionary(sessionDetail?.answers);
    const rows = sessionQuestions
        .map((question, index) => buildAnswerRowFromQuestion(question, answerLookup, index + 1))
        .filter((item): item is AnsweredQuestionReportRow => item !== null);

    if (rows.length > 0) {
        return {
            rows,
            notice: null
        };
    }

    const fallbackRows = buildFallbackAnswerRows(sessionDetail);
    if (fallbackRows.length > 0) {
        return {
            rows: fallbackRows,
            notice: 'No fue posible recuperar el texto completo de algunas preguntas, pero se muestran las respuestas disponibles.'
        };
    }

    if (import.meta.env.DEV) {
        console.debug('[questionnaire-pdf] answered questions unavailable');
    }

    return {
        rows: [],
        notice: 'No fue posible recuperar el detalle de preguntas contestadas para esta sesión.'
    };
}

function normalizeRiskLabel(value: unknown) {
    const normalized = typeof value === 'string' ? value.trim().toLowerCase() : '';
    if (normalized === 'baja' || normalized === 'low') return 'Baja';
    if (normalized === 'intermedia' || normalized === 'medium' || normalized === 'moderate') return 'Intermedia';
    if (normalized === 'relevante') return 'Relevante';
    if (normalized === 'alta' || normalized === 'high' || normalized === 'severe') return 'Alta';
    return normalizeClinicalTextPresentation(getAlertLevelLabel(value), 'No disponible');
}

function buildDomainRowsFromResults(
    resultsDomains: QuestionnaireEvaluationDomainDTO[],
    clinicalDomains: QuestionnaireClinicalDomainV2DTO[]
) {
    const map = new Map<string, QuestionnaireDomainReportRow>();

    resultsDomains.forEach((domain, index) => {
        const domainLabel = formatDomainLabel(domain.domain ?? `Dominio ${index + 1}`);
        map.set(domainLabel, {
            key: domainLabel,
            domainLabel,
            probabilityValue: toFiniteNumber(domain.probability),
            probabilityLabel: formatReportPercent(domain.probability, '--'),
            levelLabel: normalizeRiskLabel(domain.alert_level),
            confidenceLabel: normalizeClinicalTextPresentation(getConfidenceBandLabel(domain.confidence_band), '--')
        });
    });

    clinicalDomains.forEach((domain, index) => {
        const domainLabel = formatDomainLabel(domain.domain ?? `Dominio ${index + 1}`);
        const current = map.get(domainLabel);
        const nextProbability = toFiniteNumber(domain.probability);
        map.set(domainLabel, {
            key: domainLabel,
            domainLabel,
            probabilityValue: current?.probabilityValue ?? nextProbability,
            probabilityLabel: current?.probabilityLabel ?? formatReportPercent(domain.probability, '--'),
            levelLabel: normalizeRiskLabel(domain.compatibility_level ?? domain.risk_level),
            confidenceLabel:
                normalizeClinicalTextPresentation(getConfidenceBandLabel(domain.confidence_band), current?.confidenceLabel ?? '--')
        });
    });

    return Array.from(map.values()).sort((left, right) => (right.probabilityValue ?? -1) - (left.probabilityValue ?? -1));
}

function buildSectionNarratives(clinicalSummary: QuestionnaireClinicalSummaryV2DTO | null) {
    const sections = clinicalSummary?.sections;
    if (Array.isArray(sections)) {
        return sections
            .map((section) => ({
                title: normalizeClinicalTextPresentation(section.title, ''),
                content: normalizeClinicalTextPresentation(section.content, '')
            }))
            .filter((section) => section.title && section.content);
    }

    if (sections && typeof sections === 'object') {
        return Object.entries(sections)
            .map(([key, value]) => ({
                title: normalizeClinicalTextPresentation(key.replace(/_/g, ' '), ''),
                content: normalizeClinicalTextPresentation(value, '')
            }))
            .filter((section) => section.title && section.content);
    }

    return [];
}

function buildCompletionSummary(
    sessionDetail: QuestionnaireHistoryDetailV2DTO | QuestionnaireSessionV2DTO | null,
    answeredRows: AnsweredQuestionReportRow[],
    sessionQuestions: QuestionnaireQuestionV2DTO[]
) {
    const answeredCount =
        toFiniteNumber(sessionDetail?.answered_count) ??
        answeredRows.length;
    const totalQuestions =
        toFiniteNumber(sessionDetail?.total_questions) ??
        (sessionQuestions.length > 0 ? sessionQuestions.length : answeredCount);
    const safeTotal = totalQuestions > 0 ? totalQuestions : answeredCount;
    const ratio = safeTotal > 0 ? Math.min(1, Math.max(0, answeredCount / safeTotal)) : 0;

    return {
        answeredCount,
        totalQuestions: safeTotal,
        ratio,
        ratioLabel: formatReportPercent(ratio, '--'),
        modeLabel: getModeLabel(sessionDetail?.mode, '--'),
        roleLabel: getRoleLabel(sessionDetail?.role, '--'),
        statusLabel: getStatusLabel(sessionDetail?.status, '--')
    } satisfies QuestionnaireCompletionSummary;
}

export function buildQuestionnaireAlertReportDataset({
    sessionDetail,
    sessionQuestions,
    results,
    clinicalSummary
}: BuildDatasetArgs): QuestionnaireAlertReportDataset {
    const answered = buildAnsweredQuestionsDataset({ sessionDetail, sessionQuestions });
    const completion = buildCompletionSummary(sessionDetail, answered.rows, sessionQuestions);
    const sectionSummaryRows = Array.from(
        answered.rows.reduce((map, row) => {
            map.set(row.sectionLabel, (map.get(row.sectionLabel) ?? 0) + 1);
            return map;
        }, new Map<string, number>())
    )
        .map(([sectionLabel, answeredCount]) => ({ sectionLabel, answeredCount }))
        .sort((left, right) => right.answeredCount - left.answeredCount);

    const answeredQuestionsByDomain = Array.from(
        answered.rows.reduce((map, row) => {
            map.set(row.domainLabel, (map.get(row.domainLabel) ?? 0) + 1);
            return map;
        }, new Map<string, number>())
    )
        .map(([label, value]) => ({ label, value }))
        .sort((left, right) => right.value - left.value);

    const impactDistribution = Array.from(
        answered.rows.reduce((map, row) => {
            map.set(row.impactLabel, (map.get(row.impactLabel) ?? 0) + 1);
            return map;
        }, new Map<string, number>())
    )
        .map(([label, count]) => ({ label, count }))
        .sort((left, right) => right.count - left.count);

    const domainRows = buildDomainRowsFromResults(results?.domains ?? [], clinicalSummary?.domains ?? []);
    const sectionNarratives = buildSectionNarratives(clinicalSummary);
    const summaryText = normalizeClinicalTextPresentation(
        clinicalSummary?.simulated_diagnostic_text?.sintesis_general ?? results?.result?.summary,
        'No fue posible recuperar una síntesis general para esta sesión.'
    );
    const recommendationText = normalizeClinicalTextPresentation(
        clinicalSummary?.simulated_diagnostic_text?.recomendacion_profesional ?? results?.result?.operational_recommendation,
        'Se recomienda revisar este resultado con apoyo profesional si las señales observadas generan preocupación.'
    );
    const clarificationText = normalizeClinicalTextPresentation(
        clinicalSummary?.simulated_diagnostic_text?.aclaracion_importante,
        'El impacto por pregunta es una orientación descriptiva según la escala de respuesta; no representa un diagnóstico individual.'
    );
    const disclaimerText = normalizeClinicalTextPresentation(
        clinicalSummary?.disclaimer,
        'Este reporte es orientativo y no reemplaza una evaluación profesional.'
    );

    return {
        answeredQuestions: answered.rows,
        answeredQuestionsNotice: answered.notice,
        domainRows,
        sectionSummaryRows,
        answeredQuestionsByDomain,
        impactDistribution,
        completion,
        summaryText,
        recommendationText,
        clarificationText,
        disclaimerText,
        sectionNarratives
    };
}
