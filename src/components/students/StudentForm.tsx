import type { StudentFormProps } from './types';

/**
 * StudentForm Component
 * 
 * Handles both creating new students and editing existing ones.
 * 
 * Features:
 * - Name input (required)
 * - Email input (optional)
 * - Hourly rate input (optional)
 * - Form validation
 * - Submit and cancel actions
 */
export default function StudentForm({
  formData,
  editingStudent,
  onSubmit,
  onCancel,
  onChange,
}: StudentFormProps) {
  return (
    <div className="card students-form">
      <h3>{editingStudent ? 'Edit Student' : 'Add New Student'}</h3>
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

        {/* Form Actions */}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            {editingStudent ? 'Update Student' : 'Add Student'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

