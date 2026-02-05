import { useAuth } from '../../hooks/auth/useAuth';
import './DevAuthToggle.css';

export default function DevAuthToggle() {
    const { devBypassEnabled, devAuthActive, setDevAuthActive, devBypassLabel } = useAuth();

    if (!devBypassEnabled) return null;

    return (
        <div className="dev-auth-toggle" role="status" aria-live="polite">
            <div className="dev-auth-toggle__text">
                DEV AUTH: {devAuthActive ? (devBypassLabel ?? 'Guardian') : 'Desactivado'}
            </div>
            <div className="dev-auth-toggle__actions">
                <button
                    type="button"
                    className={`dev-auth-toggle__btn ${!devAuthActive ? 'is-active' : ''}`}
                    onClick={() => setDevAuthActive(false)}
                >
                    Modo público
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
