import { format, addMinutes } from 'date-fns';
import { Edit2, Trash2, DollarSign } from 'lucide-react';
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
 * Formats a time range for a lesson
 */
function formatLessonTimeRange(startDate: Date, durationMinutes: number): string {
  const endDate = addMinutes(startDate, durationMinutes);
  const startTime = format(startDate, 'h:mm a');
  const endTime = format(endDate, 'h:mm a');
  return `${startTime} - ${endTime}`;
}

/**
 * LessonPill Component
 * 
 * Displays an individual lesson as a "pill" in the calendar day.
 * 
 * - Shows lesson time range (start - end) and student name
 * - Paid lessons display with green styling
 * - Action buttons: edit, delete
 * - Hover effect to show actions
 */
export default function LessonPill({
  lesson,
  onEdit,
  onDelete,
  onPay,
}: LessonPillProps) {
  const startDate = parseUTCDate(lesson.date);
  const timeRange = formatLessonTimeRange(startDate, lesson.duration);
  const hasNote = lesson.note && lesson.note.trim().length > 0;

  return (
    <div
      className={`lesson-pill ${lesson.paid ? 'lesson-paid' : ''} ${hasNote ? 'lesson-has-note' : ''}`}
      onClick={(e) => e.stopPropagation()}
    >
      {hasNote && (
        <div className="lesson-note-tooltip">
          {lesson.note}
        </div>
      )}
      <div className="lesson-pill-content">
        <span className="lesson-time">
          {timeRange}
        </span>
        <span className="lesson-student">{lesson.student?.name}</span>
      </div>
      <div className="lesson-pill-actions">
        {!lesson.paid && (
          <button
            className="lesson-action-btn"
            onClick={() => onPay(lesson)}
            title="Pay for lesson"
          >
            <DollarSign size={14} />
          </button>
        )}
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

