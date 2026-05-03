import { describe, expect, it } from 'vitest';
import {
    buildClinicalSummarySections,
    DEFAULT_CLINICAL_DISCLAIMER,
    getClinicalComorbiditySummary,
    getRiskLevelPresentation,
    getSafeClinicalDisclaimer
} from './clinicalSummary';
import type { QuestionnaireClinicalSummaryV2DTO } from './questionnaires.types';

const sampleSummary: QuestionnaireClinicalSummaryV2DTO = {
    session_id: 'sess-1',
    overall_risk_level: 'relevante',
    generated_at: '2026-05-03T00:00:00Z',
    simulated_diagnostic_text: {
        sintesis_general: 'Sintesis general de prueba.',
        niveles_de_compatibilidad: 'Compatibilidad relevante en TDAH.',
        indicadores_principales_observados: 'Inquietud, impulsividad y distraccion.',
        impacto_funcional: 'Se observan impactos en el hogar y la escuela.',
        recomendacion_profesional: 'Se recomienda valoracion profesional.',
        aclaracion_importante: 'No constituye diagnostico clinico definitivo.'
    },
    comorbidity: {
        has_comorbidity_signal: true,
        domains: ['adhd', 'anxiety'],
        summary: 'Posible coexistencia de senales entre TDAH y ansiedad.'
    }
};

describe('clinicalSummary helpers', () => {
    it('construye siempre las seis secciones del informe final', () => {
        const sections = buildClinicalSummarySections(sampleSummary);

        expect(sections).toHaveLength(6);
        expect(sections.map((section) => section.key)).toEqual([
            'sintesis_general',
            'niveles_de_compatibilidad',
            'indicadores_principales_observados',
            'impacto_funcional',
            'recomendacion_profesional',
            'aclaracion_importante'
        ]);
    });

    it('mantiene disclaimer obligatorio aunque el backend no lo devuelva', () => {
        const summaryWithoutDisclaimer: QuestionnaireClinicalSummaryV2DTO = {
            simulated_diagnostic_text: {
                sintesis_general: 'Texto de prueba'
            }
        };

        expect(getSafeClinicalDisclaimer(summaryWithoutDisclaimer)).toBe(DEFAULT_CLINICAL_DISCLAIMER);
        expect(buildClinicalSummarySections(summaryWithoutDisclaimer).at(-1)?.content).toBe(DEFAULT_CLINICAL_DISCLAIMER);
    });

    it('mapea correctamente los niveles de riesgo esperados', () => {
        expect(getRiskLevelPresentation('baja')).toMatchObject({ label: 'Baja', tone: 'low' });
        expect(getRiskLevelPresentation('intermedia')).toMatchObject({ label: 'Intermedia', tone: 'moderate' });
        expect(getRiskLevelPresentation('relevante')).toMatchObject({ label: 'Relevante', tone: 'relevant' });
        expect(getRiskLevelPresentation('alta')).toMatchObject({ label: 'Alta', tone: 'high' });
    });

    it('extrae el resumen prudente de comorbilidad cuando viene del backend', () => {
        expect(getClinicalComorbiditySummary(sampleSummary)).toBe(
            'Posible coexistencia de senales entre TDAH y ansiedad.'
        );
    });
});
