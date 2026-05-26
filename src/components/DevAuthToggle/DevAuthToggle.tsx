import { useAuth } from '../../hooks/auth/useAuth';
import './DevAuthToggle.css';

function shouldHideDevAuthOverlay() {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('hideDevAuth') === '1' || params.get('screenshot') === '1';
}

export default function DevAuthToggle() {
    const { devBypassEnabled, devAuthActive, setDevAuthActive, devBypassLabel } = useAuth();

    if (shouldHideDevAuthOverlay()) return null;
    if (!devBypassEnabled) return null;
    const publicModeActive = devAuthActive === false;

    return (
        <div className="dev-auth-toggle" role="status" aria-live="polite">
            <div className="dev-auth-toggle__text">
                DEV AUTH: {devAuthActive ? (devBypassLabel ?? 'Guardian') : 'Desactivado'}
            </div>
            <div className="dev-auth-toggle__actions">
                <button
                    type="button"
                    className={`dev-auth-toggle__btn ${publicModeActive ? 'is-active' : ''}`}
                    onClick={() => setDevAuthActive(false)}
                >
                    Modo publico
                </button>
                <button
                    type="button"
                    className={`dev-auth-toggle__btn ${devAuthActive ? 'is-active' : ''}`}
                    onClick={() => setDevAuthActive(true)}
                >
                    Activar DEV
                </button>
            </div>
        </div>
    );
}
