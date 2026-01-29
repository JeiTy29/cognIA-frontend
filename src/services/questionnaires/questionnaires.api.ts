import { apiGet } from '../api/httpClient';
import type { ActiveQuestionnaireResponseDTO } from './questionnaires.types';

export function getActiveQuestionnaire(): Promise<ActiveQuestionnaireResponseDTO> {
    return apiGet<ActiveQuestionnaireResponseDTO>('/api/v1/questionnaires/active');
}
