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
            const questions = response.questions || [];
            const ordered = sortQuestionsByPosition(questions);
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
        const timeoutId = window.setTimeout(() => {
            void fetchActive();
        }, 0);

        return () => window.clearTimeout(timeoutId);
    }, [fetchActive]);

    return {
        ...state,
        refetch: fetchActive
    };
}
