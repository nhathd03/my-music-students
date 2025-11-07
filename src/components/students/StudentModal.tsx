import { X } from 'lucide-react';
import type { StudentFormProps } from './types';

/**
 * StudentModal Component (Modal)
 * 
 * Handles both creating new students and editing existing ones.
 * 
 * Features:
 * - Name input (required)
 * - Email input (optional)
 * - Hourly rate input (optional)
 * - Description textarea (optional)
 * - Form validation
 * - Submit and cancel actions
 */
export default function StudentModal({
  formData,
  editingStudent,
  onSubmit,
  onCancel,
  onChange,
  hasUnsavedChanges: _hasUnsavedChanges,
  onRequestClose,
}: StudentFormProps) {

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleClose = () => {
    if (onRequestClose) {
      onRequestClose();
    } else {
      onCancel();
    }
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="card students-form">
          <div className="modal-header">
          <h3>{editingStudent ? 'Edit Student' : 'Add New Student'}</h3>
            <button
              type="button"
              className="modal-close-btn"
              onClick={handleClose}
              title="Close"
            >
              <X size={20} />
            </button>
          </div>
          <form onSubmit={onSubmit}>
            <div className="form-grid">
              {/* Name Input */}
              <div className="form-group">
                <label className="label" htmlFor="name">Name *</label>
                <input
                  id="name"
                  type="text"
                  className="input"
                  value={formData.name}
                  onChange={(e) => onChange({ name: e.target.value })}
                  required
                  placeholder="Student name"
                />
              </div>

              {/* Email Input */}
              <div className="form-group">
                <label className="label" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  className="input"
                  value={formData.email}
                  onChange={(e) => onChange({ email: e.target.value })}
                  placeholder="student@email.com"
                />
              </div>

              {/* Hourly Rate Input */}
              <div className="form-group">
                <label className="label" htmlFor="rate">Hourly Rate ($)</label>
                <input
                  id="rate"
                  type="number"
                  step="0.01"
                  className="input"
                  value={formData.rate}
                  onChange={(e) => onChange({ rate: e.target.value })}
                  placeholder="50.00"
                />
              </div>
            </div>

            {/* Description Textarea */}
            <div className="form-group student-form-description">
              <label className="label" htmlFor="description">Description</label>
              <textarea
                id="description"
                className="input"
                value={formData.description}
                onChange={(e) => onChange({ description: e.target.value })}
                placeholder="Additional notes about the student..."
                rows={4}
              />
            </div>

            {/* Form Actions */}
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                {editingStudent ? 'Update Student' : 'Add Student'}
              </button>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={onRequestClose || onCancel}
          >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

