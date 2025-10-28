import type { Payment, Student } from '../../types/database';

/**
 * Payment with associated student information
 */
export interface PaymentWithStudent extends Payment {
  student?: Student;
}

/**
 * Form data for creating/editing a payment
 */
export interface PaymentFormData {
  student_id: string;
  amount: string;
  method: string;
  date: string;
}

/**
 * Props for payment-related components
 */
export interface PaymentFormProps {
  students: Student[];
  formData: PaymentFormData;
  editingPayment: Payment | null;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  onChange: (data: Partial<PaymentFormData>) => void;
}

export interface PaymentSummaryProps {
  totalAmount: number;
  paymentCount: number;
}

export interface PaymentFilterProps {
  students: Student[];
  selectedStudent: string;
  onFilterChange: (studentId: string) => void;
}

export interface PaymentTableProps {
  payments: PaymentWithStudent[];
  onEdit: (payment: Payment) => void;
  onDelete: (id: number) => void;
}

