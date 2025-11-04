import { useNavigate } from 'react-router-dom';
import { useCalendar } from './hooks/useCalendar';
import LessonModal from './LessonModal';
import RecurringEditModal from './RecurringEditModal';
import CalendarNavigation from './CalendarNavigation';
import CalendarGrid from './CalendarGrid';
import type { LessonWithStudent } from './types';
import './styles/Calendar.css';

export default function Calendar() {
  const {
    // State
    currentDate,
    lessons,
    students,
    loading,
    showForm,
    editingLesson,
    formData,
    isRecurring,
    setIsRecurring,
    showRecurringEditModal,
    recurringAction,
    resetRecurringState,
    setRecurringEditScope,
    // RRule options
    frequency,
    setFrequency,
    interval,
    setInterval,
    endType,
    setEndType,
    untilDate,
    setUntilDate,
    occurrenceCount,
    setOccurrenceCount,
    // Actions
    handleSubmit,
    handleEdit,
    handleDelete,
    resetForm,
    handleDateClick,
    updateFormData,
    goToPreviousMonth,
    goToNextMonth,

    // Form validation
    hasFormChanged,
  } = useCalendar();

  const navigate = useNavigate();

  const handlePayLesson = (lesson: LessonWithStudent) => {
    navigate('/payments', {
      state: {
        lessonToPay: {
          id: lesson.id,
          date: lesson.date,
          studentId: lesson.student_id,
        }
      }
    });
  };

  // Loading state
  if (loading) {
    return <div className="calendar-loading">Loading calendar...</div>;
  }

  return (
    <div className="calendar-container">
      {/* Header Section */}
      <div className="calendar-header">
        <div>
          <h2>Lesson Calendar</h2>
          <p className="calendar-subtitle">Click on any day to schedule a lesson</p>
        </div>
      </div>

      {/* Modal Form - Appears when clicking on a calendar day */}
      {showForm && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <LessonModal
              students={students}
              formData={formData}
              editingLesson={editingLesson}
              isRecurring={isRecurring}
              setIsRecurring={setIsRecurring}
              frequency={frequency}
              setFrequency={setFrequency}
              interval={interval}
              setInterval={setInterval}
              endType={endType}
              setEndType={setEndType}
              untilDate={untilDate}
              setUntilDate={setUntilDate}
              occurrenceCount={occurrenceCount}
              setOccurrenceCount={setOccurrenceCount}
              onSubmit={handleSubmit}
              onCancel={resetForm}
              onChange={updateFormData}
              hasFormChanged={hasFormChanged()}
            />
          </div>
        </div>
      )}

      {/* Recurring Edit Modal - Appears when performing actions on recurring events */}
      {showRecurringEditModal && (
        <RecurringEditModal
          action={recurringAction}
          setRecurringEditScope={setRecurringEditScope}
          onCancel={resetRecurringState}
        />
      )}

      {/* Calendar Section */}
      <div className="card">
        {/* Navigation - Month switcher */}
        <CalendarNavigation
          currentDate={currentDate}
          onPreviousMonth={goToPreviousMonth}
          onNextMonth={goToNextMonth}
        />

        {/* Grid - Calendar days and lessons */}
        <CalendarGrid
          currentDate={currentDate}
          lessons={lessons}
          onDateClick={handleDateClick}
          onEditLesson={handleEdit}
          onDeleteLesson={handleDelete}
          onPayLesson={handlePayLesson}
        />
      </div>
    </div>
  );
}

