import { useCallback, useEffect, useRef, useState } from 'react';
import { createOperationalReportJob } from '../../services/reports/reports.api';
import {
    createInitialReportGenerationState,
    normalizeOperationalReportError
} from '../../services/reports/reports.mappers';
import type {
    OperationalReportGenerationMap,
    OperationalReportType
} from '../../services/reports/reports.types';
import { OPERATIONAL_REPORT_TYPES } from '../../services/reports/reports.types';

function createInitialReportStates(): OperationalReportGenerationMap {
    return OPERATIONAL_REPORT_TYPES.reduce((acc, reportType) => {
        acc[reportType] = createInitialReportGenerationState();
        return acc;
    }, {} as OperationalReportGenerationMap);
}

function createInitialRequestVersionMap() {
    return OPERATIONAL_REPORT_TYPES.reduce((acc, reportType) => {
        acc[reportType] = 0;
        return acc;
    }, {} as Record<OperationalReportType, number>);
}

export interface UseDashboardReportsResult {
    reportStates: OperationalReportGenerationMap;
    generateReport: (reportType: OperationalReportType) => Promise<void>;
}

export function useDashboardReports(months: number): UseDashboardReportsResult {
    const [reportStates, setReportStates] = useState<OperationalReportGenerationMap>(() =>
        createInitialReportStates()
    );
    const mountedRef = useRef(true);
    const requestVersionRef = useRef<Record<OperationalReportType, number>>(
        createInitialRequestVersionMap()
    );

    const generateReport = useCallback(
        async (reportType: OperationalReportType) => {
            requestVersionRef.current[reportType] += 1;
            const currentVersion = requestVersionRef.current[reportType];

            setReportStates((prev) => ({
                ...prev,
                [reportType]: {
                    ...prev[reportType],
                    status: 'loading',
                    error: null
                }
            }));

            try {
                const report = await createOperationalReportJob(reportType, months);

                if (
                    !mountedRef.current ||
                    requestVersionRef.current[reportType] !== currentVersion
                ) {
                    return;
                }

                setReportStates((prev) => ({
                    ...prev,
                    [reportType]: {
                        status: 'success',
                        data: report,
                        error: null
                    }
                }));
            } catch (error) {
                if (
                    !mountedRef.current ||
                    requestVersionRef.current[reportType] !== currentVersion
                ) {
                    return;
                }

                setReportStates((prev) => ({
                    ...prev,
                    [reportType]: {
                        status: 'error',
                        data: prev[reportType].data,
                        error: normalizeOperationalReportError(error)
                    }
                }));
            }
        },
        [months]
    );

    useEffect(() => {
        return () => {
            mountedRef.current = false;
        };
    }, []);

    return {
        reportStates,
        generateReport
    };
}
