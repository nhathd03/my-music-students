/**
 * Lesson Service Types
 * Type definitions for lesson operations
 */

export type LessonInsertData = {
  student_id: number;
  date: string;
  duration: number;
  note?: string | null;
  recurrence_rule?: string | null;
};

