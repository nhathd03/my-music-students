import type { Lesson, Student } from '../../types/database';

/**
 * Lesson with associated student information
 */
export interface LessonWithStudent extends Lesson {
  student?: Student;
}

/**
 * Form data for creating/editing a lesson
 */
export interface LessonFormData {
  student_id: string;
  date: string;
  time: string;
  duration: string;
  paid: boolean;
  recurrence_rule: string | null;
}

/**
 * Props for calendar-related components
 */
export interface LessonModalProps {
  students: Student[];
  formData: LessonFormData;
  editingLesson: Lesson | null;
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
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  onChange: (data: Partial<LessonFormData>) => void;
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
  onTogglePaid: (lesson: Lesson) => void;
}

export interface LessonPillProps {
  lesson: LessonWithStudent;
  onEdit: (lesson: Lesson) => void;
  onDelete: (lesson: Lesson) => void;
  onTogglePaid: (lesson: Lesson) => void;
}

