// hooks/form/useFormState.ts
import { useState } from "react";
import type { Lesson } from '../../../../types/database';
import type { LessonFormData } from "../../types";

export function useLessonFormState() {
  const [showForm, setShowForm] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [formData, setFormData] = useState<LessonFormData>({
    student_id: '',
    date: '',
    time: '',
    duration: '60',
    recurrence_rule: null,
    note: null,
  });
  const [originalFormData, setOriginalFormData] = useState<LessonFormData | null>(null);

  const updateFormData = (data: Partial<LessonFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const resetFormData = () => {
    setFormData({
      student_id: '',
      date: '',
      time: '',
      duration: '60',
      recurrence_rule: null,
      note: null,
    });
    setOriginalFormData(null);
    setEditingLesson(null);
    setShowForm(false);
  };

  const loadFormData = (data: LessonFormData, lesson?: Lesson) => {
    setFormData(data);
    setOriginalFormData(data);
    if (lesson) {
      setEditingLesson(lesson);
    }
    setShowForm(true);
  };

  const hasFormChanged = (): boolean => {
    if (!originalFormData) {
      const hasStudent = !!formData.student_id;
      const hasTime = !!formData.time;
      const hasNote = !!formData.note;
      const durationChanged = formData.duration !== '60';
      return hasStudent || hasTime || hasNote || durationChanged;
    }
    
    return (
      formData.student_id !== originalFormData.student_id ||
      formData.date !== originalFormData.date ||
      formData.time !== originalFormData.time ||
      formData.duration !== originalFormData.duration ||
      formData.recurrence_rule !== originalFormData.recurrence_rule ||
      formData.note !== originalFormData.note
    );
  };

  return {
    // Form data
    formData,
    originalFormData,
    updateFormData,
    resetFormData,
    loadFormData,
    hasFormChanged,
    
    // Form UI state
    showForm,
    setShowForm,
    editingLesson,
    setEditingLesson,
  };
}