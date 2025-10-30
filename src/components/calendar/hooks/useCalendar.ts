import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { supabase } from '../../../lib/supabase';
import type { Lesson, Student } from '../../../types/database';
import type { LessonWithStudent, LessonFormData } from '../types';
import { rrulestr, RRule, Frequency } from 'rrule';

type RRuleOptions = {
  freq: Frequency;
  interval: number;
  dtstart: Date;
  until?: Date;
  count?: number;
};

/**
 * Converts a UTC date string from the database to a local Date object
 * Ensures proper timezone handling by explicitly parsing as UTC
 */
function parseUTCDate(dateString: string): Date {
  if (dateString.includes('Z') || dateString.includes('+') || dateString.includes('-', 10)) {
    return new Date(dateString);
  }

  return new Date(dateString + 'Z');
}

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
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringEditScope, setRecurringEditScope] = useState<'single' | 'future' | null>(null);
  const [showRecurringEditModal, setShowRecurringEditModal] = useState(false);
  const [recurringAction, setRecurringAction] = useState<'edit' | 'delete' | 'togglePaid' | null>(null);
  
  // RRule options state
  const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('WEEKLY');
  const [interval, setInterval] = useState(1);
  const [endType, setEndType] = useState<'never' | 'until' | 'count'>('never');
  const [untilDate, setUntilDate] = useState(new Date().toISOString().split('T')[0]);
  const [occurrenceCount, setOccurrenceCount] = useState(10);
  
  // Form state
  const [formData, setFormData] = useState<LessonFormData>({
    student_id: '',
    date: '',
    time: '',
    duration: '60',
    paid: false,
    recurrence_rule: null,
  });

  // Fetch data when current date changes
  useEffect(() => {
    fetchData();
  }, [currentDate]);

  /**
   * Parse RRULE when editing a recurring lesson to populate the form options
   */
  useEffect(() => {
    if (editingLesson && editingLesson.recurrence_rule) {
      try {
        const rule = rrulestr(editingLesson.recurrence_rule);
        const opts = rule.options;
  
        const freqName = Object.keys(Frequency).find(
          key => Frequency[key as keyof typeof Frequency] === opts.freq
        ) as 'DAILY' | 'WEEKLY' | 'MONTHLY';
  
        setFrequency(freqName || 'WEEKLY');
        setInterval(opts.interval || 1);
        setEndType(opts.until ? 'until' : opts.count ? 'count' : 'never');
        setUntilDate(
          opts.until
            ? opts.until.toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0]
        );
        setOccurrenceCount(opts.count || 10);
      } catch (err) {
        console.error('Failed to parse RRULE:', err);
      }
    }
  }, [editingLesson]);

  /**
   * Trigger action when recurring edit scope is selected
   */
  useEffect(() => {
    if (recurringEditScope && recurringAction) {
      switch (recurringAction) {
        case 'edit':
          performSubmit();
          break;
        case 'delete':
          performDelete();
          break;
        case 'togglePaid':
          performTogglePaid();
          break;
      }
      // Reset after action
      setRecurringAction(null);
    }
  }, [recurringEditScope, recurringAction]);
  /**
   * Generate RRULE string from recurrence options
   */
  const generateRRule = () => {
    if (!isRecurring) return null;

    const freqMap = {
      DAILY: Frequency.DAILY,
      WEEKLY: Frequency.WEEKLY,
      MONTHLY: Frequency.MONTHLY,
    };

    const freq = freqMap[frequency];
    if (!freq) return null;

    // Create date the same way as in handleSubmit - local time, Date stores as UTC internally
    const [year, month, day] = formData.date.split('-').map(Number);
    const [hours, minutes] = formData.time.split(':').map(Number);
    const dtstart = new Date(year, month - 1, day, hours, minutes);

    const options: RRuleOptions = {
      freq,
      interval,
      dtstart, 
    };

    if (endType === 'until') {
      const until = new Date(untilDate);
      until.setHours(23, 59, 59, 999);
      options.until = until;
    } else if (endType === 'count') {
      options.count = occurrenceCount;
    }

    const rule = new RRule(options);
    return rule.toString();
  };

  /**
   * Update formData with generated RRULE whenever recurrence options change
   */
  useEffect(() => {
    if (isRecurring && formData.date && formData.time) {
      const rrule = generateRRule();
      updateFormData({ recurrence_rule: rrule });
    } else if (!isRecurring) {
      updateFormData({ recurrence_rule: null });
    }
  }, [isRecurring, frequency, interval, endType, untilDate, occurrenceCount, formData.date, formData.time]);

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
        .or(
          `recurrence_rule.not.is.null,and(date.gte.${monthStart.toISOString()},date.lte.${monthEnd.toISOString()})`
        )
        .order('date');

      if (lessonsError) throw lessonsError;

      const lessonsDataWithOccurrences = [];

      // Get occurrences of recurring lessons
      for (const lesson of lessonsData) {
        if (lesson.recurrence_rule) {

          
          const rrule = rrulestr(lesson.recurrence_rule);
          const occurrences = rrule.between(monthStart, monthEnd, true);
          
          for (const occurrence of occurrences) {
            lessonsDataWithOccurrences.push({
              ...lesson,
              date: occurrence.toISOString(),
            });
          }
        }

        else {
          lessonsDataWithOccurrences.push(lesson);
        }
      }

      // Dates are kept in UTC format from database
      // Conversion to local time happens in display components
      setLessons(lessonsDataWithOccurrences);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };

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
      const lessonData = {
        student_id: parseInt(formData.student_id),
        date: lessonDateTimeLocal.toISOString(),
        duration: parseInt(formData.duration),
        paid: formData.paid,
      };
      
      // Include recurrence_rule if present
      if (formData.recurrence_rule) {
        (lessonData as any).recurrence_rule = formData.recurrence_rule;
      }

      if (editingLesson && editingLesson.recurrence_rule && recurringEditScope === 'single') {
        // TODO: Implement single occurrence editing with lesson_override table
        alert('Editing single occurrence: This feature requires implementing the lesson_override table.');
      } else if (editingLesson && editingLesson.recurrence_rule && recurringEditScope === 'future') {
        // TODO: Implement series split for future occurrences
        alert('Editing future occurrences: This feature requires splitting the recurring series.');
      } else if (editingLesson) {
        // Update existing non-recurring lesson
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

    setFormData({
      student_id: lesson.student_id.toString(),
      date: format(lessonDate, 'yyyy-MM-dd'),
      time: format(lessonDate, 'HH:mm'),
      duration: lesson.duration.toString(),
      paid: lesson.paid,
      recurrence_rule: lesson.recurrence_rule || null,
    });

    setShowForm(true);
  };

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
      const { error } = await supabase
        .from('lesson')
        .delete()
        .eq('id', lesson.id);

      if (error) throw error;
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
        // TODO: Implement single occurrence deletion with lesson_override table
        alert('Deleting single occurrence: This feature requires implementing the lesson_override table.');
      } else if (recurringEditScope === 'future') {
        // TODO: Implement series deletion for future occurrences
        alert('Deleting future occurrences: This feature requires updating the UNTIL date in the recurrence rule.');
      }

      fetchData();
      resetRecurringState();
    } catch (error) {
      console.error('Error deleting lesson:', error);
      alert('Failed to delete lesson');
      resetRecurringState();
    }
  };

  /**
   * Toggles the paid status of a lesson
   * For recurring lessons, shows modal to choose update scope
   */
  const togglePaid = async (lesson: Lesson) => {
    // For recurring lessons, show scope selection modal
    if (lesson.recurrence_rule) {
      setEditingLesson(lesson);
      setRecurringAction('togglePaid');
      setShowRecurringEditModal(true);
      return;
    }

    // Simple toggle for non-recurring lessons
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
   * Performs the actual paid toggle after scope is determined for recurring lessons
   */
  const performTogglePaid = async () => {
    if (!editingLesson) return;

    try {
      if (recurringEditScope === 'single') {
        // TODO: Implement single occurrence paid toggle with lesson_override table
        alert('Toggling paid for single occurrence: This feature requires implementing the lesson_override table.');
      } else if (recurringEditScope === 'future') {
        // TODO: Implement paid toggle for future occurrences
        alert('Toggling paid for future occurrences: This feature requires splitting the series or using overrides.');
      }

      fetchData();
      resetRecurringState();
    } catch (error) {
      console.error('Error updating lesson:', error);
      alert('Failed to update lesson');
      resetRecurringState();
    }
  };

  /**
   * Resets recurring-related state after an action
   */
  const resetRecurringState = () => {
    setRecurringEditScope(null);
    setRecurringAction(null);
    setShowRecurringEditModal(false);
    setEditingLesson(null);
    setIsRecurring(false);
    setShowForm(false);
  };

  /**
   * Resets the form to its initial state
   */
  const resetForm = () => {
    setFormData({ student_id: '', date: '', time: '', duration: '60', paid: false, recurrence_rule: null });
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
    togglePaid,
    resetForm,
    handleDateClick,
    updateFormData,
    setShowForm,
    goToPreviousMonth,
    goToNextMonth,
  };
}

