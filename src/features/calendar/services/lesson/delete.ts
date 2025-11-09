import { RRule, rrulestr } from 'rrule';
import { supabase } from '../../../../lib/supabase';
import type { Lesson } from '../../../../types/database';
import type { LessonInsertData } from './types';

/**
 * Deletes a non-recurring lesson
 */
export async function deleteLesson(lessonId: number): Promise<void> {
  const { error } = await supabase.from('lesson').delete().eq('id', lessonId);
  if (error) throw error;
}

/**
 * Deletes all future occurrences of a recurring lesson (including the current one)
 */
export async function deleteFutureOccurrences(lesson: Lesson): Promise<void> {
  const lessonDate = new Date(lesson.date);

  // Fetch original lesson
  const { data: originalLesson, error } = await supabase
    .from('lesson')
    .select('*')
    .eq('id', lesson.id)
    .single();

  if (error) throw error;

  if (!originalLesson.recurrence_rule) {
    // Not recurring - just delete it
    await deleteLesson(lesson.id);
    return;
  }

  const rrule = rrulestr(originalLesson.recurrence_rule);
  const startDate = new Date(originalLesson.date);
  
  // If this is the first occurrence, delete the entire lesson
  if (lessonDate.toISOString() === startDate.toISOString()) {
    await deleteLesson(lesson.id);
    return;
  }

  // Truncate to end before this occurrence
  const untilDate = new Date(lessonDate);
  untilDate.setDate(untilDate.getDate() - 1);
  untilDate.setHours(23, 59, 59, 999);

  const truncatedRule = new RRule({
    ...rrule.options,
    until: untilDate,
  });

  const remainingOccurrences = truncatedRule.between(startDate, untilDate, true);

  if (remainingOccurrences.length === 0) {
    // No occurrences left - delete the lesson
    await deleteLesson(lesson.id);
  } else if (remainingOccurrences.length === 1) {
    // Only one occurrence left - convert to non-recurring
    await supabase
      .from('lesson')
      .update({ 
        recurrence_rule: null,
        date: remainingOccurrences[0].toISOString()
      })
      .eq('id', lesson.id);
  } else {
    // Truncate the recurrence
    await supabase
      .from('lesson')
      .update({ recurrence_rule: truncatedRule.toString() })
      .eq('id', lesson.id);
  }

  console.log(`Deleted future occurrences from ${lessonDate.toISOString()}`);
}

/**
 * Deletes a single occurrence of a recurring lesson by SPLITTING the series
 */
export async function deleteSingleOccurrence(lesson: Lesson): Promise<void> {
  // Fetch the original lesson
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
  const startDate = new Date(originalLesson.date);
  const lessonDate = new Date(lesson.date);
  
  // Generate all occurrences
  const endDate = rrule.options.until 
    ? new Date(rrule.options.until)
    : new Date(startDate.getTime() + 10 * 365 * 24 * 60 * 60 * 1000);
  
  const allOccurrences = rrule.between(startDate, endDate, true);

  const currentIndex = allOccurrences.findIndex(
    occ => occ.toISOString() === lesson.date
  );

  if (currentIndex === -1) {
    throw new Error('Occurrence not found in recurrence rule');
  }

  // Only one occurrence total - delete the lesson
  if (allOccurrences.length === 1) {
    await deleteLesson(lesson.id);
    return;
  }

  // Only two occurrences - keep the other one as single lesson
  if (allOccurrences.length === 2) {
    const remainingOccurrence = currentIndex === 0 
      ? allOccurrences[1] 
      : allOccurrences[0];

    await supabase
      .from('lesson')
      .update({ 
        recurrence_rule: null,
        date: remainingOccurrence.toISOString()
      })
      .eq('id', lesson.id);

    console.log(`Converted to single lesson - only 2 occurrences existed`);
    return;
  }

  // First occurrence - truncate from start
  if (currentIndex === 0) {
    const nextOccurrence = allOccurrences[1];
    const afterOccurrences = allOccurrences.slice(1);

    if (afterOccurrences.length === 1) {
      // Only one left - convert to single
      await supabase
        .from('lesson')
        .update({ 
          recurrence_rule: null,
          date: nextOccurrence.toISOString()
        })
        .eq('id', lesson.id);
    } else {
      // Update to start from next occurrence
      const newRule = new RRule({
        ...rrule.options,
        dtstart: nextOccurrence,
      });

      await supabase
        .from('lesson')
        .update({ 
          date: nextOccurrence.toISOString(),
          recurrence_rule: newRule.toString()
        })
        .eq('id', lesson.id);
    }

    console.log(`Deleted first occurrence, series continues from ${nextOccurrence.toISOString()}`);
    return;
  }

  // Last occurrence - truncate at end
  if (currentIndex === allOccurrences.length - 1) {
    const beforeOccurrences = allOccurrences.slice(0, currentIndex);
    const untilDate = new Date(lessonDate);
    untilDate.setDate(untilDate.getDate() - 1);
    untilDate.setHours(23, 59, 59, 999);

    if (beforeOccurrences.length === 1) {
      // Only one left - convert to single
      await supabase
        .from('lesson')
        .update({ 
          recurrence_rule: null,
          date: beforeOccurrences[0].toISOString()
        })
        .eq('id', lesson.id);
    } else {
      // Truncate the series
      const truncatedRule = new RRule({
        ...rrule.options,
        until: untilDate,
      });

      await supabase
        .from('lesson')
        .update({ recurrence_rule: truncatedRule.toString() })
        .eq('id', lesson.id);
    }

    console.log(`Deleted last occurrence, series ends at ${untilDate.toISOString()}`);
    return;
  }

  // Middle occurrence - split into before + after series
  const beforeOccurrences = allOccurrences.slice(0, currentIndex);
  const afterOccurrences = allOccurrences.slice(currentIndex + 1);

  // Truncate original to end before this occurrence
  const untilDate = new Date(lessonDate);
  untilDate.setDate(untilDate.getDate() - 1);
  untilDate.setHours(23, 59, 59, 999);

  if (beforeOccurrences.length === 1) {
    // Convert original to single lesson
    await supabase
      .from('lesson')
      .update({ 
        recurrence_rule: null,
        date: beforeOccurrences[0].toISOString()
      })
      .eq('id', lesson.id);
  } else {
    // Truncate the series
    const truncatedRule = new RRule({
      ...rrule.options,
      until: untilDate,
    });

    await supabase
      .from('lesson')
      .update({ recurrence_rule: truncatedRule.toString() })
      .eq('id', lesson.id);
  }

  // Create new series for occurrences after this one
  const nextOccurrence = afterOccurrences[0];

  if (afterOccurrences.length === 1) {
    // Create single lesson
    const singleLessonData: LessonInsertData = {
      student_id: originalLesson.student_id,
      date: nextOccurrence.toISOString(),
      duration: originalLesson.duration,
      note: originalLesson.note,
      recurrence_rule: null,
    };

    await supabase.from('lesson').insert([singleLessonData]);
  } else {
    // Create new recurring series
    const newRule = new RRule({
      ...rrule.options,
      dtstart: nextOccurrence,
    });

    const newSeriesData: LessonInsertData = {
      student_id: originalLesson.student_id,
      date: nextOccurrence.toISOString(),
      duration: originalLesson.duration,
      note: originalLesson.note,
      recurrence_rule: newRule.toString(),
    };

    await supabase.from('lesson').insert([newSeriesData]);
  }

  console.log(`Split series: before=${beforeOccurrences.length}, deleted=1, after=${afterOccurrences.length}`);
}
