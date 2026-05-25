export interface ColombiaDepartmentDTO {
    department: string;
    cities: string[];
}

export interface ColombiaLocationsResponseDTO {
    country: string;
    departments: ColombiaDepartmentDTO[];
}

export interface ColombiaCitiesResponseDTO {
    department: string;
    cities: string[];
}
