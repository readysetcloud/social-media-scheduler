// Modal.jsx
import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import './Modal.css';

const Modal = ({ isOpen, onClose, children, customClass = '' }) => {
  const modalRef = useRef(null);

  const handleClickOutside = (event) => {
    if (modalRef.current && !modalRef.current.contains(event.target)) {
      onClose();
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      onClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const modalRoot = document.getElementById('modal-root');

  return ReactDOM.createPortal(
    <div className="modal-overlay">
      <div className={`modal-content ${customClass}`} ref={modalRef}>
        {children}
      </div>
    </div>,
    modalRoot
  );
};

export default Modal;
