import { X } from 'lucide-react';
import { useMemo } from 'react';
import type { LessonModalProps } from './types';

export default function LessonModal({
  students,
  formData,
  editingLesson,
  recurrence,
  hasFormChanged,
  hasRecurrenceOptionsChanged,
  getLastOccurrence,
  onSubmit,
  onCancel,
  onChange,
  onRequestClose,
}: LessonModalProps) {

  const {
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
  } = recurrence;

  // Calculate the last occurrence date when editing a recurring lesson
  const calculatedLastOccurrence = useMemo(() => {
    if (!editingLesson?.recurrence_rule) return null;
    return getLastOccurrence(editingLesson.recurrence_rule);
  }, [editingLesson?.recurrence_rule, getLastOccurrence]);

  // When editing a lesson with occurrence count, we show it as "until" date
  // The endType will be 'count' from the original rule, but we display the last occurrence date
  const displayEndType = editingLesson && endType === 'count' ? 'until' : endType;
  const displayUntilDate = editingLesson && endType === 'count' && calculatedLastOccurrence 
    ? calculatedLastOccurrence 
    : untilDate;

  const handleClose = () => {
    if (onRequestClose) {
      onRequestClose();
    } else {
      onCancel();
    }
  };

  return (
    <div className="card lesson-form">
      <div className="modal-header">
        <h3>{editingLesson ? 'Edit Lesson' : 'Schedule New Lesson'}</h3>
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
          {/* Student Selection */}
          <div className="form-group">
            <label className="label" htmlFor="student">Student *</label>
            <select
              id="student"
              className="input"
              value={formData.student_id}
              onChange={(e) => onChange({ student_id: e.target.value })}
              disabled={!!editingLesson}
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
              {/* Warning message when editing recurring lesson and recurrence options have changed */}
              {editingLesson && hasRecurrenceOptionsChanged && (
                <div className="recurrence-warning">
                  ⚠️ Changing the recurrence will update all future entries.
                </div>
              )}
              
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
                      checked={displayEndType === 'never'}
                      onChange={(e) => setEndType(e.target.value as 'never')}
                    />
                    <span>Never</span>
                  </label>

                  {/* Until Date - When editing with count, show the calculated last occurrence */}
                  <label className="end-option">
                    <input
                      type="radio"
                      name="endType"
                      value="until"
                      checked={displayEndType === 'until'}
                      onChange={(e) => setEndType(e.target.value as 'until')}
                    />
                    <span>On</span>
                    <input
                      type="date"
                      className="input date-input"
                      value={displayUntilDate || ''}
                      onChange={(e) => {
                        setUntilDate(e.target.value);
                        setEndType('until');
                      }}
                      disabled={displayEndType !== 'until'}
                    />
                  </label>

                  {/* After X Occurrences - Only show when creating, hide when editing */}
                  {!editingLesson && (
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
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Note Field */}
        <div className="form-group lesson-note-field">
          <label className="label" htmlFor="note">Note (Optional)</label>
          <textarea
            id="note"
            className="input lesson-note-textarea"
            value={formData.note || ''}
            onChange={(e) => onChange({ note: e.target.value || null })}
            placeholder="Add a note for this lesson..."
            rows={3}
          />
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={!!editingLesson && !hasFormChanged}
            title={editingLesson && !hasFormChanged ? 'No changes to save' : ''}
          >
            {editingLesson ? 'Update Lesson' : 'Schedule Lesson'}
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
  );
}