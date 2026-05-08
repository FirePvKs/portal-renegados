import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Modal renderizado via portal directamente en document.body,
 * evitando que cualquier stacking context del padre (fade-in-up, transform, etc.)
 * rompa el posicionamiento fixed.
 */
export default function Modal({ onClose, children, maxWidth = 'max-w-2xl' }) {
  // Bloquear scroll del body mientras el modal está abierto
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 bg-ink-900/80 backdrop-blur-sm z-50 overflow-y-auto px-4 py-8"
      onClick={onClose}
    >
      <div
        className={`shinobi-card-dark w-full ${maxWidth} mx-auto fade-in-up`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
