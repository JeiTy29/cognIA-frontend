import { apiGet } from '../api/httpClient';
import type {
    ColombiaCitiesResponseDTO,
    ColombiaDepartmentDTO,
    ColombiaLocationsResponseDTO
} from './locations.types';

function toRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function readText(value: unknown) {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readStringArray(value: unknown) {
    return Array.isArray(value)
        ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim())
        : [];
}

function normalizeDepartment(value: unknown): ColombiaDepartmentDTO | null {
    const record = toRecord(value);
    if (!record) return null;
    const department = readText(record.department);
    if (!department) return null;
    return {
        department,
        cities: readStringArray(record.cities)
    };
}

export async function getColombiaLocations(): Promise<ColombiaLocationsResponseDTO> {
    const payload = await apiGet<unknown>('/api/v2/locations/colombia', {
        auth: true,
        credentials: 'include'
    });
    const record = toRecord(payload) ?? {};
    return {
        country: readText(record.country) ?? 'Colombia',
        departments: Array.isArray(record.departments)
            ? record.departments.map(normalizeDepartment).filter((item): item is ColombiaDepartmentDTO => Boolean(item))
            : []
    };
}

export async function getColombiaCitiesByDepartment(department: string): Promise<ColombiaCitiesResponseDTO> {
    const encodedDepartment = encodeURIComponent(department);
    const payload = await apiGet<unknown>(`/api/v2/locations/colombia/cities?department=${encodedDepartment}`, {
        auth: true,
        credentials: 'include'
    });
    const record = toRecord(payload) ?? {};
    return {
        department: readText(record.department) ?? department,
        cities: readStringArray(record.cities)
    };
}
