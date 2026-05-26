import { useAuth } from '../../hooks/auth/useAuth';
import './DevAuthBadge.css';

function shouldHideDevAuthOverlay() {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('hideDevAuth') === '1' || params.get('screenshot') === '1';
}

export default function DevAuthBadge() {
    const { devBypassEnabled, devAuthActive, devBypassLabel, devRole, setDevRole } = useAuth();
    if (shouldHideDevAuthOverlay()) return null;
    if (!devBypassEnabled || !devAuthActive) return null;
    const guardianActive = devRole === 'guardian';
    const adminActive = devRole === 'admin';

    return (
        <div className="dev-auth-badge" role="status" aria-live="polite">
            <div className="dev-auth-badge__title">
                DEV AUTH BYPASS - {devBypassLabel ?? 'Guardian'}
            </div>
            <div className="dev-auth-badge__actions">
                <button
                    type="button"
                    className={`dev-auth-badge__btn ${guardianActive ? 'is-active' : ''}`}
                    onClick={() => setDevRole('guardian')}
                >
                    Guardian
                </button>
                <button
                    type="button"
                    className={`dev-auth-badge__btn ${adminActive ? 'is-active' : ''}`}
                    onClick={() => setDevRole('admin')}
                >
                    Admin
                </button>
            </div>
        </div>
    );
}
