import { X } from 'lucide-react';
import '../styles/Modal.css';

/**
 * ConfirmationModal Component
 * 
 * A reusable modal for confirmation dialogs (unsaved changes, delete confirmations, etc.)
 */
interface ConfirmationModalProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'default';
}

export default function ConfirmationModal({
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'default',
}: ConfirmationModalProps) {
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content confirmation-modal" onClick={(e) => e.stopPropagation()}>
        <div className="card">
          <div className="modal-header">
            <h3>{title}</h3>
            <button
              type="button"
              className="modal-close-btn"
              onClick={onCancel}
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
          
          <p className="confirmation-message">{message}</p>
          
          <div className="confirmation-actions">
            <button
              type="button"
              className={`btn ${variant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
              onClick={onConfirm}
            >
              {confirmText}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
            >
              {cancelText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

