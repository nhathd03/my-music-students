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
}

/**
 * Props for calendar-related components
 */
export interface LessonFormProps {
  students: Student[];
  formData: LessonFormData;
  editingLesson: Lesson | null;
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
  onDeleteLesson: (id: number) => void;
  onTogglePaid: (lesson: Lesson) => void;
}

export interface LessonPillProps {
  lesson: LessonWithStudent;
  onEdit: (lesson: Lesson) => void;
  onDelete: (id: number) => void;
  onTogglePaid: (lesson: Lesson) => void;
}

