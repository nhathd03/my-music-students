import { format } from 'date-fns';
import type { PaymentFormProps, LessonForPayment } from './types';

/**
 * PaymentForm Component (with Modal)
 * 
 * Handles both creating new payments and editing existing ones.
 * This component is designed to be used within the PaymentModal.
 * 
 * - Shows unpaid lessons for selected student
 * - Allows selecting multiple lessons with checkboxes
 * - Auto-calculates total based on selected lessons (for now, assumes fixed rate)
 * - Links lessons to payment via payment_items table
 */
export default function PaymentForm({
  students,
  formData,
  editingPayment,
  unpaidLessons,
  loadingLessons,
  onSubmit,
  onCancel,
  onChange,
}: PaymentFormProps) {
  
  /**
   * Handle clicking on the overlay (outside the modal content)
   * This closes the modal for better UX
   */
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  /**
   * Toggle lesson selection (by id + date for recurring lessons)
   */
  const toggleLessonSelection = (lessonId: number, lessonDate: string) => {
    const isSelected = formData.selectedLessons.some(
      l => l.id === lessonId && l.date === lessonDate
    );
    
    const newSelectedLessons = isSelected
      ? formData.selectedLessons.filter(l => !(l.id === lessonId && l.date === lessonDate))
      : [...formData.selectedLessons, { id: lessonId, date: lessonDate }];
    
    // Calculate total based on student rate and lesson durations
    const student = students.find(s => s.id === parseInt(formData.student_id));
    
    let totalAmount = '0';
    if (student && student.rate) {
      // Sum up all selected lessons: (rate per hour / 60) * duration in minutes
      const total = newSelectedLessons.reduce((sum, selectedLesson) => {
        const lesson = unpaidLessons.find(
          l => l.id === selectedLesson.id && l.date === selectedLesson.date
        );
        if (lesson) {
          return sum + (student.rate! / 60) * lesson.duration;
        }
        return sum;
      }, 0);
      
      totalAmount = total.toFixed(2);
    }
    
    // Update both fields in a single call to avoid race conditions
    onChange({ 
      selectedLessons: newSelectedLessons,
      total_amount: totalAmount 
    });
  };

  /**
   * Check if a specific lesson occurrence is selected
   * Normalizes dates to ISO format for comparison to handle format differences
   */
  const isLessonSelected = (lessonId: number, lessonDate: string): boolean => {
    const lessonDateISO = new Date(lessonDate).toISOString();
    return formData.selectedLessons.some(l => {
      const selectedDateISO = new Date(l.date).toISOString();
      return l.id === lessonId && selectedDateISO === lessonDateISO;
    });
  };

  /**
   * Format lesson display
   */
  const formatLesson = (lesson: LessonForPayment): string => {
    const date = new Date(lesson.date);
    const dateStr = format(date, 'MMM d, yyyy');
    const timeStr = format(date, 'h:mm a');
    return `${dateStr} - ${timeStr} (${lesson.duration} min)`;
  };

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        <div className="card payment-form">
          <h3>{editingPayment ? 'Edit Payment' : 'Record New Payment'}</h3>
          <form onSubmit={onSubmit}>
            <div className="form-grid">
              {/* Student Selection */}
              <div className="form-group">
                <label className="label" htmlFor="student">Student *</label>
                <select
                  id="student"
                  className="input"
                  value={formData.student_id}
                  onChange={(e) => onChange({ student_id: e.target.value, selectedLessons: [], total_amount: '' })}
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

              {/* Payment Method */}
              <div className="form-group">
                <label className="label" htmlFor="method">Payment Method</label>
                <select
                  id="method"
                  className="input"
                  value={formData.method}
                  onChange={(e) => onChange({ method: e.target.value })}
                >
                  <option value="">Select method</option>
                  <option value="Cash">Cash</option>
                  <option value="Check">Check</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Venmo">Venmo</option>
                  <option value="PayPal">PayPal</option>
                  <option value="Zelle">Zelle</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </div>

              {/* Date Picker */}
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

              {/* Total Amount */}
              <div className="form-group">
                <label className="label" htmlFor="amount">Total Amount ($)</label>
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  className="input"
                  value={formData.total_amount}
                  onChange={(e) => onChange({ total_amount: e.target.value || '0' })}
                  required
                  placeholder="0"
                />
              </div>
            </div>

            {/* Notes Field */}
            <div className="form-group payment-form-group-spaced">
              <label className="label" htmlFor="notes">Notes (Optional)</label>
              <textarea
                id="notes"
                className="input payment-form-textarea"
                value={formData.notes}
                onChange={(e) => onChange({ notes: e.target.value })}
                placeholder="e.g., January lessons"
                rows={2}
              />
            </div>

            {/* Unpaid Lessons Section */}
            {formData.student_id && (
              <div className="payment-lessons-section">
                <label className="label payment-lessons-label">
                  Select Lessons for This Payment *
                </label>
                
                {loadingLessons ? (
                  <p className="payment-loading-text">
                    Loading lessons...
                  </p>
                ) : unpaidLessons.length === 0 ? (
                  <p className="payment-loading-text">
                    No unpaid lessons found for this student.
                  </p>
                ) : (
                  <div className="payment-lessons-list">
                    {unpaidLessons.map((lesson, index) => {
                      const isSelected = isLessonSelected(lesson.id, lesson.date);
                      return (
                        <label
                          key={`${lesson.id}-${lesson.date}-${index}`}
                          className={`payment-lesson-item ${isSelected ? 'selected' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleLessonSelection(lesson.id, lesson.date)}
                            className="payment-lesson-checkbox"
                          />
                          <span className="payment-lesson-text">
                            {formatLesson(lesson)}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
                
                {formData.selectedLessons.length > 0 && (
                  <p className="payment-selected-count">
                    Selected: {formData.selectedLessons.length} lesson(s)
                  </p>
                )}
              </div>
            )}

            {/* Form Actions */}
            <div className="form-actions payment-form-actions-spaced">
              <button type="submit" className="btn btn-primary">
                {editingPayment ? 'Update Payment' : 'Record Payment'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={onCancel}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
