import { RRule, rrulestr } from 'rrule';
import { supabase } from '../../../../lib/supabase';
import type { Lesson } from '../../../../types/database';
import type { LessonInsertData } from './types';
import * as lessonNoteService from './notes';
import { format } from 'date-fns';
import { createLesson } from './create';

const formatDate = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
}

const findOccurrenceIndex = (occurrences: Date[], target: string): number => {
  return occurrences.findIndex(
    occ => formatDate(occ) === target
  )
}

/**
 * Updates an existing lesson
 */
export async function updateLesson(
  lessonId: number,
  updatedData: LessonInsertData
): Promise<void> {
  // Fetch the lesson to check if it's recurring
  const { data: lesson, error: fetchError } = await supabase
    .from('lesson')
    .select('recurrence_rule, date')
    .eq('id', lessonId)
    .single();
  
  if (fetchError) throw fetchError;
  
  // Handle note separately
  const note = updatedData.note;
  const lessonDataWithoutNote = { ...updatedData };
  delete lessonDataWithoutNote.note;
  
  if (note !== undefined) {
    if (!lesson.recurrence_rule) {
      // Non-recurring: save to lesson_note table
      if (note) {
        await lessonNoteService.upsertLessonNote(lessonId, lesson.date, note);
      } else {
        await lessonNoteService.deleteLessonNote(lessonId, lesson.date);
      }
      lessonDataWithoutNote.note = null;
    } else {
      // Recurring: keep in lesson.note for backwards compatibility
      lessonDataWithoutNote.note = note;
    }
  }
  
  const { error } = await supabase
    .from('lesson')
    .update(lessonDataWithoutNote)
    .eq('id', lessonId);

  if (error) throw error;
}

/**
 * Updates a single occurrence of a recurring lesson by SPLITTING the series
 * 

 */
export async function updateSingleOccurrence(
  lesson: Lesson,
  updatedData: LessonInsertData
): Promise<void> {
  // Fetch the original lesson
  const { data: originalLesson, error: fetchError } = await supabase
    .from('lesson')
    .select('*')
    .eq('id', lesson.id)
    .single();

  if (fetchError) throw fetchError;

  /**
   * find occurrence date
   */
  const rrule = rrulestr(originalLesson.recurrence_rule);
  const startDate = new Date(`${originalLesson.date}T${originalLesson.time}`);
  
  // Generate all occurrences
  const endDate = rrule.options.until 
    ? new Date(rrule.options.until)
    : new Date(startDate.getTime() + 10 * 365 * 24 * 60 * 60 * 1000);
  
  const allOccurrences = rrule.between(startDate, endDate, true);
  
  const currentIndex = findOccurrenceIndex(allOccurrences, lesson.date);

  if (currentIndex === -1) {
    throw new Error('Occurrence not found in recurrence rule');
  }

  // CASE 1: First occurrence - split it out as a single lesson and create new series for the rest
  if (currentIndex === 0) {

    //update lesson to be non recurring
    await updateLesson(lesson.id, {
      ...updatedData,
      recurrence_rule: null
    });

    // Get all occurrences after this one
    const afterOccurrences = allOccurrences.slice(1);
    if (afterOccurrences.length === 0) return;

    // Create new series for remaining occurrences
    const nextOccurrence = afterOccurrences[0];
    
    if (afterOccurrences.length === 1) {
      // Only one remaining - create as single lesson
      const singleLessonData: LessonInsertData = {
        student_id: originalLesson.student_id,
        date: formatDate(nextOccurrence),
        time: originalLesson.time,
        duration: originalLesson.duration,
        note: originalLesson.note,
        recurrence_rule: null,
      };

      await createLesson(singleLessonData);

    } else {
      // Multiple remaining - create new recurring series
      const newSeriesRule = new RRule({
        ...rrule.options,
        dtstart: nextOccurrence,
      });
      
      const newSeriesData: LessonInsertData = {
        student_id: originalLesson.student_id,
        date: formatDate(nextOccurrence),
        time: originalLesson.time,
        duration: originalLesson.duration,
        note: originalLesson.note,
        recurrence_rule: newSeriesRule.toString(),
      };

      await createLesson(newSeriesData);
    }
    
    return;
  }

  // CASE 2: Middle or last occurrence - split the series
  
  // Step 1: Truncate original series to end BEFORE this occurrence
  const beforeOccurrences = allOccurrences.slice(0, currentIndex);
  
  if (beforeOccurrences.length === 0) {
    // Delete the original lesson (nothing before this occurrence)
    await supabase.from('lesson').delete().eq('id', lesson.id);
  } else if (beforeOccurrences.length === 1) {
    // Convert original to non-recurring single lesson
    await supabase
      .from('lesson')
      .update({ 
        recurrence_rule: null
      })
      .eq('id', lesson.id);
  } else {
      // Truncate the recurrence
      const untilDate = new Date(`${originalLesson.date}T${originalLesson.time}`);
      untilDate.setDate(untilDate.getDate() - 1);
      untilDate.setHours(23, 59, 59, 999);

      const truncatedRule = new RRule({
        ...rrule.options,
        until: untilDate,
      });

      await supabase
        .from('lesson')
        .update({ recurrence_rule: truncatedRule.toString() })
        .eq('id', lesson.id);
  }

  // Step 2: Create the edited occurrence as a single lesson
  const editedLessonData: LessonInsertData = {
    student_id: originalLesson.student_id,
    date: updatedData.date || lesson.date,
    time: updatedData.time || originalLesson.time,
    duration: updatedData.duration ?? originalLesson.duration,
    note: updatedData.note ?? null, 
    recurrence_rule: null, 
  };

  await createLesson(editedLessonData);

  // Step 3: Create new series for occurrences AFTER this one (if any)
  const afterOccurrences = allOccurrences.slice(currentIndex + 1);

  if (afterOccurrences.length > 0) {
    const nextOccurrence = afterOccurrences[0];
    
    if (afterOccurrences.length === 1) {
      // Only one occurrence remaining - create as single lesson
      const singleLessonData: LessonInsertData = {
        student_id: originalLesson.student_id,
        date: formatDate(nextOccurrence),
        time: originalLesson.time,
        duration: originalLesson.duration,
        note: originalLesson.note,
        recurrence_rule: null,
      };

      await createLesson(singleLessonData);

  } else {
      // Multiple occurrences - create new recurring series
      const newSeriesRule = new RRule({
        ...rrule.options,
        dtstart: nextOccurrence,
      });

      const newSeriesData: LessonInsertData = {
        student_id: originalLesson.student_id,
        date: formatDate(nextOccurrence),
        time: originalLesson.time,
        duration: originalLesson.duration,
        note: originalLesson.note,
        recurrence_rule: newSeriesRule.toString(),
      };

      await createLesson(newSeriesData);
    }
  }
}

/**
 * Updates the current and all future occurrences of a recurring lesson
 */
export async function updateCurrentAndFutureOccurrences(
  lesson: Lesson,
  updatedData: LessonInsertData
): Promise<void> {

  // Fetch original lesson
  const { data: originalLesson, error: fetchError } = await supabase
    .from('lesson')
    .select('*')
    .eq('id', lesson.id)
    .single();

  if (fetchError) throw fetchError;

  // Parse the recurrence rule
  const oldRule = rrulestr(originalLesson.recurrence_rule);
  const startDate = new Date(`${originalLesson.date}T${originalLesson.time}`);

  // Generate all occurrences
  const endDate = oldRule.options.until 
    ? new Date(oldRule.options.until)
    : new Date(startDate.getTime() + 10 * 365 * 24 * 60 * 60 * 1000);
  
  const allOccurrences = oldRule.between(startDate, endDate, true);

  const currentIndex = findOccurrenceIndex(allOccurrences, lesson.date)

  // CASE 1: First occurrence - update the lesson directly
  if (currentIndex === 0) {
    await updateLesson(lesson.id, updatedData);
    return;
  }

  // CASE 2: Not the first occurrence - split the series
  
  // Step 1: Truncate the original lesson to end before this occurrence
  const beforeOccurrences = allOccurrences.slice(0, currentIndex);
  const untilDate = new Date(`${lesson.date}T${lesson.time}`);
  untilDate.setDate(untilDate.getDate() - 1);
  untilDate.setHours(23, 59, 59, 999);

  if (beforeOccurrences.length === 0) {
    // Delete the original lesson
    await supabase.from('lesson').delete().eq('id', lesson.id);
  } else if (beforeOccurrences.length === 1) {
    // Convert to single lesson
    await supabase
      .from('lesson')
      .update({ 
        recurrence_rule: null
      })
      .eq('id', lesson.id);
  } else {
    // Truncate the recurrence
    const truncatedRule = new RRule({
      ...oldRule.options,
      until: untilDate,
    });

    await supabase
      .from('lesson')
      .update({ recurrence_rule: truncatedRule.toString() })
      .eq('id', lesson.id);
  }

  // Step 2: Create new lesson with updated data starting from this occurrence
  const newLessonData: LessonInsertData = {
    student_id: originalLesson.student_id,
    date: updatedData.date || lesson.date,
    time: updatedData.time || originalLesson.time,
    duration: updatedData.duration ?? originalLesson.duration,
    note: updatedData.note ?? originalLesson.note,
    recurrence_rule: updatedData.recurrence_rule ?? originalLesson.recurrence_rule,
  };

  await createLesson(newLessonData);
  }
