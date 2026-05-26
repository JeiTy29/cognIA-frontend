import { describe, expect, it } from 'vitest';
import { normalizeBackendText, normalizeDomainLabel, normalizeReviewStatus } from './presentation';

describe('questionnaire presentation labels', () => {
    it('normaliza mojibake comun de backend a texto legible', () => {
        expect(normalizeBackendText('RevisiÃ³n profesional')).toBe('Revisión profesional');
        expect(normalizeBackendText('sesiÃ³n procesada')).toBe('sesión procesada');
    });

    it('traduce dominios y estados sin claves tecnicas visibles', () => {
        expect(normalizeDomainLabel('critical_review')).not.toContain('critical_review');
        expect(normalizeDomainLabel('depression')).toBe('Depresión');
        expect(normalizeReviewStatus('in_review')).toBe('En revisión');
    });
});
