// hooks/useLessonForm.ts
import { useState, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import type { Lesson } from '../../../types/database';
import type { LessonFormData } from '../types';

export function useLessonForm() {
  const [formData, setFormData] = useState<LessonFormData>({
    student_id: '',
    date: '',
    time: '',
    duration: '60',
    recurrence_rule: null,
    note: null,
  });
  
  const [originalFormData, setOriginalFormData] = useState<LessonFormData | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  const loadFormData = useCallback((data: LessonFormData, lesson?: Lesson) => {
    console.log("hello", lesson)
    setFormData(data);
    setOriginalFormData(data);
    setEditingLesson(lesson || null);
  }, []);

  const updateFormData = useCallback((data: Partial<LessonFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  }, []);

  // Check if non-recurring fields (date, time, duration, note) have changed
  const hasNonRecurringFieldsChanged = useMemo(() => {
    if (!originalFormData) return false;
    
    return (
      formData.date !== originalFormData.date ||
      formData.time !== originalFormData.time ||
      formData.duration !== originalFormData.duration ||
      formData.note !== originalFormData.note
    );
  }, [formData, originalFormData]);

  // Check if recurrence rule has changed
  const hasRecurrenceRuleChanged = useMemo(() => {
    if (!originalFormData) return false;
    
    return formData.recurrence_rule !== originalFormData.recurrence_rule;
  }, [formData, originalFormData]);

  // Overall form change detection
  const hasChanged = useMemo(() => {
    if (!originalFormData) {
      const hasStudent = !!formData.student_id;
      const hasTime = !!formData.time;
      const hasNote = !!formData.note;
      const durationChanged = formData.duration !== '60';
      return hasStudent || hasTime || hasNote || durationChanged;
    }
    
    return (
      formData.student_id !== originalFormData.student_id ||
      hasNonRecurringFieldsChanged ||
      hasRecurrenceRuleChanged
    );
  }, [formData, originalFormData, hasNonRecurringFieldsChanged, hasRecurrenceRuleChanged]);

  const reset = useCallback(() => {
    setFormData({
      student_id: '',
      date: '',
      time: '',
      duration: '',
      recurrence_rule: null,
      note: null,
    });
    setOriginalFormData(null);
    setEditingLesson(null);
  }, []);

  const initializeForDate = useCallback((date: Date) => {
    const data: LessonFormData = {
      student_id: '',
      date: format(date, 'yyyy-MM-dd'),
      time: '',
      duration: '60',
      recurrence_rule: null,
      note: null,
    };
    loadFormData(data);
  }, [loadFormData]);

  const initializeForEdit = useCallback((lesson: Lesson) => {
    const lessonDate = new Date(lesson.timestamp);
    const data: LessonFormData = {
      student_id: lesson.student_id.toString(),
      date: format(lessonDate, 'yyyy-MM-dd'),
      time: format(lessonDate, 'HH:mm'),
      duration: lesson.duration.toString(),
      recurrence_rule: lesson.recurrence_rule || null,
      note: lesson.note || null,
    };
    loadFormData(data, lesson);
  }, [loadFormData]);

  return {
    formData,
    originalFormData,
    editingLesson,
    loadFormData,
    updateFormData,
    hasChanged,
    hasNonRecurringFieldsChanged,
    hasRecurrenceRuleChanged,
    reset,
    initializeForDate,
    initializeForEdit,
  };
}