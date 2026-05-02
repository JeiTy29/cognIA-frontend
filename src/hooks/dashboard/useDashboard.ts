import { useCallback, useEffect, useRef, useState } from 'react';
import {
    getDashboardAdoptionHistoryBlock,
    getDashboardApiHealth,
    getDashboardDataQuality,
    getDashboardDrift,
    getDashboardEquity,
    getDashboardExecutiveSummary,
    getDashboardFunnel,
    getDashboardHumanReview,
    getDashboardModelMonitoring,
    getDashboardProductivity,
    getDashboardQuestionnaireQuality,
    getDashboardQuestionnaireVolume,
    getDashboardRetention,
    getDashboardUserGrowth
} from '../../services/dashboard/dashboard.api';
import {
    isAdoptionHistoryEmpty,
    isFunnelEmpty,
    isSeriesEmpty,
    normalizeDashboardError
} from '../../services/dashboard/dashboard.mappers';
import type {
    DashboardAdoptionHistoryResponse,
    DashboardBlockConfig,
    DashboardBlockState,
    DashboardBlocksState,
    DashboardFunnelResponse,
    DashboardSeriesResponse
} from '../../services/dashboard/dashboard.types';

const DEFAULT_MONTHS = 12;
const MIN_MONTHS = 1;
const MAX_MONTHS = 120;

type BlockKey = keyof DashboardBlocksState;

interface BlockConfig extends DashboardBlockConfig<BlockKey, unknown> {
    isEmpty: (payload: unknown) => boolean;
}

const blockConfigs: {
    [K in BlockKey]: BlockConfig;
} = {
    executiveSummary: {
        key: 'executiveSummary',
        title: 'Executive Summary',
        family: 'adoption_history',
        endpoint: '/api/v2/dashboard/executive-summary',
        load: getDashboardExecutiveSummary,
        isEmpty: (payload) => isAdoptionHistoryEmpty(payload as DashboardAdoptionHistoryResponse)
    },
    adoptionHistory: {
        key: 'adoptionHistory',
        title: 'Evolucion del uso de la plataforma',
        family: 'adoption_history',
        endpoint: '/api/v2/dashboard/adoption-history',
        load: getDashboardAdoptionHistoryBlock,
        isEmpty: (payload) => isAdoptionHistoryEmpty(payload as DashboardAdoptionHistoryResponse)
    },
    funnel: {
        key: 'funnel',
        title: 'Funnel',
        family: 'funnel',
        endpoint: '/api/v2/dashboard/funnel',
        load: getDashboardFunnel,
        isEmpty: (payload) => isFunnelEmpty(payload as DashboardFunnelResponse)
    },
    productivity: {
        key: 'productivity',
        title: 'Productivity',
        family: 'funnel',
        endpoint: '/api/v2/dashboard/productivity',
        load: getDashboardProductivity,
        isEmpty: (payload) => isFunnelEmpty(payload as DashboardFunnelResponse)
    },
    humanReview: {
        key: 'humanReview',
        title: 'Human Review',
        family: 'funnel',
        endpoint: '/api/v2/dashboard/human-review',
        load: getDashboardHumanReview,
        isEmpty: (payload) => isFunnelEmpty(payload as DashboardFunnelResponse)
    },
    userGrowth: {
        key: 'userGrowth',
        title: 'User Growth',
        family: 'series',
        endpoint: '/api/v2/dashboard/user-growth',
        load: getDashboardUserGrowth,
        isEmpty: (payload) => isSeriesEmpty(payload as DashboardSeriesResponse)
    },
    questionnaireVolume: {
        key: 'questionnaireVolume',
        title: 'Questionnaire Volume',
        family: 'series',
        endpoint: '/api/v2/dashboard/questionnaire-volume',
        load: getDashboardQuestionnaireVolume,
        isEmpty: (payload) => isSeriesEmpty(payload as DashboardSeriesResponse)
    },
    questionnaireQuality: {
        key: 'questionnaireQuality',
        title: 'Questionnaire Quality',
        family: 'series',
        endpoint: '/api/v2/dashboard/questionnaire-quality',
        load: getDashboardQuestionnaireQuality,
        isEmpty: (payload) => isSeriesEmpty(payload as DashboardSeriesResponse)
    },
    apiHealth: {
        key: 'apiHealth',
        title: 'API Health',
        family: 'series',
        endpoint: '/api/v2/dashboard/api-health',
        load: getDashboardApiHealth,
        isEmpty: (payload) => isSeriesEmpty(payload as DashboardSeriesResponse)
    },
    dataQuality: {
        key: 'dataQuality',
        title: 'Data Quality',
        family: 'series',
        endpoint: '/api/v2/dashboard/data-quality',
        load: getDashboardDataQuality,
        isEmpty: (payload) => isSeriesEmpty(payload as DashboardSeriesResponse)
    },
    drift: {
        key: 'drift',
        title: 'Cambios en el comportamiento de los datos',
        family: 'adoption_history',
        endpoint: '/api/v2/dashboard/drift',
        load: getDashboardDrift,
        isEmpty: (payload) => isAdoptionHistoryEmpty(payload as DashboardAdoptionHistoryResponse)
    },
    equity: {
        key: 'equity',
        title: 'Comparativas entre grupos',
        family: 'adoption_history',
        endpoint: '/api/v2/dashboard/equity',
        load: getDashboardEquity,
        isEmpty: (payload) => isAdoptionHistoryEmpty(payload as DashboardAdoptionHistoryResponse)
    },
    modelMonitoring: {
        key: 'modelMonitoring',
        title: 'Model Monitoring',
        family: 'adoption_history',
        endpoint: '/api/v2/dashboard/model-monitoring',
        load: getDashboardModelMonitoring,
        isEmpty: (payload) => isAdoptionHistoryEmpty(payload as DashboardAdoptionHistoryResponse)
    },
    retention: {
        key: 'retention',
        title: 'Continuidad de uso',
        family: 'adoption_history',
        endpoint: '/api/v2/dashboard/retention',
        load: getDashboardRetention,
        isEmpty: (payload) => isAdoptionHistoryEmpty(payload as DashboardAdoptionHistoryResponse)
    }
};

function createEmptyState<TData>(): DashboardBlockState<TData> {
    return {
        status: 'idle',
        data: null,
        error: null
    };
}

function createInitialBlocksState(): DashboardBlocksState {
    return {
        executiveSummary: createEmptyState<DashboardAdoptionHistoryResponse>(),
        adoptionHistory: createEmptyState<DashboardAdoptionHistoryResponse>(),
        funnel: createEmptyState<DashboardFunnelResponse>(),
        productivity: createEmptyState<DashboardFunnelResponse>(),
        humanReview: createEmptyState<DashboardFunnelResponse>(),
        userGrowth: createEmptyState<DashboardSeriesResponse>(),
        questionnaireVolume: createEmptyState<DashboardSeriesResponse>(),
        questionnaireQuality: createEmptyState<DashboardSeriesResponse>(),
        apiHealth: createEmptyState<DashboardSeriesResponse>(),
        dataQuality: createEmptyState<DashboardSeriesResponse>(),
        drift: createEmptyState<DashboardAdoptionHistoryResponse>(),
        equity: createEmptyState<DashboardAdoptionHistoryResponse>(),
        modelMonitoring: createEmptyState<DashboardAdoptionHistoryResponse>(),
        retention: createEmptyState<DashboardAdoptionHistoryResponse>()
    };
}

function clampMonths(value: number) {
    if (!Number.isFinite(value)) return DEFAULT_MONTHS;
    const parsed = Math.trunc(value);
    if (parsed < MIN_MONTHS) return MIN_MONTHS;
    if (parsed > MAX_MONTHS) return MAX_MONTHS;
    return parsed;
}

export interface UseDashboardResult {
    months: number;
    setMonths: (value: number) => void;
    blocks: DashboardBlocksState;
    isReloading: boolean;
    lastUpdated: Date | null;
    reload: () => void;
}

export function useDashboard(): UseDashboardResult {
    const [months, setMonthsState] = useState(DEFAULT_MONTHS);
    const [blocks, setBlocks] = useState<DashboardBlocksState>(() => createInitialBlocksState());
    const [isReloading, setIsReloading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const requestVersionRef = useRef(0);
    const mountedRef = useRef(true);

    const setMonths = useCallback((value: number) => {
        setMonthsState(clampMonths(value));
    }, []);

    const loadDashboard = useCallback(async (targetMonths: number) => {
        const normalizedMonths = clampMonths(targetMonths);
        requestVersionRef.current += 1;
        const currentVersion = requestVersionRef.current;

        setIsReloading(true);
        setBlocks((prev) => {
            const next: DashboardBlocksState = { ...prev };
            const nextByKey = next as Record<BlockKey, DashboardBlockState<unknown>>;
            const prevByKey = prev as Record<BlockKey, DashboardBlockState<unknown>>;
            (Object.keys(blockConfigs) as BlockKey[]).forEach((key) => {
                nextByKey[key] = {
                    ...prevByKey[key],
                    status: 'loading',
                    error: null
                };
            });
            return next;
        });

        const keys = Object.keys(blockConfigs) as BlockKey[];
        const settled = await Promise.allSettled(
            keys.map((key) => blockConfigs[key].load(normalizedMonths))
        );

        if (!mountedRef.current || requestVersionRef.current !== currentVersion) {
            return;
        }

        setBlocks((prev) => {
            const next: DashboardBlocksState = { ...prev };
            const nextByKey = next as Record<BlockKey, DashboardBlockState<unknown>>;

            settled.forEach((result, index) => {
                const key = keys[index];
                const config = blockConfigs[key];

                if (result.status === 'fulfilled') {
                    const payload = result.value;
                    nextByKey[key] = {
                        status: config.isEmpty(payload) ? 'empty' : 'success',
                        data: payload,
                        error: null
                    };
                    return;
                }

                nextByKey[key] = {
                    status: 'error',
                    data: null,
                    error: normalizeDashboardError(result.reason)
                };
            });

            return next;
        });

        setLastUpdated(new Date());
        setIsReloading(false);
    }, []);

    const reload = useCallback(() => {
        void loadDashboard(months);
    }, [loadDashboard, months]);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            void loadDashboard(months);
        }, 0);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [loadDashboard, months]);

    useEffect(() => {
        return () => {
            mountedRef.current = false;
        };
    }, []);

    return {
        months,
        setMonths,
        blocks,
        isReloading,
        lastUpdated,
        reload
    };
}
