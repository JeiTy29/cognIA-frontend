import { apiGet } from '../api/httpClient';
import type {
    ColombiaCitiesResponseDTO,
    ColombiaDepartmentDTO,
    ColombiaLocationsResponseDTO
} from './locations.types';

let locationsCache: ColombiaLocationsResponseDTO | null = null;
let locationsPromise: Promise<ColombiaLocationsResponseDTO> | null = null;
const citiesCache = new Map<string, ColombiaCitiesResponseDTO>();
const citiesPromiseCache = new Map<string, Promise<ColombiaCitiesResponseDTO>>();

function toRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
}

function readText(value: unknown) {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readStringArray(value: unknown) {
    return Array.isArray(value)
        ? value
            .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
            .map((item) => item.trim())
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

function seedCitiesCache(locations: ColombiaLocationsResponseDTO) {
    locations.departments.forEach((departmentItem) => {
        citiesCache.set(departmentItem.department, {
            department: departmentItem.department,
            cities: departmentItem.cities
        });
    });
}

export async function getColombiaLocations(): Promise<ColombiaLocationsResponseDTO> {
    if (locationsCache) return locationsCache;
    if (locationsPromise) return locationsPromise;

    locationsPromise = (async () => {
        const payload = await apiGet<unknown>('/api/v2/locations/colombia', {
            auth: true,
            credentials: 'include'
        });
        const record = toRecord(payload) ?? {};
        const normalized: ColombiaLocationsResponseDTO = {
            country: readText(record.country) ?? 'Colombia',
            departments: Array.isArray(record.departments)
                ? record.departments.map(normalizeDepartment).filter((item): item is ColombiaDepartmentDTO => Boolean(item))
                : []
        };

        locationsCache = normalized;
        seedCitiesCache(normalized);
        return normalized;
    })();

    try {
        return await locationsPromise;
    } finally {
        locationsPromise = null;
    }
}

export async function getColombiaCitiesByDepartment(department: string): Promise<ColombiaCitiesResponseDTO> {
    const normalizedDepartment = department.trim();
    if (!normalizedDepartment) {
        return {
            department: '',
            cities: []
        };
    }

    if (citiesCache.has(normalizedDepartment)) {
        return citiesCache.get(normalizedDepartment)!;
    }

    if (locationsCache) {
        const departmentEntry = locationsCache.departments.find((item) => item.department === normalizedDepartment);
        if (departmentEntry) {
            const cached: ColombiaCitiesResponseDTO = {
                department: departmentEntry.department,
                cities: departmentEntry.cities
            };
            citiesCache.set(normalizedDepartment, cached);
            return cached;
        }
    }

    const existingPromise = citiesPromiseCache.get(normalizedDepartment);
    if (existingPromise) return existingPromise;

    const request = (async () => {
        const encodedDepartment = encodeURIComponent(normalizedDepartment);
        const payload = await apiGet<unknown>(`/api/v2/locations/colombia/cities?department=${encodedDepartment}`, {
            auth: true,
            credentials: 'include'
        });
        const record = toRecord(payload) ?? {};
        const normalized: ColombiaCitiesResponseDTO = {
            department: readText(record.department) ?? normalizedDepartment,
            cities: readStringArray(record.cities)
        };
        citiesCache.set(normalizedDepartment, normalized);
        return normalized;
    })();

    citiesPromiseCache.set(normalizedDepartment, request);
    try {
        return await request;
    } finally {
        citiesPromiseCache.delete(normalizedDepartment);
    }
}

export function getCachedColombiaLocations() {
    return locationsCache;
}

export function getCachedColombiaCitiesByDepartment(department: string) {
    return citiesCache.get(department.trim()) ?? null;
}
