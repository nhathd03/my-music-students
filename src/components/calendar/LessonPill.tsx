import { format } from 'date-fns';
import { Edit2, Trash2, CheckCircle } from 'lucide-react';
import type { LessonPillProps } from './types';

/**
 * Converts a UTC date string from the database to a local Date object
 */
function parseUTCDate(dateString: string): Date {
  if (dateString.includes('Z') || dateString.includes('+') || dateString.includes('-', 10)) {
    return new Date(dateString);
  }
  return new Date(dateString + 'Z');
}

/**
 * LessonPill Component
 * 
 * Displays an individual lesson as a "pill" in the calendar day.
 * 
 * Features:
 * - Shows lesson time and student name
 * - Color-coded by payment status (blue = unpaid, green = paid)
 * - Action buttons: mark as paid, edit, delete
 * - Hover effect to show actions
 */
export default function LessonPill({
  lesson,
  onEdit,
  onDelete,
  onTogglePaid,
}: LessonPillProps) {
  return (
    <div
      className={`lesson-pill ${lesson.paid ? 'lesson-paid' : ''}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="lesson-pill-content">
        <span className="lesson-time">
          {format(parseUTCDate(lesson.date), 'h:mm a')}
        </span>
        <span className="lesson-student">{lesson.student?.name}</span>
      </div>
      <div className="lesson-pill-actions">
        <button
          className="lesson-action-btn"
          onClick={() => onTogglePaid(lesson)}
          title={lesson.paid ? 'Mark as unpaid' : 'Mark as paid'}
        >
          <CheckCircle size={14} />
        </button>
        <button
          className="lesson-action-btn"
          onClick={() => onEdit(lesson)}
          title="Edit lesson"
        >
          <Edit2 size={14} />
        </button>
        <button
          className="lesson-action-btn lesson-delete-btn"
          onClick={() => onDelete(lesson)}
          title="Delete lesson"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

