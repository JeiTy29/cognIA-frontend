import { useAuth } from '../../hooks/auth/useAuth';
import './DevAuthBadge.css';

export default function DevAuthBadge() {
    const { devBypassEnabled, devBypassLabel } = useAuth();
    if (!devBypassEnabled) return null;
    return (
        <div className="dev-auth-badge">
            DEV AUTH BYPASS — {devBypassLabel ?? 'Guardian'}
        </div>
    );
}
