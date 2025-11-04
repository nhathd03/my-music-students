import type { Payment, Student } from '../../types/database';

/**
 * Payment with associated student information
 */
export interface PaymentWithStudent extends Payment {
  student?: Student;
}

/**
 * Lesson with basic info for payment selection
 * For recurring lessons, each occurrence appears as a separate item
 * but they all share the same lesson_id
 */
export interface LessonForPayment {
  id: number;
  date: string;  // The specific occurrence date
  duration: number;
  student_id: number;
  note: string | null;
}

/**
 * Form data for creating/editing a payment
 */
export interface PaymentFormData {
  student_id: string;
  selectedLessons: Array<{ id: number; date: string }>;  // NEW: Lesson occurrences this payment covers
  total_amount: string;          // Renamed from 'amount'
  method: string;
  date: string;
  notes: string;                 // NEW: Optional notes
}

/**
 * Props for payment-related components
 */
export interface PaymentFormProps {
  students: Student[];
  formData: PaymentFormData;
  editingPayment: Payment | null;
  unpaidLessons: LessonForPayment[];
  loadingLessons: boolean;
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

