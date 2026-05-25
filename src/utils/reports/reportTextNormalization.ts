const PRESERVE_PATTERNS = [
    /^https?:\/\//i,
    /^[A-Za-z0-9_-]{10,}$/,
    /^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+){2,}$/
];

const MOJIBAKE_REPLACEMENTS: Array<[RegExp, string]> = [
    [/Ã¡/g, 'á'],
    [/Ã©/g, 'é'],
    [/Ã­/g, 'í'],
    [/Ã³/g, 'ó'],
    [/Ãº/g, 'ú'],
    [/Ã/g, 'Á'],
    [/Ã‰/g, 'É'],
    [/Ã/g, 'Í'],
    [/Ã“/g, 'Ó'],
    [/Ãš/g, 'Ú'],
    [/Ã±/g, 'ñ'],
    [/Ã‘/g, 'Ñ'],
    [/Â¿/g, '¿'],
    [/Â¡/g, '¡'],
    [/â€“/g, '–'],
    [/â€”/g, '—'],
    [/â€¦/g, '…'],
    [/â€¢/g, '•'],
    [/â€œ/g, '"'],
    [/â€/g, '"'],
    [/â€™/g, "'"]
];

const WORD_REPLACEMENTS: Array<[RegExp, string]> = [
    [/\bsesion\b/g, 'sesión'],
    [/\bSesion\b/g, 'Sesión'],
    [/\bseccion\b/g, 'sección'],
    [/\bSeccion\b/g, 'Sección'],
    [/\bevaluacion\b/g, 'evaluación'],
    [/\bEvaluacion\b/g, 'Evaluación'],
    [/\bdiagnostico\b/g, 'diagnóstico'],
    [/\bDiagnostico\b/g, 'Diagnóstico'],
    [/\bclinico\b/g, 'clínico'],
    [/\bClinico\b/g, 'Clínico'],
    [/\binformacion\b/g, 'información'],
    [/\bInformacion\b/g, 'Información'],
    [/\borientacion\b/g, 'orientación'],
    [/\bOrientacion\b/g, 'Orientación'],
    [/\brecomendacion\b/g, 'recomendación'],
    [/\bRecomendacion\b/g, 'Recomendación'],
    [/\baclaracion\b/g, 'aclaración'],
    [/\bAclaracion\b/g, 'Aclaración'],
    [/\bgeneracion\b/g, 'generación'],
    [/\bGeneracion\b/g, 'Generación'],
    [/\bpagina\b/g, 'página'],
    [/\bPagina\b/g, 'Página'],
    [/\bmedica\b/g, 'médica'],
    [/\bMedica\b/g, 'Médica'],
    [/\bpsicologica\b/g, 'psicológica'],
    [/\bPsicologica\b/g, 'Psicológica'],
    [/\bsintesis\b/g, 'síntesis'],
    [/\bSintesis\b/g, 'Síntesis'],
    [/\bpatron\b/g, 'patrón'],
    [/\bPatron\b/g, 'Patrón'],
    [/\bsenales\b/g, 'señales'],
    [/\bSenales\b/g, 'Señales'],
    [/\bsegun\b/g, 'según'],
    [/\bSegun\b/g, 'Según'],
    [/\btambien\b/g, 'también'],
    [/\bTambien\b/g, 'También'],
    [/\bnino\b/g, 'niño'],
    [/\bNino\b/g, 'Niño'],
    [/\bnina\b/g, 'niña'],
    [/\bNina\b/g, 'Niña'],
    [/\breevaluacion\b/g, 'reevaluación'],
    [/\bReevaluacion\b/g, 'Reevaluación'],
    [/\bobservacion\b/g, 'observación'],
    [/\bObservacion\b/g, 'Observación'],
    [/\bsimulacion\b/g, 'simulación'],
    [/\bSimulacion\b/g, 'Simulación'],
    [/\bestadisticos\b/g, 'estadísticos'],
    [/\bEstadisticos\b/g, 'Estadísticos'],
    [/\bclinicas\b/g, 'clínicas'],
    [/\bClinicas\b/g, 'Clínicas'],
    [/\bterapeuticas\b/g, 'terapéuticas'],
    [/\bTerapeuticas\b/g, 'Terapéuticas'],
    [/sesi\?n/gi, 'sesión'],
    [/secci\?n/gi, 'sección'],
    [/evaluaci\?n/gi, 'evaluación'],
    [/diagn\?stico/gi, 'diagnóstico'],
    [/cl\?nico/gi, 'clínico'],
    [/informaci\?n/gi, 'información'],
    [/orientaci\?n/gi, 'orientación'],
    [/recomendaci\?n/gi, 'recomendación'],
    [/aclaraci\?n/gi, 'aclaración'],
    [/generaci\?n/gi, 'generación'],
    [/p\?gina/gi, 'página'],
    [/m\?dica/gi, 'médica'],
    [/psicol\?gica/gi, 'psicológica'],
    [/s\?ntesis/gi, 'síntesis'],
    [/patr\?n/gi, 'patrón'],
    [/se\?ales/gi, 'señales'],
    [/seg\?n/gi, 'según'],
    [/tambi\?n/gi, 'también'],
    [/ni\?o/gi, 'niño'],
    [/ni\?a/gi, 'niña']
];

function shouldPreserveRawText(value: string) {
    return PRESERVE_PATTERNS.some((pattern) => pattern.test(value));
}

export function normalizePdfText(value: unknown, fallback = ''): string {
    if (value === null || value === undefined) return fallback;
    const source = String(value).trim();
    if (!source) return fallback;
    if (shouldPreserveRawText(source)) return source;

    let next = source;
    for (const [pattern, replacement] of MOJIBAKE_REPLACEMENTS) {
        next = next.replace(pattern, replacement);
    }
    for (const [pattern, replacement] of WORD_REPLACEMENTS) {
        next = next.replace(pattern, replacement);
    }

    return next.replace(/\s+/g, ' ').trim() || fallback;
}

export function normalizePdfTableCell(value: unknown, fallback = ''): string {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
    }
    if (typeof value === 'boolean') {
        return value ? 'Sí' : 'No';
    }
    return normalizePdfText(value, fallback);
}
