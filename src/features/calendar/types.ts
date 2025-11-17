import React from 'react';
import type { Lesson, Student } from '../../types/database';

/**
 * Lesson with associated student information
 * The date field is added for display/comparison purposes (extracted from timestamp)
 */
export interface LessonWithStudent extends Lesson {
  initialDate?: string; //for recurring lessons
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
  untilDate: string | null;
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
  hasRecurrenceOptionsChanged: boolean;
  getLastOccurrence: (rruleString: string) => string | null;
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

export interface CalendarContextValue {
  navigation: {
    currentDate: Date;
  };
  data: {
    lessons: LessonWithStudent[];
    students: Student[];
    loading: boolean;
  };
  form: {
    showForm: boolean;
  };
  modals: {
    showConfirmDiscard: boolean;
    showConfirmDelete: boolean;
    showRecurringEditModal: boolean;
    showRecurrenceChangeConfirm: boolean;
    pendingDeleteLesson: Lesson | null;
    pendingDeleteScope: 'single' | 'future' | null;
    recurringEditScope: 'single' | 'future' | null;
    recurringAction: 'edit' | 'delete' | null;
  };
  dispatch: React.Dispatch<any>;
  goToPreviousMonth: () => void;
  goToNextMonth: () => void;
  refetch: () => Promise<void>;
  recurrence: {
    isRecurring: boolean;
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    interval: number;
    endType: 'never' | 'until' | 'count';
    untilDate: string | null;
    occurrenceCount: number;
  };
  setIsRecurring: (enabled: boolean) => void;
  setFrequency: (frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY') => void;
  setInterval: (interval: number) => void;
  setEndType: (endType: 'never' | 'until' | 'count') => void;
  setUntilDate: (date: string) => void;
  setOccurrenceCount: (count: number) => void;
  loadFromRRule: (rrule: string) => void;
  generateRRuleString: (date: string, time: string) => string | null;
  getLastOccurrence: (rruleString: string) => string | null;
  hasFutureOccurrences: (lesson: Lesson) => boolean;
  reset: () => void;
  formData: LessonFormData;
  editingLesson: Lesson | null;
  showForm: () => void;
  hideForm: () => void;
  loadFormData: (data: LessonFormData, lesson?: Lesson) => void;
  updateFormData: (data: Partial<LessonFormData>) => void;
  hasFormChanged: () => boolean;
  hasRecurrenceChanged: () => boolean;
  hasRecurrenceOptionsChanged: () => boolean;
  resetForm: () => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleEdit: (lesson: Lesson) => void;
  handleDelete: (lesson: Lesson) => void;
  handleConfirmDelete: () => Promise<void>;
  handleDateClick: (date: Date) => void;
  handleRequestClose: () => void;
  handleConfirmDiscard: () => void;
  handlePayLesson: (lesson: LessonWithStudent) => void;
  handleUnpayLesson: (lesson: LessonWithStudent) => Promise<void>;
  setRecurringEditScope: (scope: 'single' | 'future' | null) => void;
  resetRecurringState: () => void;
  handleConfirmRecurrenceChange: () => Promise<void>;
  handleCancelRecurrenceChange: () => void;
}

