export type AlertLevelTone = 'low' | 'moderate' | 'elevated' | 'high' | 'critical_review' | 'unknown';

export interface AlertLevelMeta {
    tone: AlertLevelTone;
    label: string;
    className: string;
    color: string;
    background: string;
}

const ALERT_META: Record<AlertLevelTone, AlertLevelMeta> = {
    low: {
        tone: 'low',
        label: 'Baja',
        className: 'is-low',
        color: '#1f7a46',
        background: '#e8f7ee'
    },
    moderate: {
        tone: 'moderate',
        label: 'Moderada',
        className: 'is-moderate',
        color: '#235ea8',
        background: '#e8f0ff'
    },
    elevated: {
        tone: 'elevated',
        label: 'Elevada',
        className: 'is-elevated',
        color: '#bf6d1e',
        background: '#fff4e5'
    },
    high: {
        tone: 'high',
        label: 'Alta',
        className: 'is-high',
        color: '#bd1f2d',
        background: '#ffe8eb'
    },
    critical_review: {
        tone: 'critical_review',
        label: 'Revisi\u00f3n prioritaria',
        className: 'is-critical-review',
        color: '#5f2a8f',
        background: '#f2e9ff'
    },
    unknown: {
        tone: 'unknown',
        label: 'Sin clasificaci\u00f3n',
        className: 'is-unknown',
        color: '#5f6b7a',
        background: '#eff2f6'
    }
};

export function normalizeAlertLevel(value: string | null | undefined): AlertLevelTone {
    const normalized = (value ?? '').trim().toLowerCase();
    if (!normalized) return 'unknown';
    if (['low', 'baja'].includes(normalized)) return 'low';
    if (['moderate', 'medium', 'intermedia', 'media'].includes(normalized)) return 'moderate';
    if (['elevated', 'relevante'].includes(normalized)) return 'elevated';
    if (['high', 'alta', 'severe'].includes(normalized)) return 'high';
    if (['critical_review', 'critical', 'review_required', 'prioritaria'].includes(normalized)) return 'critical_review';
    return 'unknown';
}

export function getAlertLevelMeta(value: string | null | undefined) {
    const tone = normalizeAlertLevel(value);
    return ALERT_META[tone];
}
