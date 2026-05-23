import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiGet = vi.fn();
const apiGetBlobWithMeta = vi.fn();
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
    apiGetBlobWithMeta,
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
            answers: [{ question_id: 'q-1', answer: 'valor' }],
            include_answers: false
        });

        expect(apiSecurePost).toHaveBeenCalledWith(
            '/api/v2/questionnaires/sessions',
            { mode: 'complete', role: 'guardian' },
            expect.objectContaining({ auth: true, credentials: 'include' })
        );
        expect(apiSecurePatch).toHaveBeenCalledWith(
            '/api/v2/questionnaires/sessions/sess-1/answers',
            {
                answers: [{ question_id: 'q-1', answer: 'valor' }],
                include_answers: false
            },
            expect.objectContaining({ auth: true, credentials: 'include' })
        );
    });

    it('usa transporte cifrado para crear casos, compartir con psicólogo y guardar revisiones profesionales', async () => {
        apiSecurePost
            .mockResolvedValueOnce({ case: { case_id: 'case-1', private_label: 'Hijo mayor' } })
            .mockResolvedValueOnce({ share_code: 'abc123', grantee: { user_id: 'psy-1' } })
            .mockResolvedValueOnce({ review_id: 'rev-1', review_status: 'in_review' });
        apiSecurePatch.mockResolvedValueOnce({ review_id: 'rev-1', review_status: 'reviewed' });

        const module = await import('./questionnaires.api');
        await module.createQuestionnaireCaseV2({ private_label: 'Hijo mayor', metadata: {} });
        await module.shareQuestionnaireWithPsychologistV2('sess-1', {
            grantee_user_id: 'psy-1',
            grant_can_tag: false,
            grant_can_download_pdf: true,
            share_scope: 'session',
            expires_in_hours: 720,
            max_uses: 100
        });
        await module.createQuestionnaireProfessionalReviewV2('sess-1', {
            review_status: 'in_review',
            initial_concept: 'Texto',
            recommendation: 'Seguimiento',
            visible_to_guardian: true
        });
        await module.updateQuestionnaireProfessionalReviewV2('sess-1', 'rev-1', {
            review_status: 'reviewed',
            initial_concept: 'Actualizado',
            recommendation: 'Actualizado',
            visible_to_guardian: true
        });

        expect(apiSecurePost).toHaveBeenCalledWith(
            '/api/v2/questionnaires/cases',
            { private_label: 'Hijo mayor', metadata: {} },
            expect.objectContaining({ auth: true, credentials: 'include' })
        );
        expect(apiSecurePost).toHaveBeenCalledWith(
            '/api/v2/questionnaires/history/sess-1/share',
            expect.objectContaining({
                grantee_user_id: 'psy-1',
                share_scope: 'session'
            }),
            expect.objectContaining({ auth: true, credentials: 'include' })
        );
        expect(apiSecurePost).toHaveBeenCalledWith(
            '/api/v2/questionnaires/history/sess-1/professional-reviews',
            expect.objectContaining({
                review_status: 'in_review',
                visible_to_guardian: true
            }),
            expect.objectContaining({ auth: true, credentials: 'include' })
        );
        expect(apiSecurePatch).toHaveBeenCalledWith(
            '/api/v2/questionnaires/history/sess-1/professional-reviews/rev-1',
            expect.objectContaining({
                review_status: 'reviewed'
            }),
            expect.objectContaining({ auth: true, credentials: 'include' })
        );
    });

    it('usa POST cifrado para report-preview secure', async () => {
        apiSecurePostNoBody.mockResolvedValueOnce({
            session: { session_id: 'sess-1' },
            result: null,
            domains: [],
            comorbidity: [],
            answers: [],
            professional_reviews: [],
            pdf: { available: true }
        });

        const module = await import('./questionnaires.api');
        await module.getQuestionnaireReportPreviewV2('sess-1');

        expect(apiSecurePostNoBody).toHaveBeenCalledWith(
            '/api/v2/questionnaires/history/sess-1/report-preview/secure',
            expect.objectContaining({ auth: true, credentials: 'include' })
        );
    });

    it('descarga el PDF del historial sin caché y conserva el nombre enviado por backend', async () => {
        apiGetBlobWithMeta.mockResolvedValueOnce({
            blob: new Blob(['pdf']),
            headers: new Headers({
                'content-disposition': 'attachment; filename="Reporte backend.pdf"'
            })
        });

        const module = await import('./questionnaires.api');
        const result = await module.downloadQuestionnaireHistoryPdfV2('sess-1');

        expect(apiGetBlobWithMeta).toHaveBeenCalledWith(
            '/api/v2/questionnaires/history/sess-1/pdf/download',
            expect.objectContaining({
                auth: true,
                credentials: 'include',
                headers: expect.objectContaining({
                    'Cache-Control': 'no-cache',
                    Pragma: 'no-cache'
                })
            })
        );
        expect(result.filename).toBe('Reporte backend.pdf');
    });
});
