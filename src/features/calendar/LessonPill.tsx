import { format, addMinutes } from 'date-fns';
import { Edit2, Trash2, DollarSign } from 'lucide-react';
import type { LessonPillProps } from './types';

import { parseUTCDate } from "./utils/dateUtils"
/**
 * Formats a time range for a lesson
 */
function formatLessonTimeRange(startDate: Date, durationMinutes: number): string {
  const endDate = addMinutes(startDate, durationMinutes);
  const startTime = format(startDate, 'h:mm a');
  const endTime = format(endDate, 'h:mm a');
  return `${startTime} - ${endTime}`;
}

export default function LessonPill({
  lesson,
  onEdit,
  onDelete,
  onPay,
  onUnpay,
  onMobileClick,
}: LessonPillProps) {
  const startDate = parseUTCDate(lesson.date);
  const timeRange = formatLessonTimeRange(startDate, lesson.duration);
  const hasNote = lesson.note && lesson.note.trim().length > 0;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // On mobile, show modal instead of individual button actions
    // Only trigger if we're on mobile (screen width <= 768px)
    if (onMobileClick && window.innerWidth <= 768) {
      onMobileClick();
    }
  };

  const handleButtonClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <div
      className={`lesson-pill ${lesson.paid ? 'lesson-paid' : ''} ${hasNote ? 'lesson-has-note' : ''}`}
      onClick={handleClick}
    >
      <div className="lesson-pill-content">
        {/* Time and Student Info */}
        <div className="lesson-main-info">
          <span className="lesson-time">{timeRange}</span>
          <span className="lesson-student">{lesson.student?.name}</span>
        </div>
        
        {/* Note Section - Displayed inside the pill */}
        {hasNote && (
          <div className="lesson-note">
            <span className="lesson-note-text">{lesson.note}</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="lesson-pill-actions">
        {lesson.paid && onUnpay ? (
          <button
            className="lesson-action-btn"
            onClick={(e) => handleButtonClick(e, () => onUnpay(lesson))}
            title="Mark as unpaid"
            aria-label="Mark as unpaid"
          >
            <DollarSign size={14} />
          </button>
        ) : !lesson.paid ? (
          <button
            className="lesson-action-btn"
            onClick={(e) => handleButtonClick(e, () => onPay(lesson))}
            title="Pay for lesson"
            aria-label="Pay for lesson"
          >
            <DollarSign size={14} />
          </button>
        ) : null}
        <button
          className="lesson-action-btn"
          onClick={(e) => handleButtonClick(e, () => onEdit(lesson))}
          title="Edit lesson"
          aria-label="Edit lesson"
        >
          <Edit2 size={14} />
        </button>
        <button
          className="lesson-action-btn lesson-delete-btn"
          onClick={(e) => handleButtonClick(e, () => onDelete(lesson))}
          title="Delete lesson"
          aria-label="Delete lesson"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

