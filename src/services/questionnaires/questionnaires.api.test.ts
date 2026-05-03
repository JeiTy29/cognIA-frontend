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
});
