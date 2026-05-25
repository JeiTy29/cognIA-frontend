import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiGet = vi.fn();
const apiSecurePatch = vi.fn();
const apiSecurePost = vi.fn();
const apiSecurePostNoBody = vi.fn();

vi.mock('../api/policy', () => ({
    getEncryptedTransportEnabled: () => true,
    getRequireEncryptedSensitivePayloads: () => true
}));

vi.mock('../api/httpClient', () => ({
    apiDelete: vi.fn(),
    apiGet,
    apiGetBlobWithMeta: vi.fn(),
    apiPatch: vi.fn(),
    apiPost: vi.fn(),
    apiPostNoBody: vi.fn(),
    apiPut: vi.fn(),
    apiSecurePatch,
    apiSecurePost,
    apiSecurePostNoBody
}));

describe('questionnaires.api secure endpoints', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
    });

    it('usa POST cifrado para results-secure y evita el endpoint legacy plaintext', async () => {
        apiSecurePostNoBody.mockResolvedValueOnce({
            session: { id: 'sess-1', session_id: 'sess-1' },
            result: null,
            domains: [],
            comorbidity: []
        });

        const module = await import('./questionnaires.api');
        await module.getQuestionnaireHistoryResultsV2('sess-1');

        expect(apiSecurePostNoBody).toHaveBeenCalledWith(
            '/api/v2/questionnaires/history/sess-1/results-secure',
            expect.objectContaining({ auth: true, credentials: 'include' })
        );
        expect(apiGet).not.toHaveBeenCalledWith(
            '/api/v2/questionnaires/history/sess-1/results',
            expect.anything()
        );
    });

    it('usa POST cifrado para clinical-summary', async () => {
        apiSecurePostNoBody.mockResolvedValueOnce({
            session_id: 'sess-1',
            overall_risk_level: 'baja',
            simulated_diagnostic_text: {
                sintesis_general: 'Resumen'
            }
        });

        const module = await import('./questionnaires.api');
        await module.getQuestionnaireClinicalSummaryV2('sess-1');

        expect(apiSecurePostNoBody).toHaveBeenCalledWith(
            '/api/v2/questionnaires/history/sess-1/clinical-summary',
            expect.objectContaining({ auth: true, credentials: 'include' })
        );
    });

    it('usa transporte cifrado para crear sesion y guardar respuestas sensibles', async () => {
        apiSecurePost.mockResolvedValueOnce({ id: 'sess-1', session_id: 'sess-1' });
        apiSecurePatch.mockResolvedValueOnce({});

        const module = await import('./questionnaires.api');
        await module.createQuestionnaireSessionV2({ mode: 'complete', role: 'guardian' });
        await module.patchQuestionnaireSessionAnswersV2('sess-1', {
            answers: [{ question_id: 'q-1', answer: 'valor' }]
        });

        expect(apiSecurePost).toHaveBeenCalledWith(
            '/api/v2/questionnaires/sessions',
            { mode: 'complete', role: 'guardian' },
            expect.objectContaining({ auth: true, credentials: 'include' })
        );
        expect(apiSecurePatch).toHaveBeenCalledWith(
            '/api/v2/questionnaires/sessions/sess-1/answers',
            { answers: [{ question_id: 'q-1', answer: 'valor' }] },
            expect.objectContaining({ auth: true, credentials: 'include' })
        );
    });

    it('envia filtros avanzados en historial secure', async () => {
        apiSecurePost.mockResolvedValueOnce({
            items: [],
            pagination: { page: 1, page_size: 10, total: 0, pages: 1 }
        });

        const module = await import('./questionnaires.api');
        await module.getQuestionnaireHistoryV2({
            status: 'processed',
            case_public_id: 'CASE-100',
            case_label: 'familia',
            tag: 'urgente',
            domain: 'anxiety',
            alert_level: 'high',
            needs_professional_review: true,
            page: 1,
            page_size: 10
        });

        expect(apiSecurePost).toHaveBeenCalledWith(
            '/api/v2/questionnaires/history/secure',
            expect.objectContaining({
                case_public_id: 'CASE-100',
                case_label: 'familia',
                tag: 'urgente',
                domain: 'anxiety',
                alert_level: 'high',
                needs_professional_review: true
            }),
            expect.objectContaining({ auth: true, credentials: 'include' })
        );
    });

    it('consulta dashboard de guardian con query params', async () => {
        apiGet.mockResolvedValueOnce({
            charts: {
                alerts_by_month: [{ month: '2026-01', value: 2 }]
            }
        });

        const module = await import('./questionnaires.api');
        await module.getGuardianDashboardV2({
            months: 6,
            case_label: 'Casa',
            domain: 'anxiety'
        });

        expect(apiGet).toHaveBeenCalledWith(
            '/api/v2/questionnaires/guardian/dashboard?months=6&case_label=Casa&domain=anxiety',
            expect.objectContaining({ auth: true, credentials: 'include' })
        );
    });

    it('normaliza dashboard de psicologo sin depender de items parciales', async () => {
        apiGet.mockResolvedValueOnce({
            charts: {
                alerts_by_domain: [{ domain: 'anxiety', count: 4 }]
            },
            aggregates: {
                by_alert_level: [{ alert_level: 'high', value: 3 }]
            },
            items: [{ id: 's1', session_id: 's1', status: 'processed' }],
            pagination: { page: 1, page_size: 10, total: 1, pages: 1 }
        });

        const module = await import('./questionnaires.api');
        const response = await module.getPsychologistDashboardV2({ page: 1, page_size: 10 });

        expect(response.charts?.alerts_by_domain?.[0].count).toBe(4);
        expect(response.aggregates?.by_alert_level?.[0].value).toBe(3);
        expect(response.items?.[0].id).toBe('s1');
    });
});
