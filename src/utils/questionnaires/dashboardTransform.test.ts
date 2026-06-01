import { describe, expect, it } from 'vitest';
import { buildActiveFilterChips, buildHistoryKpis, normalizeChartSeries } from './dashboardTransform';

describe('dashboardTransform', () => {
    it('normaliza series de charts y tolera nulos', () => {
        const data = normalizeChartSeries([
            { label: 'Enero', value: 2, alert_level: 'high' },
            { name: 'Febrero', count: 0 },
            { key: '3', total: undefined }
        ]);
        expect(data).toHaveLength(2);
        expect(data[0].value).toBe(2);
        expect(data[1].value).toBe(0);
    });

    it('no convierte probabilidades o dominios anidados en conteos de dashboard', () => {
        const data = normalizeChartSeries([
            { label: 'TDAH', probability: 0.9 },
            { label: 'Caso A', domains: [{ domain: 'adhd', probability: 0.8 }] },
            { label: 'Conducta', count: 3 }
        ]);
        expect(data).toHaveLength(1);
        expect(data[0]).toMatchObject({ label: 'Conducta', value: 3 });
    });

    it('calcula KPIs solo desde summary/paginacion, no desde items paginados', () => {
        const kpis = buildHistoryKpis(null, 2);
        expect(kpis.total).toBe(2);
        expect(kpis.processed).toBe(0);
        expect(kpis.needsReview).toBe(0);
        expect(kpis.withAlert).toBe(0);
        expect(kpis.withoutCase).toBe(0);
    });

    it('respeta los KPIs agregados enviados por backend', () => {
        const kpis = buildHistoryKpis(
            {
                total_records: 12,
                processed_sessions: 8,
                sessions_with_alert: 5,
                sessions_needs_review: 3,
                sessions_without_case: 2
            },
            4
        );
        expect(kpis).toEqual({
            total: 12,
            processed: 8,
            withAlert: 5,
            needsReview: 3,
            withoutCase: 2
        });
    });

    it('genera chips de filtros activos', () => {
        const chips = buildActiveFilterChips({
            status: 'processed',
            q: 'familia',
            domain: 'adhd',
            alert_level: 'critical_review',
            needs_professional_review: true
        });
        expect(chips.map((item) => item.key)).toEqual(expect.arrayContaining(['status', 'q', 'needs_professional_review']));
        expect(chips.find((item) => item.key === 'domain')?.value).toBe('TDAH');
        expect(chips.find((item) => item.key === 'alert_level')?.value.toLowerCase()).toContain('prior');
    });

    it('traduce claves tecnicas en datos de graficas', () => {
        const data = normalizeChartSeries([
            { domain: 'adhd', value: 4 },
            { alert_level: 'critical_review', value: 2 },
            { label: 'anxiety', value: 1 }
        ]);
        expect(data[0].label).toBe('TDAH');
        expect(data[1].label.toLowerCase()).toContain('prior');
        expect(data[2].label).toBe('Ansiedad');
    });

    it('evita usar UUID como label principal de graficas', () => {
        const data = normalizeChartSeries([
            { label: '5f2b43d945f14f4cb0c8aa2d53b18b4f', value: 3 }
        ]);
        expect(data[0].label).toBe('Caso 1');
    });
});
