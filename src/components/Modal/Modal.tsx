import { useEffect, useId, useState, type ReactNode } from 'react';
import './Modal.css';

type ModalProps = Readonly<{
    isOpen: boolean;
    onClose: () => void;
    children: ReactNode;
}>;

export function Modal({ isOpen, onClose, children }: ModalProps) {
    const [isVisible, setIsVisible] = useState(isOpen);
    const [isClosing, setIsClosing] = useState(false);
    const [isOpening, setIsOpening] = useState(false);
    const dialogTitleId = useId();

    useEffect(() => {
        if (isOpen) {
            const openTimer = globalThis.setTimeout(() => {
                setIsVisible(true);
                setIsClosing(false);
                setIsOpening(true);
            }, 0);
            const openEndTimer = globalThis.setTimeout(() => setIsOpening(false), 420);
            return () => {
                globalThis.clearTimeout(openTimer);
                globalThis.clearTimeout(openEndTimer);
            };
        }

        if (isVisible) {
            const closeTimer = globalThis.setTimeout(() => {
                setIsClosing(true);
            }, 0);
            const closeEndTimer = globalThis.setTimeout(() => {
                setIsVisible(false);
                setIsClosing(false);
            }, 380);
            return () => {
                globalThis.clearTimeout(closeTimer);
                globalThis.clearTimeout(closeEndTimer);
            };
        }
        return undefined;
    }, [isOpen, isVisible]);

    if (!isVisible) return null;

    return (
        <div className={`modal-overlay ${isClosing ? 'is-closing' : ''} ${isOpening ? 'is-opening' : ''}`}>
            <button
                type="button"
                className="modal-backdrop"
                aria-label="Cerrar modal"
                onClick={onClose}
            />
            <div
                className="modal-content"
                role="dialog"
                aria-modal="true"
                aria-labelledby={dialogTitleId}
            >
                <span id={dialogTitleId} className="modal-visually-hidden">
                    Contenido modal
                </span>
                <button type="button" className="modal-close" aria-label="Cerrar modal" onClick={onClose}>
                    &times;
                </button>
                {children}
            </div>
        </div>
    );
}
