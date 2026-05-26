import { describe, expect, it } from 'vitest';
import { getAlertLevelMeta, normalizeAlertLevel } from './alerts';

describe('alerts', () => {
    it('normaliza niveles legacy y nuevos', () => {
        expect(normalizeAlertLevel('low')).toBe('low');
        expect(normalizeAlertLevel('moderate')).toBe('moderate');
        expect(normalizeAlertLevel('elevated')).toBe('elevated');
        expect(normalizeAlertLevel('high')).toBe('high');
        expect(normalizeAlertLevel('critical_review')).toBe('critical_review');
        expect(normalizeAlertLevel('media')).toBe('moderate');
        expect(normalizeAlertLevel('relevante')).toBe('elevated');
    });

    it('devuelve metadatos semanticos consistentes', () => {
        const meta = getAlertLevelMeta('critical_review');
        expect(meta.label).toBe('Revisi\u00f3n prioritaria');
        expect(meta.color.length).toBeGreaterThan(0);
    });
});
