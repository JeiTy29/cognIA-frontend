import { useEffect, useState } from 'react';
import './AppLoadingScreen.css';

type AppLoadingScreenProps = Readonly<{
    title?: string;
    message?: string;
    timedOutMessage?: string;
    timeoutMs?: number;
    onRetry?: () => void;
    onLogout?: () => void;
    compact?: boolean;
}>;

export default function AppLoadingScreen({
    title = 'Preparando CognIA',
    message = 'Estamos verificando tu sesión y cargando la experiencia.',
    timedOutMessage = 'La carga está tardando más de lo esperado.',
    timeoutMs = 9000,
    onRetry,
    onLogout,
    compact = false
}: AppLoadingScreenProps) {
    const [timedOut, setTimedOut] = useState(false);

    useEffect(() => {
        const timeoutId = globalThis.setTimeout(() => setTimedOut(true), timeoutMs);
        return () => globalThis.clearTimeout(timeoutId);
    }, [timeoutMs]);

    return (
        <section className={`app-loading-screen ${compact ? 'is-compact' : ''}`} aria-live="polite" aria-busy={!timedOut}>
            <div className="app-loading-card">
                <div className="app-loading-brand" aria-hidden="true">
                    <span>C</span>
                </div>
                <div className="app-loading-copy">
                    <span className="app-loading-eyebrow">CognIA</span>
                    <h1>{title}</h1>
                    <p>{timedOut ? timedOutMessage : message}</p>
                </div>
                <div className="app-loading-skeleton" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                </div>
                {timedOut ? (
                    <div className="app-loading-actions">
                        {onRetry ? (
                            <button type="button" onClick={onRetry}>
                                Reintentar
                            </button>
                        ) : null}
                        {onLogout ? (
                            <button type="button" className="secondary" onClick={onLogout}>
                                Cerrar sesión
                            </button>
                        ) : null}
                    </div>
                ) : null}
            </div>
        </section>
    );
}
