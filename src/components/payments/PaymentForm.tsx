import type { PaymentFormProps } from './types';

/**
 * PaymentForm Component
 * 
 * Handles both creating new payments and editing existing ones.
 * 
 * Features:
 * - Student selection dropdown
 * - Amount input with decimal support
 * - Payment method selection (Cash, Check, Venmo, etc.)
 * - Date picker
 * - Form validation (required fields)
 * - Submit and cancel actions
 */
export default function PaymentForm({
  students,
  formData,
  editingPayment,
  onSubmit,
  onCancel,
  onChange,
}: PaymentFormProps) {
  return (
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

          {/* Amount Input */}
          <div className="form-group">
            <label className="label" htmlFor="amount">Amount ($) *</label>
            <input
              id="amount"
              type="number"
              step="0.01"
              className="input"
              value={formData.amount}
              onChange={(e) => onChange({ amount: e.target.value })}
              required
              placeholder="50.00"
            />
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
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">
            {editingPayment ? 'Update Payment' : 'Record Payment'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

