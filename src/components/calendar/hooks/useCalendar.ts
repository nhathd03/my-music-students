 import { useState, useEffect } from 'react';
import { format, addMonths, subMonths } from 'date-fns';
import type { Lesson, Student } from '../../../types/database';
import type { LessonWithStudent, LessonFormData } from '../types';
import { parseUTCDate } from '../utils/dateUtils';
import { generateRRule, parseRRule } from '../utils/rruleUtils';
import * as lessonService from '../services/lesson';

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
  // ============================================================================
  // State Management
  // ============================================================================
  
  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [lessons, setLessons] = useState<LessonWithStudent[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
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
  
  // Recurrence state
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('WEEKLY');
  const [interval, setInterval] = useState(1);
  const [endType, setEndType] = useState<'never' | 'until' | 'count'>('never');
  const [untilDate, setUntilDate] = useState(new Date().toISOString().split('T')[0]);
  const [occurrenceCount, setOccurrenceCount] = useState(10);
  
  // Recurring edit modal state
  const [showRecurringEditModal, setShowRecurringEditModal] = useState(false);
  const [recurringEditScope, setRecurringEditScope] = useState<'single' | 'future' | null>(null);
  const [recurringAction, setRecurringAction] = useState<'edit' | 'delete' | null>(null);

  // ============================================================================
  // Data Fetching
  // ============================================================================
  
  /**
   * Fetches students and lessons from Supabase for the current month
   */
  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch students and lessons in parallel
      const [studentsData, lessonsData] = await Promise.all([
        lessonService.fetchStudents(),
        lessonService.fetchLessonsForMonth(currentDate),
      ]);

      setStudents(studentsData);
      setLessons(lessonsData);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when current date changes
  useEffect(() => {
    fetchData();
  }, [currentDate]);

  // ============================================================================
  // Recurrence Rule Management
  // ============================================================================
  
  /**
   * Parse RRULE when editing a recurring lesson to populate the form options
   */
  useEffect(() => {
    if (editingLesson && editingLesson.recurrence_rule) {
      const parsed = parseRRule(editingLesson.recurrence_rule);
      if (parsed) {
        setFrequency(parsed.frequency);
        setInterval(parsed.interval);
        setEndType(parsed.endType);
        setUntilDate(parsed.untilDate);
        setOccurrenceCount(parsed.occurrenceCount);
      }
    }
  }, [editingLesson]);

  /**
   * Update formData with generated RRULE whenever recurrence options change
   * Regenerates the RRULE when date/time are filled in or when any recurrence option changes
   */
  useEffect(() => {
    if (isRecurring && formData.date && formData.time) {
      const rrule = generateRRule(formData.date, formData.time, {
        frequency,
        interval,
        endType,
        untilDate,
        occurrenceCount,
      });
      
      // Only update if the rrule actually changed to avoid infinite loops
      if (rrule !== formData.recurrence_rule) {
        updateFormData({ recurrence_rule: rrule });
        
        // If editing and the RRULE was just regenerated from parsing,
        // update originalFormData
        if (editingLesson && originalFormData && originalFormData.recurrence_rule) {
          setOriginalFormData({ ...originalFormData, recurrence_rule: rrule });
        }
      }
    } else if (!isRecurring && formData.recurrence_rule !== null) {
      updateFormData({ recurrence_rule: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecurring, frequency, interval, endType, untilDate, occurrenceCount, formData.date, formData.time]);

  // ============================================================================
  // Recurring Action Handler
  // ============================================================================
  
  /**
   * Trigger action when recurring edit scope is selected
   */
  useEffect(() => {
    if (!recurringEditScope || !recurringAction) return;
    
    const run = async () => {
      try {
        switch (recurringAction) {
          case 'edit': await performSubmit(); break;
          case 'delete': await performDelete(); break;
        }
      } catch (error) {
        console.error('Error performing recurring action:', error);
        alert('Failed to perform action');
      } finally {
        setRecurringEditScope(null);
        setRecurringAction(null);
      }
    };
    
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recurringEditScope, recurringAction]);

  // ============================================================================
  // Form Submission
  // ============================================================================

  /**
   * Handles form submission for creating/updating lessons
   * 
   * Takes the local date/time entered by the user and converts it to UTC for storage.
   * When the date is retrieved from the database, it will automatically convert back to local time.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // If editing a recurring event and scope not yet selected, show modal
    if (editingLesson && editingLesson.recurrence_rule && !recurringEditScope) {
      setRecurringAction('edit');
      setShowRecurringEditModal(true);
      return;
    }

    await performSubmit();
  };

  /**
   * Performs the actual submission after scope is determined
   */
  const performSubmit = async () => {
    try {
      // Combine date and time into ISO string
      const [year, month, day] = formData.date.split('-').map(Number);
      const [hours, minutes] = formData.time.split(':').map(Number);
      
      // Create Date object in local timezone
      const lessonDateTimeLocal = new Date(year, month - 1, day, hours, minutes);
      
      // Convert to UTC ISO string for database storage
      const lessonData: lessonService.LessonInsertData = {
        student_id: parseInt(formData.student_id),
        date: lessonDateTimeLocal.toISOString(),
        duration: parseInt(formData.duration),
      };
      
      // Include recurrence_rule if present
      if (formData.recurrence_rule) {
        lessonData.recurrence_rule = formData.recurrence_rule;
      }
      
      // Include note if present
      if (formData.note) {
        lessonData.note = formData.note;
      }

      if (editingLesson && editingLesson.recurrence_rule && recurringEditScope === 'single') {
        // Edit single occurrence by creating an override
        await lessonService.updateSingleOccurrence(editingLesson, editingLesson.date, lessonData);
      } else if (editingLesson && editingLesson.recurrence_rule && recurringEditScope === 'future') {
        // Implement series split for future occurrences
        await lessonService.updateCurrentAndFutureOccurrences(editingLesson, lessonData);
      } else if (editingLesson) {
        // Update existing non-recurring lesson
        await lessonService.updateLesson(editingLesson.id, lessonData);
      } else {
        // Create new lesson
        await lessonService.createLesson(lessonData);
      }

      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving lesson:', error);
      alert('Failed to save lesson');
    }
  };

  // ============================================================================
  // Edit Handler
  // ============================================================================

  /**
   * Sets up the form for editing an existing lesson
   * Converts UTC date from database to local time for form display
   */
  const handleEdit = (lesson: Lesson) => {
    setEditingLesson(lesson);
    const lessonDate = parseUTCDate(lesson.date);
    
    if (lesson.recurrence_rule) {
      setIsRecurring(true);
    } else {
      setIsRecurring(false);
    }

    const initialFormData = {
      student_id: lesson.student_id.toString(),
      date: format(lessonDate, 'yyyy-MM-dd'),
      time: format(lessonDate, 'HH:mm'),
      duration: lesson.duration.toString(),
      recurrence_rule: lesson.recurrence_rule || null,
      note: lesson.note || null,
    };

    setFormData(initialFormData);
    setOriginalFormData(initialFormData); // Store original for comparison

    setShowForm(true);
  };

  // ============================================================================
  // Delete Handlers
  // ============================================================================

  /**
   * Deletes a lesson after confirmation
   * For recurring lessons, shows modal to choose delete scope
   */
  const handleDelete = async (lesson: Lesson) => {
    // For recurring lessons, show scope selection modal
    if (lesson.recurrence_rule) {
      setEditingLesson(lesson);
      setRecurringAction('delete');
      setShowRecurringEditModal(true);
      return;
    }

    // Simple delete for non-recurring lessons
    if (!confirm('Are you sure you want to delete this lesson?')) {
      return;
    }

    try {
      await lessonService.deleteLesson(lesson.id);
      fetchData();
    } catch (error) {
      console.error('Error deleting lesson:', error);
      alert('Failed to delete lesson');
    }
  };

  /**
   * Performs the actual delete after scope is determined for recurring lessons
   */
  const performDelete = async () => {
    if (!editingLesson) return;

    if (!confirm('Are you sure you want to delete this lesson?')) {
      resetRecurringState();
      return;
    }

    try {
      if (recurringEditScope === 'single') {
        await lessonService.deleteSingleOccurrence(editingLesson);
      } else if (recurringEditScope === 'future') {
        await lessonService.deleteFutureOccurrences(editingLesson);
      }

      fetchData();
      resetRecurringState();
      resetForm();
    } catch (error) {
      console.error('Error deleting lesson:', error);
      alert('Failed to delete lesson');
      resetRecurringState();
    }
  };

  // ============================================================================
  // Toggle Paid Handler - REMOVED
  // ============================================================================
  
  /**
   * NOTE: Paid status is no longer tracked on lessons.
   * It's now determined by payment_items linking lessons to payments.
   * To mark a lesson as paid, create a payment record that references the lesson.
   */

  // ============================================================================
  // Helper Functions
  // ============================================================================

  /**
   * Check if the form has been modified from its original state
   * Returns true if any field has changed
   */
  const hasFormChanged = (): boolean => {
    if (!originalFormData) return true; // New lesson, always allow submit
    
    return (
      formData.student_id !== originalFormData.student_id ||
      formData.date !== originalFormData.date ||
      formData.time !== originalFormData.time ||
      formData.duration !== originalFormData.duration ||
      formData.recurrence_rule !== originalFormData.recurrence_rule ||
      formData.note !== originalFormData.note
    );
  };

  /**
   * Resets recurring-related state after an action
   */
  const resetRecurringState = () => {
    setShowRecurringEditModal(false);
    setIsRecurring(false);
    setShowForm(false);
  };

  /**
   * Resets the form to its initial state
   */
  const resetForm = () => {
    setFormData({ student_id: '', date: '', time: '', duration: '60', recurrence_rule: null, note: null });
    setOriginalFormData(null); // Clear original form data
    setEditingLesson(null);
    setShowForm(false);
    setIsRecurring(false);
    resetRecurringState();
    // Reset RRule options
    setFrequency('WEEKLY');
    setInterval(1);
    setEndType('never');
    setUntilDate(new Date().toISOString().split('T')[0]);
    setOccurrenceCount(10);
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

  // ============================================================================
  // Return Hook Interface
  // ============================================================================

  return {
    // State
    currentDate,
    lessons,
    students,
    loading,
    showForm,
    isRecurring,
    setIsRecurring,
    editingLesson,
    formData,
    showRecurringEditModal,
    setShowRecurringEditModal,
    setRecurringEditScope,
    recurringAction,
    resetRecurringState,
    
    // RRule options state
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
    resetForm,
    handleDateClick,
    updateFormData,
    setShowForm,
    goToPreviousMonth,
    goToNextMonth,

    // Form validation
    hasFormChanged,
  };
}
