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
        expect(normalizeBackendText('RevisiÃ³n profesional')).toBe('Revisión profesional');
        expect(normalizeBackendText('sesiÃ³n procesada')).toBe('sesión procesada');
    });

    it('traduce dominios, alertas y estados sin claves tecnicas visibles', () => {
        expect(normalizeDomainLabel('adhd')).toBe('TDAH');
        expect(normalizeDomainLabel('TDAH')).toBe('TDAH');
        expect(normalizeDomainLabel('depression')).toBe('Depresión');
        expect(normalizeAlertLevel('critical_review')).toBe('Revisión prioritaria');
        expect(normalizeAlertLevel('low')).toBe('Baja');
        expect(normalizeSessionStatus('in_progress')).toBe('En progreso');
        expect(normalizeReviewStatus('in_review')).toBe('En revisión');
    });
});
