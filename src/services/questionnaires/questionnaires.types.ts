export type ResponseType = 'likert' | 'boolean' | 'integer' | 'text' | string;

export type ResponseOptions = Array<number | string> | null;

export interface QuestionnaireTemplateDTO {
    id: string | number;
    name: string;
    version: string;
    description?: string | null;
    is_active: boolean;
}

export interface QuestionDTO {
    id: string | number;
    code: string;
    text: string;
    response_type: ResponseType;
    disorder_id?: string | null;
    disorder_ids?: string[] | null;
    position: number;
    response_min: number | null;
    response_max: number | null;
    response_step: number | null;
    response_options: ResponseOptions;
}

export interface ActiveQuestionnaireResponseDTO {
    questionnaire_template: QuestionnaireTemplateDTO;
    questions: QuestionDTO[];
}
