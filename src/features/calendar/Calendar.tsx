import { useMobileLessonModal } from './hooks/useMobileLessonModal';
import { useCalendarContext } from './context/CalendarContext';
import LessonModal from './LessonModal';
import RecurringEditModal from './RecurringEditModal';
import RecurrenceChangeConfirmModal from './RecurrenceChangeConfirmModal';
import LessonActionModal from './LessonActionModal';
import CalendarNavigation from './CalendarNavigation';
import CalendarGrid from './CalendarGrid';
import ConfirmationModal from '../../components/ConfirmationModal';

import './styles/Calendar.css';

export default function Calendar() {
  const {
    navigation,
    data,
    recurrence,
    form,
    modals,
    formData,
    editingLesson,
    goToPreviousMonth,
    goToNextMonth,
    handleSubmit,
    handleEdit,
    handleDelete,
    handleConfirmDelete,
    handleDateClick,
    handleRequestClose,
    handleConfirmDiscard,
    handlePayLesson,
    handleUnpayLesson,
    updateFormData,
    resetForm,
    hasFormChanged,
    hasRecurrenceOptionsChanged,
    setIsRecurring,
    setFrequency,
    setInterval,
    setEndType,
    setUntilDate,
    setOccurrenceCount,
    getLastOccurrence,
    setRecurringEditScope,
    resetRecurringState,
    handleConfirmRecurrenceChange,
    handleCancelRecurrenceChange,
  } = useCalendarContext();

  const lessonActionModal = useMobileLessonModal();
 
  if (data.loading) {
    return <div className="calendar-loading">Loading calendar...</div>;
  }

  const recurrenceProps = {
    isRecurring: recurrence.isRecurring,
    setIsRecurring,
    frequency: recurrence.frequency,
    setFrequency,
    interval: recurrence.interval,
    setInterval,
    endType: recurrence.endType,
    setEndType,
    untilDate: recurrence.untilDate || '',
    setUntilDate,
    occurrenceCount: recurrence.occurrenceCount,
    setOccurrenceCount,
  };

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <div>
          <h2>Lesson Calendar</h2>
          <p className="calendar-subtitle">Click on any day to schedule a lesson</p>
        </div>
      </div>

      {form.showForm && (
        <div className="modal-overlay" onClick={handleRequestClose}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <LessonModal
              students={data.students}
              formData={formData}
              editingLesson={editingLesson}
              recurrence={recurrenceProps}
              hasFormChanged={hasFormChanged()}
              hasRecurrenceOptionsChanged={hasRecurrenceOptionsChanged()}
              getLastOccurrence={getLastOccurrence}
              onSubmit={handleSubmit}
              onCancel={resetForm}
              onChange={updateFormData}
              onRequestClose={handleRequestClose}
            />
          </div>
        </div>
      )}

      {modals.showConfirmDiscard && (
        <ConfirmationModal
          title="Discard Changes?"
          message="You have unsaved changes. Are you sure you want to discard them?"
          confirmText="Discard"
          cancelText="Cancel"
          onConfirm={handleConfirmDiscard}
          onCancel={() => {
            handleRequestClose();
          }}
        />
      )}

      {modals.showConfirmDelete && (
        <ConfirmationModal
          title="Delete Lesson?"
          message="Are you sure you want to delete this lesson?"
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
          onConfirm={handleConfirmDelete}
          onCancel={handleRequestClose}
        />
      )}

      {modals.showRecurringEditModal && (
        <RecurringEditModal
          action={modals.recurringAction}
          setRecurringEditScope={setRecurringEditScope}
          onCancel={resetRecurringState}
        />
      )}

      {modals.showRecurrenceChangeConfirm && (
        <RecurrenceChangeConfirmModal
          onConfirm={handleConfirmRecurrenceChange}
          onCancel={handleCancelRecurrenceChange}
        />
      )}

      {lessonActionModal.isOpen && lessonActionModal.selectedLesson && (
        <LessonActionModal
          lesson={lessonActionModal.selectedLesson}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onPay={handlePayLesson}
          onUnpay={handleUnpayLesson}
          onClose={lessonActionModal.handleClose}
        />
      )}

      <div className="card">
        <CalendarNavigation
          currentDate={navigation.currentDate}
          onPreviousMonth={goToPreviousMonth}
          onNextMonth={goToNextMonth}
        />

        <CalendarGrid
          currentDate={navigation.currentDate}
          lessons={data.lessons}
          onDateClick={handleDateClick}
          onEditLesson={handleEdit}
          onDeleteLesson={handleDelete}
          onPayLesson={handlePayLesson}
          onUnpayLesson={handleUnpayLesson}
          onLessonClick={lessonActionModal.handleLessonClick}
        />
      </div>
    </div>
  );
}