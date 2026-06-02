import type { QuestionnaireCaseDTO, QuestionnaireDashboardChartPointDTO } from '../../services/questionnaires/questionnaires.types';
import { domainProbabilityToPercent } from '../dashboard/chartScales';
import { resolveCaseCompositeLabel } from './dashboardLabels';
import { normalizeAlertLevel, normalizeBackendText, normalizeDomainLabel } from './presentation';
import { formatMonthLabel } from '../dashboard/chartFormatters';

type ChartSource = {
    key: string;
    items: QuestionnaireDashboardChartPointDTO[];
    unit: string;
    unitLabel: string;
};

type ChartItem = {
    label: string;
    value: number;
    tone?: string;
};

type GuardianChartConfig = {
    title: string;
    description: string;
    ariaLabel: string;
    emptyMessage: string;
    data: ChartItem[];
    formatter?: 'percent';
};

const ALERT_UNITS = new Set(['alert_count', 'alerts_count', 'alerts', 'alertas']);
const QUESTIONNAIRE_UNITS = new Set(['questionnaire_count', 'questionnaires_count', 'questionnaires', 'session_count', 'sessions_count', 'sessions', 'cuestionarios']);
const CLASSIFICATION_UNITS = new Set(['domain_classification_count', 'classification_count', 'classifications', 'clasificaciones']);
const PERCENT_UNITS = new Set(['percentage', 'percent', 'score', 'probability', 'avg_probability', 'max_probability', 'porcentaje']);

function normalizeUnit(value: unknown) {
    return normalizeBackendText(value, '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

function readChartSource(charts: Record<string, unknown>, keys: string[]): ChartSource | null {
    for (const key of keys) {
        const candidate = charts[key];
        if (Array.isArray(candidate)) {
            const first = candidate[0] as Record<string, unknown> | undefined;
            return {
                key,
                items: candidate as QuestionnaireDashboardChartPointDTO[],
                unit: normalizeUnit(first?.unit),
                unitLabel: normalizeUnit(first?.unit_label)
            };
        }
        if (candidate && typeof candidate === 'object') {
            const record = candidate as Record<string, unknown>;
            const items = Array.isArray(record.items) ? record.items as QuestionnaireDashboardChartPointDTO[] : null;
            if (!items) continue;
            return {
                key,
                items,
                unit: normalizeUnit(record.unit ?? record.metric_unit),
                unitLabel: normalizeUnit(record.unit_label ?? record.metric_label)
            };
        }
    }
    return null;
}

function hasCompatibleUnit(source: ChartSource | null, acceptedUnits: Set<string>, options?: { impliedByKey?: boolean }) {
    if (!source) return false;
    if (acceptedUnits.has(source.unit) || acceptedUnits.has(source.unitLabel)) return true;
    if (options?.impliedByKey && acceptedUnits === QUESTIONNAIRE_UNITS && source.key === 'sessions_by_case') return true;
    return false;
}

function readCount(point: QuestionnaireDashboardChartPointDTO) {
    const value = Number(point.count ?? point.value);
    return Number.isFinite(value) ? value : null;
}

function readPercent(point: QuestionnaireDashboardChartPointDTO) {
    const record = point as Record<string, unknown>;
    const raw = record.avg_probability ?? record.max_probability ?? record.probability ?? point.value ?? point.count;
    return domainProbabilityToPercent(raw);
}

function isTechnicalId(value: string) {
    return /^[a-f0-9]{16,}$/i.test(value.replace(/[-_]/g, ''));
}

function resolvePointCaseLabel(point: QuestionnaireDashboardChartPointDTO, cases: QuestionnaireCaseDTO[]) {
    const candidates = [
        point.case_id,
        point.case_public_id,
        point.key,
        point.label,
        point.name
    ].map((value) => (typeof value === 'string' ? value.trim() : '')).filter(Boolean);
    const matchingCase = cases.find((caseItem) =>
        candidates.some((candidate) =>
            candidate === caseItem.case_id ||
            candidate === caseItem.case_public_id ||
            candidate === resolveCaseCompositeLabel(caseItem)
        )
    );
    if (matchingCase) return resolveCaseCompositeLabel(matchingCase);

    const label = normalizeBackendText(point.label ?? point.name ?? point.case_public_id ?? point.key, '');
    if (label && !isTechnicalId(label)) return label;
    return 'Caso sin etiqueta';
}

function toChartItems(
    source: ChartSource | null,
    options: {
        labelType: 'month' | 'domain' | 'alert' | 'case';
        cases?: QuestionnaireCaseDTO[];
        valueType?: 'count' | 'percent';
    }
) {
    if (!source) return [];
    return source.items
        .map((point, index): ChartItem | null => {
            const rawLabel = normalizeBackendText(point.label ?? point.name ?? point.domain ?? point.alert_level ?? point.date ?? point.month ?? point.key, '');
            const label =
                options.labelType === 'domain'
                    ? normalizeDomainLabel(point.domain ?? rawLabel)
                    : options.labelType === 'alert'
                        ? normalizeAlertLevel(point.alert_level ?? rawLabel)
                        : options.labelType === 'case'
                            ? resolvePointCaseLabel(point, options.cases ?? [])
                            : options.labelType === 'month'
                                ? formatMonthLabel(point.month ?? point.date ?? rawLabel)
                                : normalizeBackendText(point.month ?? point.date ?? rawLabel, `Periodo ${index + 1}`);
            const value = options.valueType === 'percent' ? readPercent(point) : readCount(point);
            if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
            return { label, value };
        })
        .filter((item): item is ChartItem => Boolean(item));
}

export function selectGuardianCaseDashboardCharts(
    charts: Record<string, unknown> | null | undefined,
    cases: QuestionnaireCaseDTO[] = []
): {
    monthlyAlerts: GuardianChartConfig;
    domain: GuardianChartConfig;
    level: GuardianChartConfig;
    caseActivity: GuardianChartConfig;
} {
    const safeCharts = charts ?? {};
    const alertsByMonth = readChartSource(safeCharts, ['alerts_by_month', 'alerts_over_time']);
    const alertsByDomain = readChartSource(safeCharts, ['alerts_by_domain']);
    const domainLoad = readChartSource(safeCharts, ['domain_load_summary', 'domain_load', 'avg_domain_load']);
    const alertsByLevel = readChartSource(safeCharts, ['alerts_by_level']);
    const alertsByCase = readChartSource(safeCharts, ['alerts_by_case']);
    const activityByCase = readChartSource(safeCharts, ['activity_by_case', 'sessions_by_case']);

    const monthlyAlertItems = hasCompatibleUnit(alertsByMonth, ALERT_UNITS)
        ? toChartItems(alertsByMonth, { labelType: 'month' })
        : [];

    const domainChart = hasCompatibleUnit(alertsByDomain, ALERT_UNITS)
        ? {
            title: 'Alertas por dominio',
            description: 'Conteo de señales orientativas acumuladas por dominio, considerando todos los niveles de alerta.',
            ariaLabel: 'Alertas por dominio',
            emptyMessage: 'Sin datos agregados de alertas por dominio disponibles.',
            data: toChartItems(alertsByDomain, { labelType: 'domain' })
        }
        : hasCompatibleUnit(domainLoad, PERCENT_UNITS)
            ? {
                title: 'Carga por dominio',
                description: 'Carga porcentual reportada por backend para cada dominio. No representa conteo de alertas.',
                ariaLabel: 'Carga por dominio',
                emptyMessage: 'Sin datos agregados de carga por dominio disponibles.',
                data: toChartItems(domainLoad, { labelType: 'domain', valueType: 'percent' }),
                formatter: 'percent' as const
            }
            : {
                title: 'Alertas por dominio',
                description: 'Requiere una serie backend con unidad alert_count.',
                ariaLabel: 'Alertas por dominio',
                emptyMessage: 'Sin datos agregados de alertas por dominio disponibles.',
                data: []
            };

    const levelChart = hasCompatibleUnit(alertsByLevel, ALERT_UNITS)
        ? {
            title: 'Alertas por nivel',
            description: 'Conteo de alertas agregadas por severidad reportado por backend.',
            ariaLabel: 'Alertas por nivel',
            emptyMessage: 'Sin datos agregados de alertas por nivel disponibles.',
            data: toChartItems(alertsByLevel, { labelType: 'alert' })
        }
        : hasCompatibleUnit(alertsByLevel, CLASSIFICATION_UNITS)
            ? {
                title: 'Clasificaciones por nivel',
                description: 'Conteo de clasificaciones de dominio por nivel. No representa solo alertas elevadas.',
                ariaLabel: 'Clasificaciones por nivel',
                emptyMessage: 'Sin clasificaciones agregadas por nivel disponibles.',
                data: toChartItems(alertsByLevel, { labelType: 'alert' })
            }
            : {
                title: 'Distribución por alerta',
                description: 'Requiere una serie backend con unidad alert_count o domain_classification_count.',
                ariaLabel: 'Distribución por alerta',
                emptyMessage: 'Sin datos agregados de niveles de alerta disponibles.',
                data: []
            };

    const caseChart = hasCompatibleUnit(alertsByCase, ALERT_UNITS)
        ? {
            title: 'Alertas elevadas por caso',
            description: 'Casos con mayor conteo de alertas agregadas reportadas por backend.',
            ariaLabel: 'Alertas elevadas por caso',
            emptyMessage: 'Este gráfico requiere una serie backend de alertas por caso.',
            data: toChartItems(alertsByCase, { labelType: 'case', cases })
        }
        : hasCompatibleUnit(activityByCase, QUESTIONNAIRE_UNITS, { impliedByKey: true })
            ? {
                title: 'Cuestionarios por caso',
                description: 'Mostrando cuestionarios por caso porque el backend aún no entrega alertas por caso.',
                ariaLabel: 'Cuestionarios por caso',
                emptyMessage: 'Sin actividad agregada por caso disponible.',
                data: toChartItems(activityByCase, { labelType: 'case', cases })
            }
            : {
                title: 'Alertas elevadas por caso',
                description: 'Requiere una serie backend de alertas por caso con unidad alert_count.',
                ariaLabel: 'Alertas elevadas por caso',
                emptyMessage: 'Este gráfico requiere una serie backend de alertas por caso.',
                data: []
            };

    return {
        monthlyAlerts: {
            title: 'Evolución de alertas',
            description: 'Tendencia mensual de alertas agregadas reportada por backend.',
            ariaLabel: 'Evolución temporal de alertas',
            emptyMessage: 'Sin datos agregados de alertas por mes disponibles.',
            data: monthlyAlertItems
        },
        domain: domainChart,
        level: levelChart,
        caseActivity: caseChart
    };
}
