import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';
import LessonPill from './LessonPill';
import type { CalendarGridProps } from './types';

/**
 * CalendarGrid Component
 * 
 * Renders the calendar grid with:
 * - Week day headers
 * - All days of the month plus surrounding days
 * - Lessons displayed on their respective days
 * - Visual indicators for current month, today, and other months
 * 
 * Clicking a date allows scheduling a new lesson for that date.
 */
export default function CalendarGrid({
  currentDate,
  lessons,
  onDateClick,
  onEditLesson,
  onDeleteLesson,
  onTogglePaid,
}: CalendarGridProps) {
  // Generate calendar days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  /**
   * Get all lessons for a specific date
   */
  const getLessonsForDate = (date: Date) => {
    return lessons.filter(lesson => isSameDay(new Date(lesson.date), date));
  };

  return (
    <div className="calendar-grid">
      {/* Week day headers */}
      {weekDays.map((day) => (
        <div key={day} className="calendar-weekday">
          {day}
        </div>
      ))}

      {/* Calendar days */}
      {calendarDays.map((day, index) => {
        const dayLessons = getLessonsForDate(day);
        const isCurrentMonth = isSameMonth(day, currentDate);
        const isToday = isSameDay(day, new Date());

        return (
          <div
            key={index}
            className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${
              isToday ? 'today' : ''
            }`}
            onClick={() => isCurrentMonth && onDateClick(day)}
          >
            <div className="day-number">{format(day, 'd')}</div>
            {isCurrentMonth && dayLessons.length > 0 && (
              <div className="day-lessons">
                {dayLessons.map((lesson) => (
                  <LessonPill
                    key={lesson.id}
                    lesson={lesson}
                    onEdit={onEditLesson}
                    onDelete={onDeleteLesson}
                    onTogglePaid={onTogglePaid}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

