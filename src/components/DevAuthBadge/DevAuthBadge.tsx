import { useAuth } from '../../hooks/auth/useAuth';
import './DevAuthBadge.css';

export default function DevAuthBadge() {
    const { devBypassEnabled, devAuthActive, devBypassLabel, devRole, setDevRole } = useAuth();
    if (!devBypassEnabled || !devAuthActive) return null;
    return (
        <div className="dev-auth-badge" role="status" aria-live="polite">
            <div className="dev-auth-badge__title">
                DEV AUTH BYPASS — {devBypassLabel ?? 'Guardian'}
            </div>
            <div className="dev-auth-badge__actions">
                <button
                    type="button"
                    className={`dev-auth-badge__btn ${devRole !== 'admin' ? 'is-active' : ''}`}
                    onClick={() => setDevRole('guardian')}
                >
                    Guardian
                </button>
                <button
                    type="button"
                    className={`dev-auth-badge__btn ${devRole === 'admin' ? 'is-active' : ''}`}
                    onClick={() => setDevRole('admin')}
                >
                    Admin
                </button>
            </div>
        </div>
    );
}
