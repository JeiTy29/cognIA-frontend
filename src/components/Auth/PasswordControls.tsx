import type { ChangeEventHandler } from 'react';
import type { PasswordCheck } from '../../utils/passwordRules';

type PasswordVisibilityIconProps = Readonly<{
    visible: boolean;
}>;

type PasswordFieldProps = Readonly<{
    value: string;
    visible: boolean;
    placeholder: string;
    disabled?: boolean;
    required?: boolean;
    errorMessage?: string;
    statusMessage?: string;
    statusVariant?: 'error' | 'success';
    ariaLabelWhenVisible: string;
    ariaLabelWhenHidden: string;
    onChange: ChangeEventHandler<HTMLInputElement>;
    onToggle: () => void;
}>;

type PasswordChecklistProps = Readonly<{
    checks: PasswordCheck[];
    title?: string;
}>;

export function PasswordVisibilityIcon({ visible }: PasswordVisibilityIconProps) {
    if (visible) {
        return (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
            </svg>
        );
    }

    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
        </svg>
    );
}

export function PasswordField({
    value,
    visible,
    placeholder,
    disabled = false,
    required = false,
    errorMessage = '',
    statusMessage = '',
    statusVariant = 'success',
    ariaLabelWhenVisible,
    ariaLabelWhenHidden,
    onChange,
    onToggle
}: PasswordFieldProps) {
    const statusClassName = statusVariant === 'error' ? 'validation-error' : 'validation-success';

    return (
        <div className="form-group password-group">
            <input
                type={visible ? 'text' : 'password'}
                className="form-input"
                placeholder={placeholder}
                value={value}
                onChange={onChange}
                disabled={disabled}
                required={required}
            />
            <button
                type="button"
                className="password-toggle"
                onClick={onToggle}
                disabled={disabled}
                aria-label={visible ? ariaLabelWhenVisible : ariaLabelWhenHidden}
            >
                <PasswordVisibilityIcon visible={visible} />
            </button>
            {statusMessage ? <div className={statusClassName}>{statusMessage}</div> : null}
            {errorMessage ? <div className="validation-error">{errorMessage}</div> : null}
        </div>
    );
}

export function PasswordChecklist({ checks, title = 'Requisitos de contraseña' }: PasswordChecklistProps) {
    return (
        <div className="password-checklist">
            <span className="password-checklist-title">{title}</span>
            <div className="password-checklist-grid">
                {checks.map((check) => (
                    <div key={check.id} className={`password-check ${check.valid ? 'is-valid' : 'is-invalid'}`}>
                        <span className="password-check-indicator" aria-hidden="true">
                            {check.valid ? '✓' : '•'}
                        </span>
                        <span>{check.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
