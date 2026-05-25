import type { ActiveFilterChip } from '../../utils/questionnaires/dashboardTransform';
import './ActiveFilterChips.css';

interface ActiveFilterChipsProps {
    chips: ActiveFilterChip[];
    onRemove?: (key: string) => void;
}

export function ActiveFilterChips({ chips, onRemove }: Readonly<ActiveFilterChipsProps>) {
    if (chips.length === 0) return null;

    return (
        <div className="active-filter-chips" aria-label="Filtros activos">
            {chips.map((chip) => (
                <button
                    type="button"
                    key={`${chip.key}-${chip.value}`}
                    className="active-filter-chip"
                    onClick={() => onRemove?.(chip.key)}
                >
                    <strong>{chip.label}:</strong> {chip.value}
                </button>
            ))}
        </div>
    );
}
