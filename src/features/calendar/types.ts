import type { Lesson, Student } from '../../types/database';

/**
 * Lesson with associated student information
 * The date field is added for display/comparison purposes (extracted from timestamp)
 */
export interface LessonWithStudent extends Lesson {
  student?: Student;
  paid?: boolean;  // Calculated from payment_items
}

/**
 * Form data for creating/editing a lesson
 */
export interface LessonFormData {
  student_id: string;
  date: string;
  time: string;
  duration: string;
  recurrence_rule: string | null;
  note: string | null;
}

/**
 * Props for calendar-related components
 */
export interface RecurrenceSettings {
  isRecurring: boolean;
  setIsRecurring: (isRecurring: boolean) => void;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  setFrequency: (frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY') => void;
  interval: number;
  setInterval: (interval: number) => void;
  endType: 'never' | 'until' | 'count';
  setEndType: (endType: 'never' | 'until' | 'count') => void;
  untilDate: string;
  setUntilDate: (untilDate: string) => void;
  occurrenceCount: number;
  setOccurrenceCount: (occurrenceCount: number) => void;
}

export interface LessonModalProps {
  students: Student[];
  formData: LessonFormData;
  editingLesson: Lesson | null;
  recurrence: RecurrenceSettings;
  hasFormChanged: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  onChange: (data: Partial<LessonFormData>) => void;
  onRequestClose?: () => void;
}

export interface CalendarNavigationProps {
  currentDate: Date;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
}

export interface CalendarGridProps {
  currentDate: Date;
  lessons: LessonWithStudent[];
  onDateClick: (date: Date) => void;
  onEditLesson: (lesson: Lesson) => void;
  onDeleteLesson: (lesson: Lesson) => void;
  onPayLesson: (lesson: LessonWithStudent) => void;
  onUnpayLesson?: (lesson: LessonWithStudent) => void;
  onLessonClick?: (lesson: LessonWithStudent) => void;
}

export interface LessonPillProps {
  lesson: LessonWithStudent;
  onEdit: (lesson: Lesson) => void;
  onDelete: (lesson: Lesson) => void;
  onPay: (lesson: LessonWithStudent) => void;
  onUnpay?: (lesson: LessonWithStudent) => void;
  onMobileClick?: () => void;
}

