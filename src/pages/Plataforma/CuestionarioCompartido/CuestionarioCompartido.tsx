import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getSharedQuestionnaireV2 } from '../../../services/questionnaires/questionnaires.api';
import { ApiError } from '../../../services/api/httpClient';
import './CuestionarioCompartido.css';

function mapError(error: unknown) {
    if (!(error instanceof ApiError)) return 'No fue posible cargar el resultado compartido.';
    if (error.status === 404) return 'El enlace compartido no existe o expiró.';
    if (error.status >= 500) return 'Error del servidor. Intenta más tarde.';
    return 'No fue posible cargar el resultado compartido.';
}

export default function CuestionarioCompartido() {
    const { questionnaireId = '', shareCode = '' } = useParams();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [payload, setPayload] = useState<unknown>(null);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            void (async () => {
                setLoading(true);
                setError(null);
                try {
                    const response = await getSharedQuestionnaireV2(questionnaireId, shareCode);
                    setPayload(response);
                } catch (requestError) {
                    setError(mapError(requestError));
                } finally {
                    setLoading(false);
                }
            })();
        }, 0);

        return () => window.clearTimeout(timeoutId);
    }, [questionnaireId, shareCode]);

    return (
        <div className="shared-questionnaire">
            <div className="shared-questionnaire-shell">
                <h1>Resultado compartido</h1>
                {loading ? <p>Cargando...</p> : null}
                {error ? <div className="shared-questionnaire-error">{error}</div> : null}
                {!loading && !error ? (
                    <pre className="shared-questionnaire-json">
                        {JSON.stringify(payload, null, 2)}
                    </pre>
                ) : null}
            </div>
        </div>
    );
}
