import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { calendarReducer, initialState } from './calendarReducer';
import { useRecurrenceLogic } from '../hooks/useRecurrenceLogic';
import { useLessonOperations } from '../hooks/useLessonOperations';
import { useLessonForm } from '../hooks/useLessonForm';
import { useCalendarHandlers } from '../hooks/useCalendarHandlers';
import * as lessonService from '../services/lesson';
import type { CalendarContextValue } from '../types';

const CalendarContext = createContext<CalendarContextValue | undefined>(undefined);

export function useCalendarContext() {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendarContext must be used within CalendarProvider');
  }
  return context;
}

export function CalendarProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(calendarReducer, initialState);
  const navigate = useNavigate();
  
  // Custom hooks for different concerns
  const recurrence = useRecurrenceLogic();
  const form = useLessonForm();
  const operations = useLessonOperations();

  // Fetch data
  const refetch = useCallback(async () => {
    try {
      dispatch({ type: 'FETCH_DATA_START' });
      const [studentsData, lessonsData] = await Promise.all([
        lessonService.fetchStudents(),
        lessonService.fetchLessonsForMonth(state.navigation.currentDate),
      ]);
      dispatch({
        type: 'FETCH_DATA_SUCCESS',
        payload: { lessons: lessonsData, students: studentsData },
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to load calendar data');
      dispatch({ type: 'FETCH_DATA_ERROR' });
    }
  }, [state.navigation.currentDate]);

  // Initial data load
  useEffect(() => {
    refetch();
  }, [refetch]);

  
  // Sync recurrence rule with form when recurrence settings change
  useEffect(() => {
    console.log(form)
    // If recurrence is disabled, clear the recurrence_rule
    if (!recurrence.recurrence.isRecurring) {
      if (form.formData.recurrence_rule !== null) {
        form.updateFormData({ recurrence_rule: null });
      }
      return;
    }

    // Need both date and time to generate RRule
    if (!form.formData.date || !form.formData.time) {
      return;
    }

    // Check if non-recurrence fields (date/time/duration) changed from original
    const dateChanged = form.formData.date !== form.originalFormData?.date;
    const timeChanged = form.formData.time !== form.originalFormData?.time;
    const durationChanged = form.formData.duration !== form.originalFormData?.duration;
    const nonRecurrenceFieldsChanged = dateChanged || timeChanged || durationChanged;

    let newRRule: string | null = null;

    if (nonRecurrenceFieldsChanged) {
      newRRule = recurrence.generateRRuleString(form.formData.date, form.formData.time);
    } else if (form.originalFormData?.recurrence_rule) {
      newRRule = recurrence.updateRRuleWithoutDTStart(form.originalFormData.recurrence_rule);
    } else {
      newRRule = recurrence.generateRRuleString(form.formData.date, form.formData.time);
    }

    // Only update if the RRule actually changed
    if (newRRule !== form.formData.recurrence_rule) {
      console.log('Updating recurrence_rule:', newRRule);
      form.updateFormData({ recurrence_rule: newRRule });
    }
  }, [
    recurrence.recurrence.isRecurring,
    recurrence.recurrence.frequency,
    recurrence.recurrence.interval,
    recurrence.recurrence.endType,
    recurrence.recurrence.untilDate,
    recurrence.recurrence.occurrenceCount,
    form.formData.date,
    form.formData.time,
    form.formData.duration,
    form.originalFormData?.date,
    form.originalFormData?.time,
    form.originalFormData?.duration,
    form.originalFormData?.recurrence_rule,
    recurrence.generateRRuleString,
    recurrence.updateRRuleWithoutDTStart,
    form.updateFormData,
  ]);
  // Load recurrence settings when editing a recurring lesson
  useEffect(() => {
    if (form.editingLesson?.recurrence_rule) {
      console.log("hello")
      recurrence.loadFromRRule(form.editingLesson.recurrence_rule);
    }
  }, [form.editingLesson?.recurrence_rule]);


  const handlers = useCalendarHandlers({
    state,   
    dispatch,
    form,
    recurrence,
    operations,
    refetch,
    navigate,
  });

  const value: CalendarContextValue = {
    navigation: state.navigation,
    data: state.data,
    form: {
      showForm: state.form.showForm,
    },
    modals: state.modals,
    dispatch,
    refetch,
    recurrence: recurrence.recurrence,
    setIsRecurring: recurrence.setIsRecurring,
    setFrequency: recurrence.setFrequency,
    setInterval: recurrence.setInterval,
    setEndType: recurrence.setEndType,
    setUntilDate: recurrence.setUntilDate,
    setOccurrenceCount: recurrence.setOccurrenceCount,
    loadFromRRule: recurrence.loadFromRRule,
    generateRRuleString: recurrence.generateRRuleString,
    getLastOccurrence: recurrence.getLastOccurrence,
    hasFutureOccurrences: recurrence.hasFutureOccurrences,
    reset: recurrence.reset,
    formData: form.formData,
    editingLesson: form.editingLesson,
    showForm: () => dispatch({ type: 'SHOW_FORM' }),
    hideForm: () => dispatch({ type: 'HIDE_FORM' }),
    loadFormData: form.loadFormData,
    updateFormData: form.updateFormData,
    hasFormChanged: () => form.hasChanged,
    hasRecurrenceChanged: () => form.hasRecurrenceRuleChanged,
    hasRecurrenceOptionsChanged: () => recurrence.hasRecurrenceOptionsChanged(),
    resetForm: () => {
      form.reset();
      recurrence.reset();
      dispatch({ type: 'RESET_FORM' });
    },
    ...handlers,
  };

  return <CalendarContext.Provider value={value}>{children}</CalendarContext.Provider>;
}