import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCalendar } from './hooks/useCalendar';
import LessonModal from './LessonModal';
import RecurringEditModal from './RecurringEditModal';
import LessonActionModal from './LessonActionModal';
import CalendarNavigation from './CalendarNavigation';
import CalendarGrid from './CalendarGrid';
import ConfirmationModal from '../shared/ConfirmationModal';
import { markLessonAsUnpaid } from '../payments/services/paymentService';
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
    handleRequestClose,
    handleConfirmDiscard,
    handleConfirmDelete,
    resetForm,
    handleDateClick,
    updateFormData,
    setShowForm,
    goToPreviousMonth,
    goToNextMonth,

    // Form validation
    hasFormChanged,
    
    // Confirmation modals
    showConfirmDiscard,
    showConfirmDelete,
    setShowConfirmDiscard,
    setShowConfirmDelete,
  } = useCalendar();

  const navigate = useNavigate();
  const [selectedLesson, setSelectedLesson] = useState<LessonWithStudent | null>(null);
  const [showLessonActionModal, setShowLessonActionModal] = useState(false);

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

  const handleLessonClick = (lesson: LessonWithStudent) => {
    // Only show modal on mobile devices (screen width <= 768px)
    if (window.innerWidth <= 768) {
      setSelectedLesson(lesson);
      setShowLessonActionModal(true);
    }
  };

  const handleCloseLessonActionModal = () => {
    setShowLessonActionModal(false);
    setSelectedLesson(null);
  };

  const handleUnpayLesson = async (lesson: LessonWithStudent) => {
    try {
      await markLessonAsUnpaid(lesson.id, lesson.date);
      // Refresh lessons to update paid status
      window.location.reload();
    } catch (error) {
      console.error('Error marking lesson as unpaid:', error);
      alert('Failed to mark lesson as unpaid. Please try again.');
    }
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
        <div className="modal-overlay" onClick={handleRequestClose}>
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
              onRequestClose={handleRequestClose}
            />
          </div>
        </div>
      )}

      {/* Unsaved Changes Confirmation Modal */}
      {showConfirmDiscard && (
        <ConfirmationModal
          title="Discard Changes?"
          message="You have unsaved changes. Are you sure you want to discard them?"
          confirmText="Discard"
          cancelText="Cancel"
          onConfirm={handleConfirmDiscard}
          onCancel={() => {
            setShowConfirmDiscard(false);
            setShowForm(true); // Re-show the form
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showConfirmDelete && (
        <ConfirmationModal
          title="Delete Lesson?"
          message="Are you sure you want to delete this lesson?"
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setShowConfirmDelete(false);
          }}
        />
      )}

      {/* Recurring Edit Modal - Appears when performing actions on recurring events */}
      {showRecurringEditModal && (
        <RecurringEditModal
          action={recurringAction}
          setRecurringEditScope={setRecurringEditScope}
          onCancel={resetRecurringState}
        />
      )}

      {/* Lesson Action Modal - Appears on mobile when tapping a lesson */}
      {showLessonActionModal && selectedLesson && (
        <LessonActionModal
          lesson={selectedLesson}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onPay={handlePayLesson}
          onUnpay={handleUnpayLesson}
          onClose={handleCloseLessonActionModal}
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
          onUnpayLesson={handleUnpayLesson}
          onLessonClick={handleLessonClick}
        />
      </div>
    </div>
  );
}

