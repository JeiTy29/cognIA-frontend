import { describe, expect, it } from 'vitest';
import { domainProbabilityToPercent } from './chartScales';

describe('domainProbabilityToPercent', () => {
    it('convierte probabilidades 0-1 a porcentaje 0-100', () => {
        expect(domainProbabilityToPercent(0.005)).toBe(0.5);
        expect(domainProbabilityToPercent(0.003)).toBe(0.3);
        expect(domainProbabilityToPercent(0.024)).toBe(2.4);
        expect(domainProbabilityToPercent(0.51)).toBe(51);
        expect(domainProbabilityToPercent(0.991)).toBe(99.1);
        expect(domainProbabilityToPercent(1)).toBe(100);
    });

    it('respeta valores que ya vienen en escala 0-100', () => {
        expect(domainProbabilityToPercent(99)).toBe(99);
        expect(domainProbabilityToPercent(0)).toBe(0);
    });

    it('devuelve null para valores no numéricos', () => {
        expect(domainProbabilityToPercent(null)).toBe(null);
        expect(domainProbabilityToPercent(undefined)).toBe(null);
        expect(domainProbabilityToPercent('nope')).toBe(null);
    });
});
