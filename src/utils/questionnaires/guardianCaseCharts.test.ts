import { describe, expect, it } from 'vitest';
import { selectGuardianCaseDashboardCharts } from './guardianCaseCharts';

describe('guardian case dashboard chart source selection', () => {
    it('keeps alert evolution empty when backend does not provide alert_count series', () => {
        const charts = selectGuardianCaseDashboardCharts({
            activity_by_case: {
                unit: 'questionnaire_count',
                items: [{ label: 'hijo 1', value: 4 }]
            }
        });

        expect(charts.monthlyAlerts.data).toEqual([]);
        expect(charts.monthlyAlerts.emptyMessage).toContain('alertas por mes');
    });

    it('does not use ambiguous alerts_by_domain without alert_count unit', () => {
        const charts = selectGuardianCaseDashboardCharts({
            alerts_by_domain: [
                { domain: 'adhd', count: 13 },
                { domain: 'anxiety', count: 13 }
            ]
        });

        expect(charts.domain.title).toBe('Alertas por dominio');
        expect(charts.domain.data).toEqual([]);
    });

    it('uses domain load as percentage and not as alert count', () => {
        const charts = selectGuardianCaseDashboardCharts({
            domain_load_summary: {
                unit: 'percentage',
                items: [{ domain: 'adhd', avg_probability: 0.82 }]
            }
        });

        expect(charts.domain.title).toBe('Carga por dominio');
        expect(charts.domain.formatter).toBe('percent');
        expect(charts.domain.data[0]).toMatchObject({ label: 'TDAH', value: 82 });
    });

    it('renames questionnaire activity by case instead of showing it as alerts', () => {
        const charts = selectGuardianCaseDashboardCharts({
            activity_by_case: {
                unit: 'questionnaire_count',
                items: [{ label: 'hijo 1', value: 5 }]
            }
        });

        expect(charts.caseActivity.title).toBe('Cuestionarios por caso');
        expect(charts.caseActivity.data[0]).toMatchObject({ label: 'hijo 1', value: 5 });
    });

    it('uses alerts_by_case only when unit is alert_count', () => {
        const charts = selectGuardianCaseDashboardCharts({
            alerts_by_case: {
                unit: 'alert_count',
                items: [{ label: 'hijo 2', count: 3 }]
            }
        });

        expect(charts.caseActivity.title).toBe('Alertas elevadas por caso');
        expect(charts.caseActivity.data[0]).toMatchObject({ label: 'hijo 2', value: 3 });
    });
});
