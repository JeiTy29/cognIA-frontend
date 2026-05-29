import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const historySource = () => readFileSync('src/pages/Plataforma/Historial/HistorialBase.tsx', 'utf8');
const detailModalSource = () => readFileSync('src/components/questionnaires/QuestionnaireReportDetailModal.tsx', 'utf8');
const guardianCasesSource = () => readFileSync('src/pages/Plataforma/SeguimientoGuardian/SeguimientoGuardian.tsx', 'utf8');

describe('frontend final dashboard copy and flows', () => {
    it('usa envío directo a psicólogo y no enlace como flujo principal en historial', () => {
        const source = historySource();
        expect(source).toContain('Enviar a psicólogo');
        expect(source).toContain('searchPsychologistsV2');
        expect(source).toContain('shareQuestionnaireWithPsychologistV2');
        expect(source).not.toContain('Generar enlace');
        expect(source).not.toContain('Max usos');
        expect(source).not.toContain('Usuario destinatario autorizado');
    });

    it('mantiene historial como cuestionarios, filtros visibles y paginación horizontal', () => {
        const source = historySource();
        expect(source).toContain('Historial de cuestionarios');
        expect(source).toContain('Consulta cuestionarios aplicados, resultados orientativos y evolución por caso.');
        expect(source).toContain('Cuestionarios por caso');
        expect(source).toContain('Página {history.page} de');
        expect(source).not.toContain('Seguimiento por casos');
        expect(source).not.toContain('Sesiones por caso');
    });

    it('no deja mojibake visible en el detalle alterno de cuestionario', () => {
        const source = detailModalSource();
        const visibleSection = source.slice(source.indexOf('const handleSearchPsychologists'));
        expect(visibleSection).not.toMatch(/Ã|Â|â€/);
        expect(visibleSection).toContain('psicólogos');
        expect(visibleSection).toContain('evaluación');
        expect(visibleSection).toContain('Descargar PDF');
    });

    it('guia el siguiente paso despues de crear caso', () => {
        const source = guardianCasesSource();
        expect(source).toContain('createdCaseFollowUp');
        expect(source).toContain('Asociar cuestionarios');
        expect(source).toContain('Asignar etiqueta desde cuestionario');
        expect(source).toContain('Ver detalle');
        expect(source).toContain('Cuestionarios por caso');
        expect(source).not.toContain('Sesiones por caso');
    });
});
