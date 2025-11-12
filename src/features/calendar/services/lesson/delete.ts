import { RRule, rrulestr } from 'rrule';
import { format } from 'date-fns';
import { supabase } from '../../../../lib/supabase';
import type { Lesson } from '../../../../types/database';
import type { LessonInsertData } from './types';
import { createLesson } from './create';
import { extractLocalDateFromUTC, extractLocalTimeFromUTC } from '../../utils/dateUtils';

const formatDate = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

const getOccurrenceEndDate = (rrule: RRule, startDate: Date): Date => {
  return rrule.options.until 
    ? new Date(rrule.options.until)
    : new Date(startDate.getTime() + 10 * 365 * 24 * 60 * 60 * 1000);
};

const constructTimestampWithLocalTime = (occurrenceDate: Date, localTime: string): string => {
  return new Date(`${formatDate(occurrenceDate)}T${localTime}`).toISOString();
};

const createUntilDate = (timestamp: string): Date => {
  const untilDate = new Date(timestamp);
  untilDate.setDate(untilDate.getDate() - 1);
  untilDate.setHours(23, 59, 59, 999);
  return untilDate;
};

/**
 * Deletes a non-recurring lesson
 */
export async function deleteLesson(lessonId: number): Promise<void> {
  const { error } = await supabase.from('lesson').delete().eq('id', lessonId);
  if (error) throw error;
}

/**
 * Updates lesson to be non-recurring with a new timestamp
 */
async function convertToSingleLesson(
  lessonId: number,
  occurrenceDate: Date,
  localTime: string
): Promise<void> {
  const newTimestamp = constructTimestampWithLocalTime(occurrenceDate, localTime);
  await supabase
    .from('lesson')
    .update({ 
      recurrence_rule: null,
      timestamp: newTimestamp
    })
    .eq('id', lessonId);
}

/**
 * Creates a single lesson from occurrence data
 */
async function createSingleLessonFromOccurrence(
  originalLesson: Lesson,
  occurrenceDate: Date,
  localTime: string
): Promise<void> {
  const timestamp = constructTimestampWithLocalTime(occurrenceDate, localTime);
  const lessonData: LessonInsertData = {
    student_id: originalLesson.student_id,
    timestamp,
    duration: originalLesson.duration,
    note: originalLesson.note,
    recurrence_rule: null,
  };
  await createLesson(lessonData);
}

/**
 * Creates a recurring series from occurrence data
 */
async function createRecurringSeriesFromOccurrence(
  originalLesson: Lesson,
  occurrenceDate: Date,
  localTime: string,
  rruleOptions: any
): Promise<void> {
  const newRule = new RRule({
    ...rruleOptions,
    dtstart: occurrenceDate,
  });
  
  const timestamp = constructTimestampWithLocalTime(occurrenceDate, localTime);
  const lessonData: LessonInsertData = {
    student_id: originalLesson.student_id,
    timestamp,
    duration: originalLesson.duration,
    note: originalLesson.note,
    recurrence_rule: newRule.toString(),
  };
  await createLesson(lessonData);
}

/**
 * Deletes all future occurrences of a recurring lesson (including the current one)
 */
export async function deleteFutureOccurrences(lesson: Lesson): Promise<void> {
  const { data: originalLesson, error } = await supabase
    .from('lesson')
    .select('*')
    .eq('id', lesson.id)
    .single();

  if (error) throw error;

  const rrule = rrulestr(originalLesson.recurrence_rule);
  const startDate = new Date(originalLesson.timestamp);
  
  // Compare timestamps by converting both to Date objects and comparing
  // This handles cases where one has 'Z' and the other doesn't
  const originalTimestampDate = new Date(originalLesson.timestamp);
  const lessonTimestampDate = new Date(lesson.timestamp);
  
  // If this is the first occurrence, delete the entire lesson
  if (originalTimestampDate.getTime() === lessonTimestampDate.getTime()) {
    await deleteLesson(lesson.id);
    return;
  }

  // Truncate to end before this occurrence
  const untilDate = createUntilDate(lesson.timestamp);
  const truncatedRule = new RRule({
    ...rrule.options,
    until: untilDate,
  });

  const remainingOccurrences = truncatedRule.between(startDate, untilDate, true);

  if (remainingOccurrences.length === 0) {
    await deleteLesson(lesson.id);
  } else if (remainingOccurrences.length === 1) {
    const localTime = extractLocalTimeFromUTC(originalLesson.timestamp);
    await convertToSingleLesson(lesson.id, remainingOccurrences[0], localTime);
  } else {
    await supabase
      .from('lesson')
      .update({ recurrence_rule: truncatedRule.toString() })
      .eq('id', lesson.id);
  }
}

/**
 * Deletes a single occurrence of a recurring lesson by splitting the series
 */
export async function deleteSingleOccurrence(lesson: Lesson): Promise<void> {
  const { data: originalLesson, error: fetchError } = await supabase
    .from('lesson')
    .select('*')
    .eq('id', lesson.id)
    .single();

  if (fetchError) throw fetchError;

  if (!originalLesson.recurrence_rule) {
    throw new Error('Cannot delete single occurrence of non-recurring lesson.');
  }

  const rrule = rrulestr(originalLesson.recurrence_rule);
  const startDate = new Date(originalLesson.timestamp);
  const endDate = getOccurrenceEndDate(rrule, startDate);
  const allOccurrences = rrule.between(startDate, endDate, true);

  // Check if this is the first occurrence by comparing to the original lesson timestamp
  // Note: rrule.between() excludes the dtstart date, so the first occurrence is not in the array
  const originalTimestampDate = new Date(originalLesson.timestamp);
  const lessonTimestampDate = new Date(lesson.timestamp);
  
  let currentIndex: number;
  
  if (originalTimestampDate.getTime() === lessonTimestampDate.getTime()) {
    // This is the first occurrence (dtstart), which is not included in allOccurrences
    currentIndex = -1; // Use -1 to indicate it's the first occurrence (before index 0)
  } else {
    // Search in the allOccurrences array
    const lessonDate = extractLocalDateFromUTC(lesson.timestamp);
    currentIndex = allOccurrences.findIndex(occ => formatDate(occ) === lessonDate);
    
    if (currentIndex === -1) {
      throw new Error('Occurrence not found in recurrence rule');
    }
  }
  
  // Calculate total occurrences (allOccurrences.length + 1, since first occurrence is not in array)
  const totalOccurrences = allOccurrences.length + 1;

  const localTime = extractLocalTimeFromUTC(originalLesson.timestamp);

  // Only one occurrence total - delete the lesson
  if (totalOccurrences === 1) {
    await deleteLesson(lesson.id);
    return;
  }

  // Only two occurrences - keep the other one as single lesson
  if (totalOccurrences === 2) {
    if (currentIndex === -1) {
      // Deleting the first occurrence, so keep the second (allOccurrences[0])
      await convertToSingleLesson(lesson.id, allOccurrences[0], localTime);
    } else {
      // Deleting the second occurrence, so keep the first (original timestamp)
      // Just remove recurrence_rule, keep the original timestamp
      await supabase
        .from('lesson')
        .update({ 
          recurrence_rule: null
        })
        .eq('id', lesson.id);
    }
    return;
  }

  // First occurrence - shift series to start from next occurrence
  if (currentIndex === -1) {
    // The next occurrence after the first one is at index 0 in allOccurrences
    const nextOccurrence = allOccurrences[0];
    const newRule = new RRule({
      ...rrule.options,
      dtstart: nextOccurrence,
    });

    const newTimestamp = constructTimestampWithLocalTime(nextOccurrence, localTime);
    await supabase
      .from('lesson')
      .update({ 
        timestamp: newTimestamp,
        recurrence_rule: newRule.toString()
      })
      .eq('id', lesson.id);
    return;
  }

  // Last occurrence - truncate at end
  if (currentIndex === allOccurrences.length - 1) {
    const untilDate = createUntilDate(lesson.timestamp);
    const truncatedRule = new RRule({
      ...rrule.options,
      until: untilDate,
    });

    await supabase
      .from('lesson')
      .update({ recurrence_rule: truncatedRule.toString() })
      .eq('id', lesson.id);
    return;
  }

  // Middle occurrence - split into before + after series
  const beforeOccurrences = allOccurrences.slice(0, currentIndex);
  const afterOccurrences = allOccurrences.slice(currentIndex + 1);

  // Handle the "before" part
  const untilDate = createUntilDate(lesson.timestamp);
  
  // Calculate total before occurrences (including the first one which is not in the array)
  const totalBeforeOccurrences = beforeOccurrences.length + 1; // +1 for the original first occurrence
  
  if (totalBeforeOccurrences === 1) {
    // Only the first occurrence remains - convert original to single lesson
    // Keep the original timestamp (first occurrence)
    await supabase
      .from('lesson')
      .update({ 
        recurrence_rule: null
      })
      .eq('id', lesson.id);
  } else if (totalBeforeOccurrences === 2) {
    // Two occurrences before this one: the first (original) and one from beforeOccurrences
    await convertToSingleLesson(lesson.id, beforeOccurrences[0], localTime);
  } else {
    const truncatedRule = new RRule({
      ...rrule.options,
      until: untilDate,
    });

    await supabase
      .from('lesson')
      .update({ recurrence_rule: truncatedRule.toString() })
      .eq('id', lesson.id);
  }

  // Handle the "after" part
  const nextOccurrence = afterOccurrences[0];
  
  if (afterOccurrences.length === 1) {
    await createSingleLessonFromOccurrence(originalLesson, nextOccurrence, localTime);
  } else {
    await createRecurringSeriesFromOccurrence(originalLesson, nextOccurrence, localTime, rrule.options);
  }
}