import { DollarSign } from 'lucide-react';
import type { PaymentSummaryProps } from './types';

/**
 * PaymentSummary Component
 * 
 * Displays a summary card showing:
 * - Total amount received
 * - Number of payments
 * 
 * This provides a quick overview of payment statistics.
 */
export default function PaymentSummary({ totalAmount, paymentCount }: PaymentSummaryProps) {
  return (
    <div className="payment-summary">
      <div className="summary-card">
        <div className="summary-icon">
          <DollarSign size={24} />
        </div>
        <div className="summary-content">
          <p className="summary-label">Total Received</p>
          <h3 className="summary-value">${totalAmount.toFixed(2)}</h3>
          <p className="summary-info">
            {paymentCount} payment{paymentCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </div>
  );
}

