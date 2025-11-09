import { useCalendarNavigation } from './useCalendarNavigation';
import { useCalendarData } from './useCalendarData';
import { useRecurrenceSettings } from './useRecurrenceSettings';
import { useLessonFormActions } from './form/useLessonFormActions';

export function useCalendar() {
  const navigation = useCalendarNavigation();
  const data = useCalendarData(navigation.currentDate);
  const recurrenceSettings = useRecurrenceSettings();
  const form = useLessonFormActions(data.refetch, recurrenceSettings);

  return {
    navigation: {
      currentDate: navigation.currentDate,
      goToPreviousMonth: navigation.goToPreviousMonth,
      goToNextMonth: navigation.goToNextMonth,
    },
    
    data: {
      lessons: data.lessons,
      students: data.students,
      loading: data.loading,
      refetch: data.refetch,
    },
    
    recurrence: {
      isRecurring: recurrenceSettings.isRecurring,
      setIsRecurring: recurrenceSettings.setIsRecurring,
      frequency: recurrenceSettings.frequency,
      setFrequency: recurrenceSettings.setFrequency,
      interval: recurrenceSettings.interval,
      setInterval: recurrenceSettings.setInterval,
      endType: recurrenceSettings.endType,
      setEndType: recurrenceSettings.setEndType,
      untilDate: recurrenceSettings.untilDate,
      setUntilDate: recurrenceSettings.setUntilDate,
      occurrenceCount: recurrenceSettings.occurrenceCount,
      setOccurrenceCount: recurrenceSettings.setOccurrenceCount,
    },
    
    form: {
      showForm: form.showForm,
      setShowForm: form.setShowForm,
      editingLesson: form.editingLesson,
      formData: form.formData,
      handleSubmit: form.handleSubmit,
      handleEdit: form.handleEdit,
      handleDelete: form.handleDelete,
      handleRequestClose: form.handleRequestClose,
      handleConfirmDiscard: form.handleConfirmDiscard,
      handleConfirmDelete: form.handleConfirmDelete,
      handleDateClick: form.handleDateClick,
      updateFormData: form.updateFormData,
      resetForm: form.resetForm,
      hasFormChanged: form.hasFormChanged,
    },
    
    modals: {
      showConfirmDiscard: form.showConfirmDiscard,
      showConfirmDelete: form.showConfirmDelete,
      setShowConfirmDiscard: form.setShowConfirmDiscard,
      setShowConfirmDelete: form.setShowConfirmDelete,
      showRecurringEditModal: form.showRecurringEditModal,
      setRecurringEditModal: form.setShowRecurringEditModal,
      recurringAction: form.recurringAction,
      setRecurringEditScope: form.setRecurringEditScope,
      resetRecurringState: form.resetRecurringState,
    },
  };
}