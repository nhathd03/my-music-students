import { format } from 'date-fns';
import { Edit2, Trash2, Calendar } from 'lucide-react';
import type { PaymentTableProps } from './types';

/**
 * PaymentTable Component
 * 
 * Displays all payments in a tabular format with:
 * - Student name
 * - Payment amount (formatted as currency)
 * - Payment method (if provided)
 * - Date (formatted)
 * - Action buttons (Edit/Delete)
 * 
 * Shows an empty state when no payments are available.
 */
export default function PaymentTable({ payments, onEdit, onDelete }: PaymentTableProps) {
  // Empty state
  if (payments.length === 0) {
    return (
      <div className="card payments-empty">
        <p>No payments recorded yet. Add your first payment to get started!</p>
      </div>
    );
  }

  // Table view
  return (
    <div className="card payments-table-container">
      <table className="payments-table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Amount</th>
            <th>Method</th>
            <th>Date</th>
            <th>Notes</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((payment) => (
            <tr key={payment.id}>
              {/* Student Name */}
              <td>
                <div className="student-cell">
                  <strong>{payment.student?.name}</strong>
                </div>
              </td>

              {/* Amount */}
              <td>
                <span className="amount-cell">
                  ${parseFloat(payment.total_amount.toString()).toFixed(2)}
                </span>
              </td>

              {/* Payment Method */}
              <td>
                {payment.method ? (
                  <span className="badge badge-method">{payment.method}</span>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </td>

              {/* Date */}
              <td>
                <div className="date-cell">
                  <Calendar size={14} />
                  {format(new Date(payment.date), 'MMM d, yyyy')}
                </div>
              </td>

              {/* Notes */}
              <td>
                {payment.notes ? (
                  <span className="payment-table-notes">
                    {payment.notes}
                  </span>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </td>

              {/* Action Buttons */}
              <td>
                <div className="table-actions">
                  <button
                    className="icon-btn"
                    onClick={() => onEdit(payment)}
                    title="Edit payment"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    className="icon-btn icon-btn-danger"
                    onClick={() => onDelete(payment.id)}
                    title="Delete payment"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

