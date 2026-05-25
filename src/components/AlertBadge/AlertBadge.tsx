import { getAlertLevelMeta } from '../../utils/dashboard/alerts';
import './AlertBadge.css';

interface AlertBadgeProps {
    level: string | null | undefined;
}

export function AlertBadge({ level }: Readonly<AlertBadgeProps>) {
    const meta = getAlertLevelMeta(level);
    return (
        <span
            className={`alert-badge ${meta.className}`}
            style={{ backgroundColor: meta.background, color: meta.color }}
        >
            {meta.label}
        </span>
    );
}
