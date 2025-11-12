import { RRule, rrulestr } from 'rrule';
import { format } from 'date-fns';
import { supabase } from '../../../../lib/supabase';
import type { Lesson } from '../../../../types/database';
import type { LessonInsertData } from './types';
import * as lessonNoteService from './notes';
import { createLesson } from './create';
import { extractLocalDateFromUTC, extractLocalTimeFromUTC } from '../../utils/dateUtils';

const formatDate = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

const findOccurrenceIndex = (occurrences: Date[], target: string): number => {
  return occurrences.findIndex(occ => formatDate(occ) === target);
};

const getOccurrenceEndDate = (rrule: RRule, startDate: Date): Date => {
  return rrule.options.until 
    ? new Date(rrule.options.until)
    : new Date(startDate.getTime() + 10 * 365 * 24 * 60 * 60 * 1000);
};

const constructTimestampWithLocalTime = (occurrenceDate: Date, localTime: string): string => {
  return new Date(`${formatDate(occurrenceDate)}T${localTime}`).toISOString();
};

/**
 * Updates an existing lesson
 */
export async function updateLesson(
  lessonId: number,
  updatedData: LessonInsertData
): Promise<void> {
  const { data: lesson, error: fetchError } = await supabase
    .from('lesson')
    .select('recurrence_rule, timestamp')
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
      const lessonDate = extractLocalDateFromUTC(lesson.timestamp);
      if (note) {
        await lessonNoteService.upsertLessonNote(lessonId, lessonDate, note);
      } else {
        await lessonNoteService.deleteLessonNote(lessonId, lessonDate);
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
 * Creates a single lesson from occurrence data
 */
async function createSingleLessonFromOccurrence(
  studentId: number,
  occurrenceDate: Date,
  localTime: string,
  duration: number,
  note: string | null
): Promise<void> {
  const timestamp = constructTimestampWithLocalTime(occurrenceDate, localTime);
  const lessonData: LessonInsertData = {
    student_id: studentId,
    timestamp,
    duration,
    note,
    recurrence_rule: null,
  };
  await createLesson(lessonData);
}

/**
 * Creates a recurring series from occurrence data
 */
async function createRecurringSeriesFromOccurrence(
  studentId: number,
  occurrenceDate: Date,
  localTime: string,
  duration: number,
  note: string | null,
  rruleOptions: any
): Promise<void> {
  const newSeriesRule = new RRule({
    ...rruleOptions,
    dtstart: occurrenceDate,
  });
  
  const timestamp = constructTimestampWithLocalTime(occurrenceDate, localTime);
  const lessonData: LessonInsertData = {
    student_id: studentId,
    timestamp,
    duration,
    note,
    recurrence_rule: newSeriesRule.toString(),
  };
  await createLesson(lessonData);
}

/**
 * Handles remaining occurrences after a split
 */
async function handleRemainingOccurrences(
  afterOccurrences: Date[],
  originalLesson: Lesson,
  rruleOptions: any
): Promise<void> {
  if (afterOccurrences.length === 0) return;

  const nextOccurrence = afterOccurrences[0];
  const localTime = extractLocalTimeFromUTC(originalLesson.timestamp);

  if (afterOccurrences.length === 1) {
    await createSingleLessonFromOccurrence(
      originalLesson.student_id,
      nextOccurrence,
      localTime,
      originalLesson.duration,
      originalLesson.note
    );
  } else {
    await createRecurringSeriesFromOccurrence(
      originalLesson.student_id,
      nextOccurrence,
      localTime,
      originalLesson.duration,
      originalLesson.note,
      rruleOptions
    );
  }
}

/**
 * Truncates a lesson series to end before a given occurrence
 */
async function truncateLessonSeries(
  lesson: Lesson,
  beforeOccurrences: Date[],
  rruleOptions: any,
  untilDate: Date
): Promise<void> {
  if (beforeOccurrences.length === 0) {
    await supabase.from('lesson').delete().eq('id', lesson.id);
  } else if (beforeOccurrences.length === 1) {
    await supabase
      .from('lesson')
      .update({ recurrence_rule: null })
      .eq('id', lesson.id);
  } else {
    const truncatedRule = new RRule({
      ...rruleOptions,
      until: untilDate,
    });

    await supabase
      .from('lesson')
      .update({ recurrence_rule: truncatedRule.toString() })
      .eq('id', lesson.id);
  }
}

/**
 * Updates a single occurrence of a recurring lesson by splitting the series
 */
export async function updateSingleOccurrence(
  lesson: Lesson,
  updatedData: LessonInsertData
): Promise<void> {
  const { data: originalLesson, error: fetchError } = await supabase
    .from('lesson')
    .select('*')
    .eq('id', lesson.id)
    .single();

  if (fetchError) throw fetchError;

  const rrule = rrulestr(originalLesson.recurrence_rule);
  const startDate = new Date(originalLesson.timestamp);
  const endDate = getOccurrenceEndDate(rrule, startDate);
  const allOccurrences = rrule.between(startDate, endDate, true);

  // CASE 1: First occurrence

  const originalTimestampDate = new Date(originalLesson.timestamp);
  const lessonTimestampDate = new Date(lesson.timestamp);
  if (originalTimestampDate.getTime() === lessonTimestampDate.getTime()) {
      await updateLesson(lesson.id, {
        ...updatedData,
        recurrence_rule: null
      });
  
      const afterOccurrences = rrule.between(startDate, endDate, true).slice(1);
      await handleRemainingOccurrences(afterOccurrences, originalLesson, rrule.options);
      return;
    }
  if (!originalLesson.recurrence_rule) {
    throw new Error('Cannot update single occurrence of non-recurring lesson.');
  }


  
  const lessonDate = extractLocalDateFromUTC(lesson.timestamp);
  const currentIndex = findOccurrenceIndex(allOccurrences, lessonDate);

  if (currentIndex === -1) {
    // Compare timestamps by converting both to Date objects
    // This handles cases where one has 'Z' and the other doesn't
    const originalTimestampDate = new Date(originalLesson.timestamp);
    const lessonTimestampDate = new Date(lesson.timestamp);
    if (originalTimestampDate.getTime() === lessonTimestampDate.getTime()) {
      await updateLesson(lesson.id, {
        ...updatedData,
        recurrence_rule: null
      });
      return;
    } else {
      throw new Error('Occurrence not found in recurrence rule');
    }
  }



  // CASE 2: Middle or last occurrence
  const beforeOccurrences = allOccurrences.slice(0, currentIndex);
  const untilDate = new Date(lesson.timestamp);
  untilDate.setDate(untilDate.getDate() - 1);
  untilDate.setHours(23, 59, 59, 999);
  await truncateLessonSeries(lesson, beforeOccurrences, rrule.options, untilDate);

  // Create the edited occurrence as a single lesson
  const editedTimestamp = updatedData.timestamp || lesson.timestamp;
  const editedLessonData: LessonInsertData = {
    student_id: originalLesson.student_id,
    timestamp: editedTimestamp,
    duration: updatedData.duration ?? originalLesson.duration,
    note: updatedData.note ?? null,
    recurrence_rule: null,
  };
  await createLesson(editedLessonData);

  // Handle occurrences after this one
  const afterOccurrences = allOccurrences.slice(currentIndex + 1);
  await handleRemainingOccurrences(afterOccurrences, originalLesson, rrule.options);
}

/**
 * Updates the current and all future occurrences of a recurring lesson
 */
export async function updateCurrentAndFutureOccurrences(
  lesson: Lesson,
  updatedData: LessonInsertData
): Promise<void> {
  const { data: originalLesson, error: fetchError } = await supabase
    .from('lesson')
    .select('*')
    .eq('id', lesson.id)
    .single();

  if (fetchError) throw fetchError;

  const oldRule = rrulestr(originalLesson.recurrence_rule);
  const startDate = new Date(originalLesson.timestamp);
  const endDate = getOccurrenceEndDate(oldRule, startDate);
  const allOccurrences = oldRule.between(startDate, endDate, true);

  const lessonDate = extractLocalDateFromUTC(lesson.timestamp);
  const currentIndex = findOccurrenceIndex(allOccurrences, lessonDate);

  // CASE 1: First occurrence
  if (currentIndex === 0) {
    await updateLesson(lesson.id, updatedData);
    return;
  }

  // CASE 2: Not the first occurrence
  const beforeOccurrences = allOccurrences.slice(0, currentIndex);
  const untilDate = new Date(lesson.timestamp);
  untilDate.setDate(untilDate.getDate() - 1);
  untilDate.setHours(23, 59, 59, 999);
  await truncateLessonSeries(lesson, beforeOccurrences, oldRule.options, untilDate);

  // Create new lesson with updated data starting from this occurrence
  const newLessonData: LessonInsertData = {
    student_id: originalLesson.student_id,
    timestamp: updatedData.timestamp || lesson.timestamp,
    duration: updatedData.duration ?? originalLesson.duration,
    note: updatedData.note ?? originalLesson.note,
    recurrence_rule: updatedData.recurrence_rule ?? originalLesson.recurrence_rule,
  };
  await createLesson(newLessonData);
}