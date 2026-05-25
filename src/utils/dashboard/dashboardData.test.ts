import { describe, expect, it } from 'vitest';
import type { QuestionnaireCaseDTO, QuestionnaireSessionV2DTO } from '../../services/questionnaires/questionnaires.types';
import { buildGuardianCaseDashboardViewModel } from './dashboardData';

describe('buildGuardianCaseDashboardViewModel', () => {
    it('ordena por fecha y hora ascendente y calcula delta con las dos últimas sesiones reales', () => {
        const caseItem: QuestionnaireCaseDTO = {
            case_id: 'case-1',
            display_label: 'Caso A',
            status: 'active'
        };

        const sessions: QuestionnaireSessionV2DTO[] = [
            {
                id: 'session-2',
                session_id: 'session-2',
                questionnaire_id: 'Q-2',
                status: 'processed',
                mode: 'medium',
                processed_at: '2026-05-24T08:36:00.000Z',
                domains: [{ domain: 'conduct', probability: 0 }]
            },
            {
                id: 'session-1',
                session_id: 'session-1',
                questionnaire_id: 'Q-1',
                status: 'processed',
                mode: 'medium',
                processed_at: '2026-05-24T08:18:00.000Z',
                domains: [{ domain: 'conduct', probability: 0.991 }]
            }
        ];

        const viewModel = buildGuardianCaseDashboardViewModel({
            caseItem,
            caseDetail: {
                case: caseItem,
                sessions,
                domain_summary: [],
                trend: []
            },
            domainLabels: ['Conducta']
        });

        expect(viewModel.trendPoints).toHaveLength(2);
        expect(viewModel.trendPoints[0]?.timestamp).toBeLessThan(viewModel.trendPoints[1]?.timestamp ?? 0);
        expect(viewModel.trendPoints[0]?.values.Conducta).toBe(99.1);
        expect(viewModel.trendPoints[1]?.values.Conducta).toBe(0);
        expect(viewModel.domains[0]?.previousPct).toBe(99.1);
        expect(viewModel.domains[0]?.currentPct).toBe(0);
        expect(viewModel.domains[0]?.deltaPct).toBe(-99.1);
    });
});
