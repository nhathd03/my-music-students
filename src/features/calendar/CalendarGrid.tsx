import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';
import LessonPill from './LessonPill';
import type { CalendarGridProps } from './types';

import { parseUTCDate } from "./utils/dateUtils"
 
export default function CalendarGrid({
  currentDate,
  lessons,
  onDateClick,
  onEditLesson,
  onDeleteLesson,
  onPayLesson,
  onUnpayLesson,
  onLessonClick,
}: CalendarGridProps) {
  // Generate calendar days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getLessonsForDate = (date: Date) => {
    return lessons.filter(lesson => isSameDay(parseUTCDate(lesson.date), date));
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
            } ${isCurrentMonth && dayLessons.length === 0 ? 'empty-day' : ''}`}
            onClick={() => isCurrentMonth && onDateClick(day)}
          >
            <div className="day-number">{format(day, 'd')}</div>
            {isCurrentMonth && dayLessons.length > 0 && (
              <div className="day-lessons">
                {dayLessons.map((lesson) => (
                  <LessonPill
                    key={`${lesson.id}-${lesson.date}`}
                    lesson={lesson}
                    onEdit={onEditLesson}
                    onDelete={onDeleteLesson}
                    onPay={onPayLesson}
                    onUnpay={onUnpayLesson}
                    onMobileClick={onLessonClick ? () => onLessonClick(lesson) : undefined}
                  />
                ))}
              </div>
            )}
            {/* Visual hint for empty days */}
            {isCurrentMonth && dayLessons.length === 0 && (
              <div className="empty-day-hint">+ Add lesson</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

