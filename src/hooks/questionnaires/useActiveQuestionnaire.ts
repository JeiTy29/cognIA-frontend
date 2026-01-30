import { useCallback, useEffect, useState } from 'react';
import { getActiveQuestionnaire } from '../../services/questionnaires/questionnaires.api';
import type { ActiveQuestionnaireResponseDTO, QuestionDTO } from '../../services/questionnaires/questionnaires.types';

interface UseActiveQuestionnaireState {
    data: ActiveQuestionnaireResponseDTO | null;
    loading: boolean;
    error: unknown;
}

function sortQuestionsByPosition(questions: QuestionDTO[]) {
    return [...questions].sort((a, b) => a.position - b.position);
}

export function useActiveQuestionnaire() {
    const [state, setState] = useState<UseActiveQuestionnaireState>({
        data: null,
        loading: true,
        error: null
    });

    const fetchActive = useCallback(async () => {
        setState(prev => ({ ...prev, loading: true, error: null }));
        try {
            const response = await getActiveQuestionnaire();
            const ordered = sortQuestionsByPosition(response.questions ? []);
            setState({
                data: {
                    ...response,
                    questions: ordered
                },
                loading: false,
                error: null
            });
        } catch (error) {
            setState({ data: null, loading: false, error });
        }
    }, []);

    useEffect(() => {
        fetchActive();
    }, [fetchActive]);

    return {
        ...state,
        refetch: fetchActive
    };
}
