import { describe, expect, it } from 'vitest';
import {
    getDashboardAlertLabel,
    getDashboardDomainLabel,
    resolveCaseCompositeLabel,
    resolveCasePrimaryLabel,
    toHistoryStatusFilter,
    toOptionalFilterText
} from './dashboardLabels';

describe('dashboardLabels', () => {
    it('normaliza status de historial y devuelve undefined para "Todos"', () => {
        expect(toHistoryStatusFilter('processed')).toBe('processed');
        expect(toHistoryStatusFilter('')).toBeUndefined();
        expect(toHistoryStatusFilter('invalid')).toBeUndefined();
    });

    it('normaliza textos vacios a undefined para filtros opcionales', () => {
        expect(toOptionalFilterText('')).toBeUndefined();
        expect(toOptionalFilterText('   ')).toBeUndefined();
        expect(toOptionalFilterText('caso-1')).toBe('caso-1');
    });

    it('prioriza display/private/public label y evita ids tecnicos como etiqueta principal', () => {
        expect(
            resolveCasePrimaryLabel({
                display_label: 'Caso escolar',
                case_public_id: 'CASO-AB12CD'
            })
        ).toBe('Caso escolar');
        expect(
            resolveCasePrimaryLabel({
                case_id: '5f2b43d945f14f4cb0c8aa2d53b18b4f'
            })
        ).toBe('Caso sin etiqueta');
    });

    it('construye label compuesto cuando hay etiqueta y case_public_id', () => {
        expect(
            resolveCaseCompositeLabel({
                private_label: 'Hijo mayor',
                case_public_id: 'CASO-E79FCF'
            })
        ).toBe('Hijo mayor - CASO-E79FCF');
    });

    it('traduce dominios y alertas para vista de usuario', () => {
        expect(getDashboardDomainLabel('adhd')).toBe('TDAH');
        expect(getDashboardDomainLabel('anxiety')).toBe('Ansiedad');
        expect(getDashboardAlertLabel('critical_review').toLowerCase()).toContain('prior');
    });
});

