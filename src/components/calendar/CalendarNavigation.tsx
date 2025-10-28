import { format } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { CalendarNavigationProps } from './types';

/**
 * CalendarNavigation Component
 * 
 * Provides navigation controls for the calendar.
 * Displays current month/year and buttons to navigate between months.
 */
export default function CalendarNavigation({
  currentDate,
  onPreviousMonth,
  onNextMonth,
}: CalendarNavigationProps) {
  return (
    <div className="calendar-nav">
      <button
        className="btn btn-secondary"
        onClick={onPreviousMonth}
        aria-label="Previous month"
      >
        <ChevronLeft size={18} />
      </button>
      <h3>{format(currentDate, 'MMMM yyyy')}</h3>
      <button
        className="btn btn-secondary"
        onClick={onNextMonth}
        aria-label="Next month"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

