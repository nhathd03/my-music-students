import { useCalendar } from './hooks/useCalendar';
import { useMobileLessonModal } from './hooks/useMobileLessonModal';
import LessonModal from './LessonModal';
import RecurringEditModal from './RecurringEditModal';
import LessonActionModal from './LessonActionModal';
import CalendarNavigation from './CalendarNavigation';
import CalendarGrid from './CalendarGrid';
import ConfirmationModal from '../../components/ConfirmationModal';
import { useLessonPayment } from './hooks/useLessonPayment';

import './styles/Calendar.css';

export default function Calendar() {
  const { navigation, data, recurrence, form, modals } = useCalendar();
  const lessonActionModal = useMobileLessonModal();
 const { handlePayLesson, handleUnpayLesson } = useLessonPayment(data.refetch);
 
  if (data.loading) {
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

      {/* Lesson Form Modal */}
      {form.showForm && (
        <div className="modal-overlay" onClick={form.handleRequestClose}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <LessonModal
              students={data.students}
              formData={form.formData}
              editingLesson={form.editingLesson}
              recurrence={recurrence}
              hasFormChanged={form.hasFormChanged()}
              onSubmit={form.handleSubmit}
              onCancel={form.resetForm}
              onChange={form.updateFormData}
              onRequestClose={form.handleRequestClose}
            />
          </div>
        </div>
      )}

      {/* Unsaved Changes Confirmation Modal */}
      {modals.showConfirmDiscard && (
        <ConfirmationModal
          title="Discard Changes?"
          message="You have unsaved changes. Are you sure you want to discard them?"
          confirmText="Discard"
          cancelText="Cancel"
          onConfirm={form.handleConfirmDiscard}
          onCancel={() => {
            modals.setShowConfirmDiscard(false);
            form.setShowForm(true);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {modals.showConfirmDelete && (
        <ConfirmationModal
          title="Delete Lesson?"
          message="Are you sure you want to delete this lesson?"
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
          onConfirm={form.handleConfirmDelete}
          onCancel={() => {
            modals.setShowConfirmDelete(false);
          }}
        />
      )}

      {/* Recurring Edit Modal */}
      {modals.showRecurringEditModal && (
        <RecurringEditModal
          action={modals.recurringAction}
          setRecurringEditScope={modals.setRecurringEditScope}
          onCancel={modals.resetRecurringState}
        />
      )}

      {/* Lesson Action Modal - Mobile only */}
      {lessonActionModal.isOpen && lessonActionModal.selectedLesson && (
        <LessonActionModal
          lesson={lessonActionModal.selectedLesson}
          onEdit={form.handleEdit}
          onDelete={form.handleDelete}
          onPay={handlePayLesson}
          onUnpay={handleUnpayLesson}
          onClose={lessonActionModal.handleClose}
        />
      )}

      {/* Calendar Section */}
      <div className="card">
        <CalendarNavigation
          currentDate={navigation.currentDate}
          onPreviousMonth={navigation.goToPreviousMonth}
          onNextMonth={navigation.goToNextMonth}
        />

        <CalendarGrid
          currentDate={navigation.currentDate}
          lessons={data.lessons}
          onDateClick={form.handleDateClick}
          onEditLesson={form.handleEdit}
          onDeleteLesson={form.handleDelete}
          onPayLesson={handlePayLesson}
          onUnpayLesson={handleUnpayLesson}
          onLessonClick={lessonActionModal.handleLessonClick}
        />
      </div>
    </div>
  );
}