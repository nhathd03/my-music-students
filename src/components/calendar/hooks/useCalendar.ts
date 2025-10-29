import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { supabase } from '../../../lib/supabase';
import type { Lesson, Student } from '../../../types/database';
import type { LessonWithStudent, LessonFormData } from '../types';
import { RRule, rrulestr } from 'rrule';
/**
 * Custom Hook: useCalendar
 * 
 * Manages all calendar-related state and operations:
 * - Data fetching (lessons and students)
 * - Form state management
 * - CRUD operations (Create, Read, Update, Delete)
 * - Calendar navigation (month switching)
 * - Payment status toggling
 * 
 * This hook encapsulates the business logic, making the main
 * Calendar component cleaner and more focused on presentation.
 */
export function useCalendar() {
  // State management
  const [currentDate, setCurrentDate] = useState(new Date());
  const [lessons, setLessons] = useState<LessonWithStudent[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  // Form state
  const [formData, setFormData] = useState<LessonFormData>({
    student_id: '',
    date: '',
    time: '',
    duration: '60',
  });

  // Fetch data when current date changes
  useEffect(() => {
    fetchData();
  }, [currentDate]);

  /**
   * Fetches students and lessons from Supabase for the current month
   */
  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch students
      const { data: studentsData, error: studentsError } = await supabase
        .from('student')
        .select('*')
        .order('name');

      if (studentsError) throw studentsError;
      setStudents(studentsData || []);

      // Fetch lessons for current month
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);

      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lesson')
        .select(`
          *,
          student:student_id (*)
        `)
        .gte('date', monthStart.toISOString())
        .lte('date', monthEnd.toISOString())
        .order('date');

      if (lessonsError) throw lessonsError;

      for (const lesson of lessonsData) {
        
        if (lesson.recurrence_rule) {
          const rrule = rrulestr(lesson.recurrence_rule);
          const occurrences = rrule.between(monthStart, monthEnd, true);
          for (const occurrence of occurrences) {
            lessonsData.push({
              ...lesson,
              date: occurrence.toISOString(),
            });
          }
        }
        else {
          console.log(lesson);

        }
      }

      setLessons(lessonsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles form submission for creating/updating lessons
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Combine date and time into ISO string
      const lessonDateTime = new Date(`${formData.date}T${formData.time}`);

      const lessonData = {
        student_id: parseInt(formData.student_id),
        date: lessonDateTime.toISOString(),
        duration: parseInt(formData.duration),
        paid: false,
      };

      if (editingLesson) {
        // Update existing lesson
        const { error } = await supabase
          .from('lesson')
          .update(lessonData)
          .eq('id', editingLesson.id);

        if (error) throw error;
      } else {
        // Create new lesson
        const { error } = await supabase
          .from('lesson')
          .insert([lessonData]);

        if (error) throw error;
      }

      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving lesson:', error);
      alert('Failed to save lesson');
    }
  };

  /**
   * Sets up the form for editing an existing lesson
   */
  const handleEdit = (lesson: Lesson) => {
    setEditingLesson(lesson);
    const lessonDate = new Date(lesson.date);
    setFormData({
      student_id: lesson.student_id.toString(),
      date: format(lessonDate, 'yyyy-MM-dd'),
      time: format(lessonDate, 'HH:mm'),
      duration: lesson.duration.toString(),
    });
    setShowForm(true);
  };

  /**
   * Deletes a lesson after confirmation
   */
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this lesson?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('lesson')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting lesson:', error);
      alert('Failed to delete lesson');
    }
  };

  /**
   * Toggles the paid status of a lesson
   */
  const togglePaid = async (lesson: Lesson) => {
    try {
      const { error } = await supabase
        .from('lesson')
        .update({ paid: !lesson.paid })
        .eq('id', lesson.id);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error updating lesson:', error);
      alert('Failed to update lesson');
    }
  };

  /**
   * Resets the form to its initial state
   */
  const resetForm = () => {
    setFormData({ student_id: '', date: '', time: '', duration: '60' });
    setEditingLesson(null);
    setShowForm(false);
  };

  /**
   * Opens the form with a pre-selected date
   */
  const handleDateClick = (date: Date) => {
    setFormData({
      ...formData,
      date: format(date, 'yyyy-MM-dd'),
    });
    setShowForm(true);
  };

  /**
   * Updates form data (partial update)
   */
  const updateFormData = (data: Partial<LessonFormData>) => {
    setFormData({ ...formData, ...data });
  };

  /**
   * Navigation functions
   */
  const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  return {
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
  };
}

