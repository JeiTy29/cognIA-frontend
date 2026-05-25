import { describe, expect, it } from 'vitest';
import { formatAxisLabel } from './chartDrawing';
import { extractDashboardSeries } from './dashboardSeries';

describe('extractDashboardSeries', () => {
    it('lee month/count y genera labels largo/corto correctos', () => {
        const result = extractDashboardSeries({
            series: [{ month: '2026-05-01', count: 10 }]
        });

        expect(result).toEqual([
            {
                periodKey: '2026-05',
                rawPeriod: '2026-05-01',
                periodLabel: 'mayo de 2026',
                axisLabel: 'may 2026',
                value: 10
            }
        ]);
    });

    it('lee bucket/count', () => {
        const result = extractDashboardSeries({
            series: [{ bucket: '2026-05-01', count: 10 }]
        });

        expect(result[0]).toMatchObject({
            periodKey: '2026-05',
            periodLabel: 'mayo de 2026',
            axisLabel: 'may 2026',
            value: 10
        });
    });

    it('deduplica meses repetidos sumando valores', () => {
        const result = extractDashboardSeries({
            series: [
                { month: '2026-01-01', count: 2 },
                { month: '2026-01-15', count: 3 },
                { month: '2026-02-01', count: 1 }
            ]
        });

        expect(result).toEqual([
            {
                periodKey: '2026-01',
                rawPeriod: '2026-01-01',
                periodLabel: 'enero de 2026',
                axisLabel: 'ene 2026',
                value: 5
            },
            {
                periodKey: '2026-02',
                rawPeriod: '2026-02-01',
                periodLabel: 'febrero de 2026',
                axisLabel: 'feb 2026',
                value: 1
            }
        ]);
    });

    it('ordena cronológicamente y no alfabéticamente', () => {
        const result = extractDashboardSeries({
            series: [
                { month: '2026-02-01', count: 1 },
                { month: '2026-01-01', count: 2 }
            ]
        });

        expect(result.map((point) => point.periodKey)).toEqual(['2026-01', '2026-02']);
    });

    it('ignora años inválidos como 2001', () => {
        const result = extractDashboardSeries({
            series: [
                { month: '2001-01-01', count: 4 },
                { month: '2026-03-01', count: 2 }
            ]
        });

        expect(result).toHaveLength(1);
        expect(result[0]?.periodKey).toBe('2026-03');
    });

    it('no convierte strings numéricos en fechas', () => {
        const result = extractDashboardSeries({
            series: [{ label: '1', count: 2 }]
        });

        expect(result).toEqual([]);
    });

    it('no mezcla series anidadas heterogéneas por defecto cuando hay serie directa', () => {
        const result = extractDashboardSeries({
            series: [{ month: '2026-05-01', count: 10 }],
            adoption_history: {
                user_growth: {
                    series: [{ month: '2026-05-01', count: 99 }]
                }
            }
        });

        expect(result).toHaveLength(1);
        expect(result[0]?.value).toBe(10);
    });

    it('permite preferredPath para elegir una serie anidada específica', () => {
        const result = extractDashboardSeries(
            {
                adoption_history: {
                    volume_and_growth: {
                        series: [{ month: '2026-04-01', count: 4 }]
                    },
                    user_growth: {
                        series: [{ month: '2026-04-01', count: 7 }]
                    }
                }
            },
            { preferredPath: 'adoption_history.user_growth.series' }
        );

        expect(result[0]).toMatchObject({
            periodKey: '2026-04',
            value: 7
        });
    });
});

describe('formatAxisLabel', () => {
    it('abrevia meses largos', () => {
        expect(formatAxisLabel('enero de 2026')).toBe('ene 2026');
        expect(formatAxisLabel('febrero de 2026')).toBe('feb 2026');
    });
});
