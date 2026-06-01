import { describe, expect, it } from 'vitest';
import {
    normalizeAlertLevel,
    normalizeBackendText,
    normalizeDomainLabel,
    normalizeReviewStatus,
    normalizeSessionStatus
} from './presentation';

describe('questionnaire presentation labels', () => {
    it('normaliza mojibake comun de backend a texto legible', () => {
        expect(normalizeBackendText('Revisi\u00c3\u00b3n profesional')).toBe('Revisi\u00f3n profesional');
        expect(normalizeBackendText('sesi\u00c3\u00b3n procesada')).toBe('sesi\u00f3n procesada');
    });

    it('traduce dominios, alertas y estados sin claves tecnicas visibles', () => {
        expect(normalizeDomainLabel('adhd')).toBe('TDAH');
        expect(normalizeDomainLabel('TDAH')).toBe('TDAH');
        expect(normalizeDomainLabel('depression')).toBe('Depresi\u00f3n');
        expect(normalizeDomainLabel('general')).toBe('Sin dominio predominante');
        expect(normalizeDomainLabel(null)).toBe('Sin dominio predominante');
        expect(normalizeAlertLevel('critical_review')).toBe('Revisi\u00f3n prioritaria');
        expect(normalizeAlertLevel('Cr\u00edtico Para Revision')).toBe('Revisi\u00f3n prioritaria');
        expect(normalizeAlertLevel('low')).toBe('Baja');
        expect(normalizeSessionStatus('in_progress')).toBe('En progreso');
        expect(normalizeReviewStatus('in_review')).toBe('En revisi\u00f3n');
    });
});
