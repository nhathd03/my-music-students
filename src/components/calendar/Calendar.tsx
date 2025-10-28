import { Plus } from 'lucide-react';
import { useCalendar } from './hooks/useCalendar';
import LessonForm from './LessonForm';
import CalendarNavigation from './CalendarNavigation';
import CalendarGrid from './CalendarGrid';
import '../Calendar.css';

/**
 * Calendar Component (Main Container)
 * 
 * This is the main container component that orchestrates all calendar-related
 * functionality. It delegates specific responsibilities to smaller,
 * focused sub-components:
 * 
 * - LessonForm: Handles adding/editing lesson records
 * - CalendarNavigation: Month navigation controls
 * - CalendarGrid: Displays the calendar with lessons
 * - LessonPill: Individual lesson display (used by CalendarGrid)
 * 
 * Business logic is managed by the useCalendar custom hook,
 * keeping this component focused on composition and layout.
 */
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

    // Actions
    handleSubmit,
    handleEdit,
    handleDelete,
    togglePaid,
    resetForm,
    handleDateClick,
    updateFormData,
    setShowForm,
    goToPreviousMonth,
    goToNextMonth,
  } = useCalendar();

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
          <p className="calendar-subtitle">Schedule and manage piano lessons</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={18} />
          Add Lesson
        </button>
      </div>

      {/* Form Section - Add/Edit lessons */}
      {showForm && (
        <LessonForm
          students={students}
          formData={formData}
          editingLesson={editingLesson}
          onSubmit={handleSubmit}
          onCancel={resetForm}
          onChange={updateFormData}
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
          onTogglePaid={togglePaid}
        />
      </div>
    </div>
  );
}

