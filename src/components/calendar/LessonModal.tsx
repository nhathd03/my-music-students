import type { LessonModalProps } from './types';

/**
 * LessonModal Component
 * 
 * Handles both creating new lessons and editing existing ones.
 * 
 * Features:
 * - Student selection dropdown
 * - Date picker
 * - Time picker
 * - Duration selection (30, 45, 60, 90 minutes)
 * - Recurring event options with RRULE generation
 * - Form validation (required fields)
 * - Submit and cancel actions
 */
export default function LessonModal({
  students,
  formData,
  editingLesson,
  isRecurring,
  setIsRecurring,
  frequency,
  setFrequency,
  interval,
  setInterval,
  endType,
  setEndType,
  untilDate,
  setUntilDate,
  occurrenceCount,
  setOccurrenceCount,
  onSubmit,
  onCancel,
  onChange,
}: LessonModalProps) {

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
            <input
              id="duration"
              className="input"
              value={formData.duration}
              onChange={(e) => onChange({ duration: e.target.value })}
              required
              type="number"
              min="30"
            />
          </div>

          {/* Paid Status */}
          <div className="form-group">
            <label className="label paid-label">
              <input
                type="checkbox"
                checked={formData.paid}
                onChange={(e) => onChange({ paid: e.target.checked })}
                className="paid-checkbox"
              />
              <span>Paid</span>
            </label>
          </div>
        </div>

        {/* Recurring Event Section */}
        <div className="recurring-section">
          <div className="recurring-header">
            <label className="label recurring-label">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="recurring-checkbox"
              />
              <span>Recurring Event</span>
            </label>
          </div>

          {isRecurring && (
            <div className="recurring-options">
              {/* Frequency and Interval */}
              <div className="recurrence-pattern">
                <label className="label">Repeat every</label>
                <div className="pattern-inputs">
                  <input
                    type="number"
                    min={1}
                    max={99}
                    className="input interval-input"
                    value={interval}
                    onChange={(e) => setInterval(Number(e.target.value))}
                  />
                  <select
                    className="input frequency-select"
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as 'DAILY' | 'WEEKLY' | 'MONTHLY')}
                  >
                    <option value="DAILY">Day(s)</option>
                    <option value="WEEKLY">Week(s)</option>
                    <option value="MONTHLY">Month(s)</option>
                  </select>
                </div>
              </div>

              {/* End Condition */}
              <div className="end-condition-section">
                <label className="label">Ends</label>
                <div className="end-options">
                  {/* Never */}
                  <label className="end-option">
                    <input
                      type="radio"
                      name="endType"
                      value="never"
                      checked={endType === 'never'}
                      onChange={(e) => setEndType(e.target.value as 'never')}
                    />
                    <span>Never</span>
                  </label>

                  {/* Until Date */}
                  <label className="end-option">
                    <input
                      type="radio"
                      name="endType"
                      value="until"
                      checked={endType === 'until'}
                      onChange={(e) => setEndType(e.target.value as 'until')}
                    />
                    <span>On</span>
                    <input
                      type="date"
                      className="input date-input"
                      value={untilDate}
                      onChange={(e) => {
                        setUntilDate(e.target.value);
                        setEndType('until');
                      }}
                      disabled={endType !== 'until'}
                    />
                  </label>

                  {/* After X Occurrences */}
                  <label className="end-option">
                    <input
                      type="radio"
                      name="endType"
                      value="count"
                      checked={endType === 'count'}
                      onChange={(e) => setEndType(e.target.value as 'count')}
                    />
                    <span>After</span>
                    <input
                      type="number"
                      min={1}
                      max={999}
                      className="input count-input"
                      value={occurrenceCount}
                      onChange={(e) => {
                        setOccurrenceCount(Number(e.target.value));
                        setEndType('count');
                      }}
                      disabled={endType !== 'count'}
                    />
                    <span>occurrence(s)</span>
                  </label>
                </div>
              </div>
            </div>
          )}
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
