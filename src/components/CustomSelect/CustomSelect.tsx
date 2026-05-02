import { useEffect, useMemo, useRef, useState } from 'react';
import './CustomSelect.css';

export type CustomSelectOption = {
    value: string;
    label: string;
};

interface CustomSelectProps {
    value: string;
    options: readonly CustomSelectOption[];
    onChange: (value: string) => void;
    ariaLabel: string;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export function CustomSelect({
    value,
    options,
    onChange,
    ariaLabel,
    placeholder = 'Selecciona una opcion',
    disabled = false,
    className = ''
}: Readonly<CustomSelectProps>) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);

    const selectedOption = useMemo(
        () => options.find((option) => option.value === value) ?? null,
        [options, value]
    );

    useEffect(() => {
        const handleOutside = (event: MouseEvent) => {
            if (!containerRef.current) return;
            if (!containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    }, []);

    const handleSelect = (nextValue: string) => {
        onChange(nextValue);
        setOpen(false);
    };

    return (
        <div className={`global-select ${open ? 'is-open' : ''} ${className}`.trim()} ref={containerRef}>
            <button
                type="button"
                className="global-select-trigger"
                onClick={() => setOpen((prev) => !prev)}
                aria-label={ariaLabel}
                aria-haspopup="listbox"
                aria-expanded={open}
                disabled={disabled}
            >
                <span>{selectedOption?.label ?? placeholder}</span>
                <span className={`global-select-icon ${open ? 'open' : ''}`} aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                        <path d="m7 10 5 5 5-5" />
                    </svg>
                </span>
            </button>

            <div className={`global-select-menu ${open ? 'is-open' : ''}`} role="listbox" aria-label={ariaLabel}>
                {options.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        role="option"
                        aria-selected={option.value === value}
                        className={`global-select-option ${option.value === value ? 'is-selected' : ''}`}
                        onClick={() => handleSelect(option.value)}
                    >
                        {option.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
