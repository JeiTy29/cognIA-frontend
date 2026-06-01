import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiGet = vi.fn();
const apiPost = vi.fn();
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
    apiPost,
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
        const domainItems = Array.isArray(response.charts?.alerts_by_domain)
            ? response.charts?.alerts_by_domain
            : response.charts?.alerts_by_domain?.items ?? [];
        const alertLevelItems = Array.isArray(response.aggregates?.by_alert_level)
            ? response.aggregates?.by_alert_level
            : response.aggregates?.by_alert_level?.items ?? [];

        expect(domainItems[0]?.count).toBe(4);
        expect(alertLevelItems[0]?.value).toBe(3);
        expect(response.items?.[0].id).toBe('s1');
    });

    it('busca psicólogos en el endpoint público de psicólogos por username o ubicación', async () => {
        apiGet.mockResolvedValueOnce({
            items: [{ user_id: 'psych-1', username: 'syn_psych_dashboard_01' }],
            pagination: { page: 1, page_size: 10, total: 1, pages: 1 }
        });

        const module = await import('./questionnaires.api');
        await module.searchPsychologistsV2({ q: 'syn_psych_dashboard_01', same_location: true, recommended: true });

        expect(apiGet).toHaveBeenCalledWith(
            '/api/v2/psychologists/search?q=syn_psych_dashboard_01&same_location=true&recommended=true&page=1&page_size=10',
            expect.objectContaining({ auth: true, credentials: 'include' })
        );
    });

    it('envia cuestionario a psicologo con permisos directos y sin link legacy', async () => {
        apiPost.mockResolvedValueOnce({
            grant: { request_status: 'pending' },
            grantee: { username: 'syn_psych_dashboard_01' }
        });

        const module = await import('./questionnaires.api');
        await module.shareQuestionnaireWithPsychologistV2('sess-1', {
            grantee_user_id: 'psych-1',
            expires_in_hours: 720,
            max_uses: 100,
            grant_can_download_pdf: true,
            grant_can_tag: false,
            share_scope: 'session'
        });

        expect(apiPost).toHaveBeenCalledWith(
            '/api/v2/questionnaires/history/sess-1/share',
            {
                grantee_user_id: 'psych-1',
                grant_can_download_pdf: true,
                grant_can_tag: false,
                share_scope: 'session'
            },
            expect.objectContaining({ auth: true, credentials: 'include' })
        );
    });
    it('consulta responses del cuestionario y normaliza pregunta/respuesta humana', async () => {
        apiGet.mockResolvedValueOnce({
            items: [
                {
                    question_code: 'adhd_hypimp_01_fidgets',
                    question_text: 'Se mueve constantemente o parece inquieto',
                    answer_label: 'Frecuentemente',
                    domain_code: 'adhd',
                    domain_label: 'TDAH'
                }
            ]
        });

        const module = await import('./questionnaires.api');
        const response = await module.getQuestionnaireHistoryResponsesV2('sess-1');

        expect(apiGet).toHaveBeenCalledWith(
            '/api/v2/questionnaires/history/sess-1/responses',
            expect.objectContaining({ auth: true, credentials: 'include' })
        );
        expect(response.items[0].question_text).toBe('Se mueve constantemente o parece inquieto');
        expect(response.items[0].answer_label).toBe('Frecuentemente');
    });

    it('normaliza responses agrupadas por secciones del backend', async () => {
        apiGet.mockResolvedValueOnce({
            session_id: 'sess-1',
            sections: [
                {
                    title: 'TDAH',
                    domain_code: 'adhd',
                    domain_label: 'TDAH',
                    responses: [
                        {
                            question_text: 'Se mueve constantemente o parece inquieto',
                            answer_label: 'Frecuentemente',
                            value: 3
                        }
                    ]
                }
            ]
        });

        const module = await import('./questionnaires.api');
        const response = await module.getQuestionnaireHistoryResponsesV2('sess-1');

        expect(response.items).toHaveLength(1);
        expect(response.items[0]).toMatchObject({
            section_title: 'TDAH',
            domain_code: 'adhd',
            domain_label: 'TDAH',
            question_text: 'Se mueve constantemente o parece inquieto',
            answer_label: 'Frecuentemente'
        });
    });

    it('normaliza responses cuando backend entrega sections como objeto agrupado', async () => {
        apiGet.mockResolvedValueOnce({
            session_id: 'sess-1',
            sections: {
                adhd: {
                    title: 'TDAH',
                    domain_code: 'adhd',
                    domain_label: 'TDAH',
                    questions: {
                        adhd_hypimp_01_fidgets: {
                            question_text: 'Se mueve constantemente o parece inquieto',
                            answer_label: 'Frecuentemente',
                            value: 3
                        }
                    }
                }
            }
        });

        const module = await import('./questionnaires.api');
        const response = await module.getQuestionnaireHistoryResponsesV2('sess-1');

        expect(response.items).toHaveLength(1);
        expect(response.items[0]).toMatchObject({
            section_title: 'TDAH',
            domain_code: 'adhd',
            domain_label: 'TDAH',
            question_text: 'Se mueve constantemente o parece inquieto',
            answer_label: 'Frecuentemente'
        });
    });

    it('normaliza primary_domain y observed_indicators desde results secure', async () => {
        apiSecurePostNoBody.mockResolvedValueOnce({
            session: { id: 'sess-1', session_id: 'sess-1' },
            result: {
                primary_domain: { domain_code: 'adhd', domain_label: 'TDAH', probability: 0.9, alert_level: 'high' },
                observed_indicators: [{ question_text: 'Se mueve constantemente', answer_label: 'Frecuentemente' }]
            },
            comorbidity: []
        });

        const module = await import('./questionnaires.api');
        const response = await module.getQuestionnaireHistoryResultsV2('sess-1');

        expect(response.result?.primary_domain?.domain_label).toBe('TDAH');
        expect(response.result?.observed_indicators?.[0]).toMatchObject({ answer_label: 'Frecuentemente' });
        expect(response.domains[0].domain_label).toBe('TDAH');
    });

    it('normaliza charts poblados de share-requests de psicologo', async () => {
        apiGet.mockResolvedValueOnce({
            items: [],
            summary: { pending_count: 1, accepted_count: 2, rejected_count: 0 },
            charts: {
                by_status: [{ label: 'pending', count: 1 }],
                by_alert_level: [{ alert_level: 'high', value: 2 }],
                by_domain: [{ domain: 'adhd', value: 3 }],
                over_time: [{ date: '2026-05-01', value: 4 }],
                pending_age: [{ label: '0-2 días', value: 1 }]
            },
            pagination: { page: 1, page_size: 20, total: 0, pages: 1 }
        });

        const module = await import('./questionnaires.api');
        const response = await module.getPsychologistShareRequestsV2({ status: 'all', page: 1, page_size: 20 });
        const byStatusItems = Array.isArray(response.charts?.by_status) ? response.charts?.by_status : response.charts?.by_status?.items ?? [];
        const byAlertItems = Array.isArray(response.charts?.by_alert_level) ? response.charts?.by_alert_level : response.charts?.by_alert_level?.items ?? [];
        const byDomainItems = Array.isArray(response.charts?.by_domain) ? response.charts?.by_domain : response.charts?.by_domain?.items ?? [];
        const overTimeItems = Array.isArray(response.charts?.over_time) ? response.charts?.over_time : response.charts?.over_time?.items ?? [];
        const pendingAgeItems = Array.isArray(response.charts?.pending_age) ? response.charts?.pending_age : response.charts?.pending_age?.items ?? [];

        expect(byStatusItems[0]?.count).toBe(1);
        expect(byAlertItems[0]?.value).toBe(2);
        expect(byDomainItems[0]?.value).toBe(3);
        expect(overTimeItems[0]?.value).toBe(4);
        expect(pendingAgeItems[0]?.value).toBe(1);
    });

    it('normaliza solicitudes de psicologo cuando backend usa requests en lugar de items', async () => {
        apiGet.mockResolvedValueOnce({
            requests: [
                {
                    grant_id: 'grant-1',
                    request_status: 'accepted',
                    session: { session_id: 'sess-1' },
                    can_download_pdf: true
                }
            ],
            pagination: { page: 1, page_size: 20, total: 1, pages: 1 }
        });

        const module = await import('./questionnaires.api');
        const response = await module.getPsychologistShareRequestsV2({ status: 'all', page: 1, page_size: 20 });

        expect(response.items).toHaveLength(1);
        expect(response.items[0]).toMatchObject({
            grant_id: 'grant-1',
            request_status: 'accepted',
            can_download_pdf: true
        });
    });
});
