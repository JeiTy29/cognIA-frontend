function sanitizeFileSegment(value: string) {
    return value
        .replace(/[\\/:*?"<>|#]+/g, '-')
        .replace(/\s+/g, '_')
        .replace(/-+/g, '-')
        .replace(/_+/g, '_')
        .trim();
}

export function buildReportFileName(
    session: {
        questionnaire_id?: string | null;
        questionnaireId?: string | null;
        questionnaire_public_id?: string | null;
    } | null | undefined,
    extension = 'pdf'
) {
    const questionnaireId =
        session?.questionnaire_id ||
        session?.questionnaireId ||
        session?.questionnaire_public_id ||
        'cuestionario';

    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');

    const normalizedId = sanitizeFileSegment(questionnaireId);
    const normalizedExtension = extension.replace(/^\./, '') || 'pdf';
    return `Informe_CognIA_${normalizedId}_${yyyy}-${mm}-${dd}.${normalizedExtension}`;
}
