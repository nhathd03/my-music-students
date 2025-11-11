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
  onRequestClose?: () => void;
}

export interface PaymentSummaryProps {
  totalAmount: number;
  paymentCount: number;
}

/**
 * Payment filter criteria
 */
export interface PaymentFilters {
  studentSearch: string;  // Search query for student name
  studentId: string;      // Selected student ID (or 'all')
  dateFrom: string;        // Filter payments from this date (yyyy-MM-dd)
  dateTo: string;          // Filter payments until this date (yyyy-MM-dd)
  method: string;          // Payment method filter (or 'all')
  amountMin: string;       // Minimum amount
  amountMax: string;       // Maximum amount
}

export interface PaymentFilterProps {
  students: Student[];
  filters: PaymentFilters;
  onFilterChange: (filters: Partial<PaymentFilters>) => void;
  onClearFilters: () => void;
}

export interface PaymentTableProps {
  payments: PaymentWithStudent[];
  onEdit: (payment: Payment) => void;
  onDelete: (id: number) => void;
}

