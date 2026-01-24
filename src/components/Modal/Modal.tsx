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

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            setIsClosing(false);
            return;
        }

        if (isVisible) {
            setIsClosing(true);
            const timeout = setTimeout(() => {
                setIsVisible(false);
                setIsClosing(false);
            }, 200);

            return () => clearTimeout(timeout);
        }
    }, [isOpen, isVisible]);

    if (!isVisible) return null;

    return (
        <div className={`modal-overlay ${isClosing ? 'is-closing' : ''}`} onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose}>&times;</button>
                {children}
            </div>
        </div>
    );
};
