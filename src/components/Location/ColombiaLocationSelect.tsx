import { useEffect, useMemo, useState } from 'react';
import { CustomSelect } from '../CustomSelect/CustomSelect';
import { ApiError } from '../../services/api/httpClient';
import {
    getCachedColombiaCitiesByDepartment,
    getCachedColombiaLocations,
    getColombiaCitiesByDepartment,
    getColombiaLocations
} from '../../services/locations/locations.api';

type LocationValue = {
    department: string;
    city: string;
};

type ColombiaLocationSelectProps = Readonly<{
    value: LocationValue;
    onChange: (value: LocationValue) => void;
    disabled?: boolean;
    departmentLabel?: string;
    cityLabel?: string;
    className?: string;
    required?: boolean;
}>;

function mapLocationError(error: unknown, fallback: string) {
    if (error instanceof ApiError && error.status === 404) {
        return 'No se encontraron ciudades para el departamento seleccionado.';
    }
    return fallback;
}

export function ColombiaLocationSelect({
    value,
    onChange,
    disabled = false,
    departmentLabel = 'Departamento',
    cityLabel = 'Ciudad',
    className = '',
    required = false
}: ColombiaLocationSelectProps) {
    const [departments, setDepartments] = useState<string[]>([]);
    const [citiesByDepartment, setCitiesByDepartment] = useState<Record<string, string[]>>({});
    const [loadingDepartments, setLoadingDepartments] = useState(true);
    const [loadingCities, setLoadingCities] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [reloadToken, setReloadToken] = useState(0);

    useEffect(() => {
        let cancelled = false;

        const loadDepartments = async () => {
            setLoadingDepartments(true);
            setError(null);
            try {
                const cached = getCachedColombiaLocations();
                const response = cached ?? await getColombiaLocations();
                if (cancelled) return;
                setDepartments(response.departments.map((item) => item.department));
                setCitiesByDepartment(
                    response.departments.reduce<Record<string, string[]>>((acc, item) => {
                        acc[item.department] = item.cities;
                        return acc;
                    }, {})
                );
            } catch (requestError) {
                if (cancelled) return;
                setError(mapLocationError(requestError, 'No fue posible cargar el catálogo de ubicaciones.'));
                setDepartments([]);
                setCitiesByDepartment({});
            } finally {
                if (!cancelled) setLoadingDepartments(false);
            }
        };

        loadDepartments().catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [reloadToken]);

    useEffect(() => {
        const selectedDepartment = value.department.trim();
        if (!selectedDepartment || citiesByDepartment[selectedDepartment]) return;

        const cached = getCachedColombiaCitiesByDepartment(selectedDepartment);
        if (cached) {
            setCitiesByDepartment((prev) => ({
                ...prev,
                [selectedDepartment]: cached.cities
            }));
            return;
        }

        let cancelled = false;
        const loadCities = async () => {
            setLoadingCities(true);
            setError(null);
            try {
                const response = await getColombiaCitiesByDepartment(selectedDepartment);
                if (cancelled) return;
                setCitiesByDepartment((prev) => ({
                    ...prev,
                    [selectedDepartment]: response.cities
                }));
            } catch (requestError) {
                if (cancelled) return;
                setError(mapLocationError(requestError, 'No fue posible cargar las ciudades para el departamento seleccionado.'));
                setCitiesByDepartment((prev) => ({
                    ...prev,
                    [selectedDepartment]: []
                }));
            } finally {
                if (!cancelled) setLoadingCities(false);
            }
        };

        loadCities().catch(() => undefined);
        return () => {
            cancelled = true;
        };
    }, [citiesByDepartment, value.department]);

    const departmentOptions = useMemo(
        () => [
            { value: '', label: loadingDepartments ? 'Cargando departamentos...' : 'Selecciona un departamento' },
            ...departments.map((department) => ({ value: department, label: department }))
        ],
        [departments, loadingDepartments]
    );

    const cityOptions = useMemo(() => {
        const selectedDepartment = value.department.trim();
        const cities = selectedDepartment ? (citiesByDepartment[selectedDepartment] ?? []) : [];
        return [
            {
                value: '',
                label: !selectedDepartment
                    ? 'Selecciona un departamento primero'
                    : loadingCities
                        ? 'Cargando ciudades...'
                        : 'Selecciona una ciudad'
            },
            ...cities.map((city) => ({ value: city, label: city }))
        ];
    }, [citiesByDepartment, loadingCities, value.department]);

    return (
        <div className={`colombia-location-select ${className}`.trim()}>
            <label className="colombia-location-select__field">
                <span>{departmentLabel}{required ? ' *' : ''}</span>
                <CustomSelect
                    value={value.department}
                    options={departmentOptions}
                    onChange={(department) => {
                        const nextDepartment = department.trim();
                        const nextValue = nextDepartment === value.department
                            ? value
                            : { department: nextDepartment, city: '' };
                        onChange(nextValue);
                    }}
                    ariaLabel={departmentLabel}
                    disabled={disabled || loadingDepartments}
                />
            </label>
            <label className="colombia-location-select__field">
                <span>{cityLabel}{required ? ' *' : ''}</span>
                <CustomSelect
                    value={value.city}
                    options={cityOptions}
                    onChange={(city) => onChange({ department: value.department, city })}
                    ariaLabel={cityLabel}
                    disabled={disabled || !value.department || loadingCities}
                />
            </label>
            {error ? (
                <div className="colombia-location-select__error">
                    <span>{error}</span>
                    <button
                        type="button"
                        onClick={() => {
                            setDepartments([]);
                            setCitiesByDepartment({});
                            setError(null);
                            setReloadToken((prev) => prev + 1);
                        }}
                    >
                        Reintentar
                    </button>
                </div>
            ) : null}
        </div>
    );
}
