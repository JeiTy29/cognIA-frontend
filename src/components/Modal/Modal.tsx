import React, { useEffect, useState } from 'react';
import './Modal.css';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
    const [isVisible, setIsVisible] = useState(isOpen);
    const [isClosing, setIsClosing] = useState(false);
    const [isOpening, setIsOpening] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const openTimer = window.setTimeout(() => {
                setIsVisible(true);
                setIsClosing(false);
                setIsOpening(true);
            }, 0);
            const openEndTimer = window.setTimeout(() => setIsOpening(false), 420);
            return () => {
                window.clearTimeout(openTimer);
                window.clearTimeout(openEndTimer);
            };
        }

        if (isVisible) {
            const closeTimer = window.setTimeout(() => {
                setIsClosing(true);
            }, 0);
            const closeEndTimer = window.setTimeout(() => {
                setIsVisible(false);
                setIsClosing(false);
            }, 380);
            return () => {
                window.clearTimeout(closeTimer);
                window.clearTimeout(closeEndTimer);
            };
        }
        return undefined;
    }, [isOpen, isVisible]);

    if (!isVisible) return null;

    return (
        <div className={`modal-overlay ${isClosing ? 'is-closing' : ''} ${isOpening ? 'is-opening' : ''}`} onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>&times;</button>
                {children}
            </div>
        </div>
    );
};
