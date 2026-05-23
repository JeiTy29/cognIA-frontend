const PRESERVE_PATTERNS = [
    /^https?:\/\//i,
    /^[A-Za-z0-9_-]{10,}$/,
    /^[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+){2,}$/
];

const PDF_TEXT_REPLACEMENTS: Array<[RegExp, string]> = [
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
    [/â€™/g, "'"],
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
    for (const [pattern, replacement] of PDF_TEXT_REPLACEMENTS) {
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
