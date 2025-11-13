import Calendar from './Calendar';
import { CalendarProvider } from './context/CalendarContext';

function CalendarWithProvider() {
  return (
    <CalendarProvider>
      <Calendar />
    </CalendarProvider>
  );
}

export default CalendarWithProvider;
export { default as LessonForm } from './LessonModal';
export { default as CalendarNavigation } from './CalendarNavigation';
export { default as CalendarGrid } from './CalendarGrid';
export { default as LessonPill } from './LessonPill';
export * from './types';
export { useCalendarContext } from './context/CalendarContext';

