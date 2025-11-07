import type { Student } from '../../types/database';

/**
 * Form data for creating/editing a student
 */
export interface StudentFormData {
  name: string;
  email: string;
  rate: string;
  description: string;
}

/**
 * Props for student-related components
 */
export interface StudentFormProps {
  formData: StudentFormData;
  editingStudent: Student | null;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  onChange: (data: Partial<StudentFormData>) => void;
  hasUnsavedChanges?: boolean;
  onRequestClose?: () => void;
}

export interface StudentCardProps {
  student: Student;
  onEdit: (student: Student) => void;
  onDelete: (id: number) => void;
}

export interface StudentListProps {
  students: Student[];
  onEdit: (student: Student) => void;
  onDelete: (id: number) => void;
}

