import { useCallback } from 'react';
import type { Dispatch } from 'react';
import type { Lesson } from '../../../types/database';
import type { LessonWithStudent } from '../types';
import type { CalendarState, CalendarAction } from '../context/calendarReducer';
import { convertLocalDateTimeToUTC, extractLocalDateFromUTC } from '../utils/dateUtils';
import { markLessonAsUnpaid } from '../../payments/services/paymentService';
import type { LessonInsertData } from '../services/lesson/types';
import type { useRecurrenceLogic } from './useRecurrenceLogic';
import type { useLessonForm } from './useLessonForm';
import type { useLessonOperations } from './useLessonOperations';

interface UseCalendarHandlersParams {
  state: CalendarState;
  dispatch: Dispatch<CalendarAction>;
  form: ReturnType<typeof useLessonForm>;
  recurrence: ReturnType<typeof useRecurrenceLogic>;
  operations: ReturnType<typeof useLessonOperations>;
  refetch: () => Promise<void>;
  navigate: (path: string, options?: { state?: any }) => void;
}

export function useCalendarHandlers({
  state,
  dispatch,
  form,
  recurrence,
  operations,
  refetch,
  navigate,
}: UseCalendarHandlersParams) {
  
  const goToPreviousMonth = useCallback(() => {
    dispatch({ type: 'NAVIGATE_PREVIOUS_MONTH' });
  }, [dispatch]);

  const goToNextMonth = useCallback(() => {
    dispatch({ type: 'NAVIGATE_NEXT_MONTH' });
  }, [dispatch]);

  const performSubmit = useCallback(async () => {
    const timestamp = convertLocalDateTimeToUTC(
      form.formData.date,
      form.formData.time
    );
    
    const lessonData: LessonInsertData = {
      student_id: parseInt(form.formData.student_id),
      timestamp: timestamp,
      duration: parseInt(form.formData.duration),
    };
    
    if (form.formData.recurrence_rule) {
      lessonData.recurrence_rule = form.formData.recurrence_rule;
    }
    
    if (form.formData.note) {
      lessonData.note = form.formData.note;
    }

    let result;
    if (form.editingLesson) {
      result = await operations.updateLesson(
        form.editingLesson,
        lessonData,
        state.modals.recurringEditScope || undefined
      );
    } else {
      result = await operations.createLesson(lessonData);
    }

    if (result.success) {
      form.reset();
      recurrence.reset();
      await refetch();
    } else {
      alert('Failed to save lesson');
    }
  }, [form, operations, state.modals.recurringEditScope, refetch, recurrence]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.editingLesson?.recurrence_rule && !state.modals.recurringEditScope) {
      if (recurrence.hasFutureOccurrences(form.editingLesson)) {
        dispatch({ type: 'SHOW_RECURRING_EDIT_MODAL', payload: 'edit' });
        return;
      }
    }

    await performSubmit();
  }, [form.editingLesson, state.modals.recurringEditScope, recurrence, dispatch, performSubmit]);

  const handleEdit = useCallback((lesson: Lesson) => {
    recurrence.setIsRecurring(!!lesson.recurrence_rule);
    form.initializeForEdit(lesson);
    dispatch({ type: 'SHOW_FORM' });
  }, [recurrence, form, dispatch]);

  const handleDelete = useCallback((lesson: Lesson) => {
    if (lesson.recurrence_rule) {
      if (recurrence.hasFutureOccurrences(lesson)) {
        dispatch({ type: 'SHOW_RECURRING_EDIT_MODAL', payload: 'delete' });
        return;
      }
      dispatch({
        type: 'SHOW_CONFIRM_DELETE',
        payload: { lesson, scope: 'single' },
      });
      return;
    }

    dispatch({
      type: 'SHOW_CONFIRM_DELETE',
      payload: { lesson, scope: null },
    });
  }, [recurrence, dispatch]);

  const handleConfirmDelete = useCallback(async () => {
    if (!state.modals.pendingDeleteLesson) return;
         
    const result = await operations.deleteLesson(
      state.modals.pendingDeleteLesson,
      state.modals.pendingDeleteScope || undefined
    );

    if (result.success) {
      await refetch();
      dispatch({ type: 'HIDE_CONFIRM_DELETE' });
      dispatch({ type: 'RESET_RECURRING_STATE' });
    } else {
      alert('Failed to delete lesson');
      dispatch({ type: 'HIDE_CONFIRM_DELETE' });
    }
  }, [state.modals, operations, refetch, dispatch]);

  const handleDateClick = useCallback((date: Date) => {
    form.initializeForDate(date);
    dispatch({ type: 'SHOW_FORM' });
  }, [form, dispatch]);

  const handleRequestClose = useCallback(() => {
    if (form.hasChanged) {
      dispatch({ type: 'HIDE_FORM' });
      dispatch({ type: 'SHOW_CONFIRM_DISCARD' });
    } else {
      form.reset();
      recurrence.reset();
      dispatch({ type: 'HIDE_FORM' });
    }
  }, [form, recurrence, dispatch]);

  const handleConfirmDiscard = useCallback(() => {
    form.reset();
    recurrence.reset();
    dispatch({ type: 'HIDE_CONFIRM_DISCARD' });
  }, [form, recurrence, dispatch]);

  const handlePayLesson = useCallback((lesson: LessonWithStudent) => {
    const lessonDate = extractLocalDateFromUTC(lesson.timestamp);
    
    navigate('/payments', {
      state: {
        lessonToPay: {
          id: lesson.id,
          date: lessonDate,
          studentId: lesson.student_id,
        }
      }
    });
  }, [navigate]);

  const handleUnpayLesson = useCallback(async (lesson: LessonWithStudent) => {
    try {
      const lessonDate = extractLocalDateFromUTC(lesson.timestamp);
      await markLessonAsUnpaid(lesson.id, lessonDate);
      await refetch();
    } catch (error) {
      console.error('Error marking lesson as unpaid:', error);
      alert('Failed to mark lesson as unpaid. Please try again.');
    }
  }, [refetch]);

  const setRecurringEditScope = useCallback((scope: 'single' | 'future' | null) => {
    dispatch({ type: 'SET_RECURRING_EDIT_SCOPE', payload: scope });
  }, [dispatch]);

  const resetRecurringState = useCallback(() => {
    dispatch({ type: 'RESET_RECURRING_STATE' });
  }, [dispatch]);

  return {
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
    setRecurringEditScope,
    resetRecurringState,
  };
}