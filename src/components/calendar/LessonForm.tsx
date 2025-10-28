import type { LessonFormProps } from './types';

/**
 * LessonForm Component
 * 
 * Handles both creating new lessons and editing existing ones.
 * 
 * Features:
 * - Student selection dropdown
 * - Date picker
 * - Time picker
 * - Duration selection (30, 45, 60, 90 minutes)
 * - Form validation (required fields)
 * - Submit and cancel actions
 */
export default function LessonForm({
  students,
  formData,
  editingLesson,
  onSubmit,
  onCancel,
  onChange,
}: LessonFormProps) {
  return (
    <div className="card lesson-form">
      <h3>{editingLesson ? 'Edit Lesson' : 'Schedule New Lesson'}</h3>
      <form onSubmit={onSubmit}>
        <div className="form-grid">
          {/* Student Selection */}
          <div className="form-group">
            <label className="label" htmlFor="student">Student *</label>
            <select
              id="student"
              className="input"
              value={formData.student_id}
              onChange={(e) => onChange({ student_id: e.target.value })}
              required
            >
              <option value="">Select a student</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Input */}
          <div className="form-group">
            <label className="label" htmlFor="date">Date *</label>
            <input
              id="date"
              type="date"
              className="input"
              value={formData.date}
              onChange={(e) => onChange({ date: e.target.value })}
              required
            />
          </div>

          {/* Time Input */}
          <div className="form-group">
            <label className="label" htmlFor="time">Time *</label>
            <input
              id="time"
              type="time"
              className="input"
              value={formData.time}
              onChange={(e) => onChange({ time: e.target.value })}
              required
            />
          </div>

          {/* Duration Selection */}
          <div className="form-group">
            <label className="label" htmlFor="duration">Duration (minutes) *</label>
            <select
              id="duration"
              className="input"
              value={formData.duration}
              onChange={(e) => onChange({ duration: e.target.value })}
              required
            >
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">60 minutes</option>
              <option value="90">90 minutes</option>
            </select>
          </div>
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            {editingLesson ? 'Update Lesson' : 'Schedule Lesson'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

