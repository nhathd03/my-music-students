import { RRule, rrulestr } from 'rrule';
import { supabase } from '../../../../lib/supabase';
import type { Lesson } from '../../../../types/database';

/**
 * Lesson Service - Delete Operations
 * Handles deleting lessons (single, recurring occurrences, etc.)
 */

/**
 * Deletes a non-recurring lesson
 */
export async function deleteLesson(lessonId: number): Promise<void> {
  const { error } = await supabase.from('lesson').delete().eq('id', lessonId);

  if (error) throw error;
}

/**
 * Checks if a given occurrence is the last occurrence in a recurring series
 */
export async function isLastOccurrence(lesson: Lesson): Promise<boolean> {
  const { data: originalLesson, error: fetchError } = await supabase
    .from('lesson')
    .select('*')
    .eq('id', lesson.id)
    .single();

  if (fetchError || !originalLesson.recurrence_rule) return false;

  const rrule = rrulestr(originalLesson.recurrence_rule);
  const startDate = new Date(originalLesson.date);
  const endDate = rrule.options.until 
    ? new Date(rrule.options.until)
    : new Date(startDate.getTime() + 10 * 365 * 24 * 60 * 60 * 1000);
  
  const allOccurrences = rrule.between(startDate, endDate, true);

  // Fetch existing overrides
  const { data: existingOverrides } = await supabase
    .from('lesson_override')
    .select('original_date, new_date')
    .eq('lesson_id', lesson.id);

  const deletedDates = new Set(
    (existingOverrides || [])
      .filter(o => o.new_date === null)
      .map(o => new Date(o.original_date).toISOString())
  );

  const visibleOccurrences = allOccurrences.filter(
    occurrence => !deletedDates.has(occurrence.toISOString())
  );

  const deletingOccurrenceISO = new Date(lesson.date).toISOString();
  const deletingIndex = visibleOccurrences.findIndex(
    occ => occ.toISOString() === deletingOccurrenceISO
  );

  return deletingIndex === visibleOccurrences.length - 1;
}

/**
 * Deletes all future occurrences of a recurring lesson
 * 
 * If the truncated recurrence rule would result in no visible
 * occurrences (either because the rule generates no dates, or all remaining occurrences
 * are individually deleted via overrides), the lesson and all its overrides are deleted entirely.
 */
export async function deleteFutureOccurrences(lesson: Lesson): Promise<void> {
  const lessonDate = new Date(lesson.date);

  // UNTIL = one day before this lesson's start
  const untilDate = new Date(lessonDate);
  untilDate.setDate(untilDate.getDate() - 1);
  untilDate.setHours(23, 59, 59, 999);

  // Fetch original lesson
  const { data, error } = await supabase
    .from('lesson')
    .select('*')
    .eq('id', lesson.id)
    .single();

  if (error) throw error;

  const originalLesson = data;
  if (!originalLesson.recurrence_rule)
    throw new Error('Lesson is not recurring.');

  // Parse and rebuild RRULE with new UNTIL date
  const oldRule = rrulestr(originalLesson.recurrence_rule);
  const updatedRule = new RRule({
    ...oldRule.options,
    until: untilDate,
  });

  // Check if the truncated rule generates any occurrences
  const startDate = new Date(originalLesson.date);
  const remainingOccurrences = updatedRule.between(startDate, untilDate, true);

  // If no occurrences remain after truncation, delete the lesson entirely
  if (remainingOccurrences.length === 0) {
    const { error: deleteLessonError } = await supabase
      .from('lesson')
      .delete()
      .eq('id', lesson.id);

    if (deleteLessonError) throw deleteLessonError;

    console.log(`Deleted lesson ${lesson.id} - no occurrences remain after truncation.`);
    return;
  }

  // Check if all remaining occurrences (before the UNTIL date) are individually deleted
  const { data: overrides, error: overridesError } = await supabase
    .from('lesson_override')
    .select('original_date, new_date')
    .eq('lesson_id', lesson.id)
    .lte('original_date', untilDate.toISOString());

  if (overridesError) throw overridesError;

  // Build set of deleted occurrence dates (overrides with null new_date)
  const deletedDates = new Set(
    (overrides || [])
      .filter(o => o.new_date === null)
      .map(o => new Date(o.original_date).toISOString())
  );

  // Count visible occurrences (not deleted)
  const visibleOccurrences = remainingOccurrences.filter(
    occurrence => !deletedDates.has(occurrence.toISOString())
  );

  // If all remaining occurrences are deleted, remove the lesson entirely
  if (visibleOccurrences.length === 0) {
    const { error: deleteOverridesError } = await supabase
      .from('lesson_override')
      .delete()
      .eq('lesson_id', lesson.id);

    if (deleteOverridesError) throw deleteOverridesError;

    const { error: deleteLessonError } = await supabase
      .from('lesson')
      .delete()
      .eq('id', lesson.id);

    if (deleteLessonError) throw deleteLessonError;

    console.log(`Deleted lesson ${lesson.id} - all remaining occurrences are individually deleted.`);
    return;
  }

  // If only one occurrence remains, convert to non-recurring lesson
  if (visibleOccurrences.length === 1) {
    // Delete all overrides (no longer needed for non-recurring lesson)
    const { error: deleteOverridesError } = await supabase
      .from('lesson_override')
      .delete()
      .eq('lesson_id', lesson.id);

    if (deleteOverridesError) throw deleteOverridesError;

    // Convert to non-recurring by removing recurrence_rule and updating date
    const { error: updateError } = await supabase
      .from('lesson')
      .update({ 
        recurrence_rule: null,
        date: visibleOccurrences[0].toISOString()
      })
      .eq('id', lesson.id);

    if (updateError) throw updateError;

    console.log(`Converted lesson ${lesson.id} to non-recurring - only one occurrence remains.`);
    return;
  }

  // Truncate the recurrence and keep the lesson
  const updatedRRule = updatedRule.toString();

  // Update the RRULE (truncate the recurrence)
  const { error: updateError } = await supabase
    .from('lesson')
    .update({ recurrence_rule: updatedRRule })
    .eq('id', lesson.id);

  if (updateError) throw updateError;

  // Delete orphaned overrides (after UNTIL)
  const { error: deleteError } = await supabase
    .from('lesson_override')
    .delete()
    .eq('lesson_id', lesson.id)
    .gt('original_date', untilDate.toISOString());

  if (deleteError) throw deleteError;

  console.log(`Truncated recurrence at ${untilDate.toISOString()} and cleaned overrides.`);
}

/**
 * Deletes a single occurrence of a recurring lesson
 * 
 * If the series only has 2 occurrences total, converts to a non-recurring lesson
 * instead of creating an override. The remaining occurrence becomes a singular lesson entry.
 * 
 * If deleting the last occurrence, truncates the RRULE instead of creating an override.
 */
export async function deleteSingleOccurrence(lesson: Lesson): Promise<void> {
  // Fetch the original lesson to check if it's recurring
  const { data: originalLesson, error: fetchError } = await supabase
    .from('lesson')
    .select('*')
    .eq('id', lesson.id)
    .single();

  if (fetchError) throw fetchError;

  // If not recurring, this shouldn't be called, but handle gracefully
  if (!originalLesson.recurrence_rule) {
    throw new Error('Cannot delete single occurrence of non-recurring lesson.');
  }

  // Parse the recurrence rule and generate all occurrences
  const rrule = rrulestr(originalLesson.recurrence_rule);
  const startDate = new Date(originalLesson.date);
  
  // Generate occurrences 
  const endDate = rrule.options.until 
    ? new Date(rrule.options.until)
    : new Date(startDate.getTime() + 10 * 365 * 24 * 60 * 60 * 1000); // 10 years
  
  const allOccurrences = rrule.between(startDate, endDate, true);

  // Fetch existing overrides to account for already deleted occurrences
  const { data: existingOverrides, error: overridesError } = await supabase
    .from('lesson_override')
    .select('original_date, new_date')
    .eq('lesson_id', lesson.id);

  if (overridesError) throw overridesError;

  // Count visible occurrences (not deleted via overrides)
  const deletedDates = new Set(
    (existingOverrides || [])
      .filter(o => o.new_date === null)
      .map(o => new Date(o.original_date).toISOString())
  );

  const visibleOccurrences = allOccurrences.filter(
    occurrence => !deletedDates.has(occurrence.toISOString())
  );

  const deletingOccurrenceISO = new Date(lesson.date).toISOString();
  const deletingIndex = visibleOccurrences.findIndex(
    occ => occ.toISOString() === deletingOccurrenceISO
  );
  const isLastOccurrence = deletingIndex === visibleOccurrences.length - 1;

  // If only 1 occurrence remains, delete the lesson entirely
  if (visibleOccurrences.length === 1) {
    // Delete all overrides first (foreign key constraint)
    const { error: deleteOverridesError } = await supabase
      .from('lesson_override')
      .delete()
      .eq('lesson_id', lesson.id);

    if (deleteOverridesError) throw deleteOverridesError;

    // Delete the lesson
    const { error: deleteLessonError } = await supabase
      .from('lesson')
      .delete()
      .eq('id', lesson.id);

    if (deleteLessonError) throw deleteLessonError;

    console.log(`Deleted lesson ${lesson.id} entirely - was the last remaining occurrence.`);
    return;
  }

  // If only 2 visible occurrences remain, convert to non-recurring
  if (visibleOccurrences.length === 2) {
    const isFirstOccurrence = visibleOccurrences[0].toISOString() === deletingOccurrenceISO;

    if (isFirstOccurrence || isLastOccurrence) {
      // Determine which occurrence to keep
      const remainingOccurrence = isFirstOccurrence 
        ? visibleOccurrences[1] 
        : visibleOccurrences[0];

      // Delete all overrides (no longer needed)
      const { error: deleteOverridesError } = await supabase
        .from('lesson_override')
        .delete()
        .eq('lesson_id', lesson.id);

      if (deleteOverridesError) throw deleteOverridesError;

      // Convert to non-recurring lesson with the remaining occurrence's date
      const { error: updateError } = await supabase
        .from('lesson')
        .update({ 
          recurrence_rule: null,
          date: remainingOccurrence.toISOString()
        })
        .eq('id', lesson.id);

      if (updateError) throw updateError;

      console.log(`Converted lesson ${lesson.id} to non-recurring - only 2 occurrences existed.`);
      return;
    }
  }

  // If deleting the last occurrence (and more than 2 remain), truncate the RRULE
  if (isLastOccurrence && visibleOccurrences.length > 2) {
    const lessonDate = new Date(lesson.date);
    const untilDate = new Date(lessonDate);
    untilDate.setDate(untilDate.getDate() - 1);
    untilDate.setHours(23, 59, 59, 999);

    // Check how many occurrences will remain after truncation
    const oldRule = rrulestr(originalLesson.recurrence_rule);
    const updatedRule = new RRule({
      ...oldRule.options,
      until: untilDate,
    });

    const startDate = new Date(originalLesson.date);
    const remainingAfterTruncate = updatedRule.between(startDate, untilDate, true);

    // Filter out already deleted occurrences
    const visibleAfterTruncate = remainingAfterTruncate.filter(
      occurrence => !deletedDates.has(occurrence.toISOString())
    );

    // If only 1 occurrence remains after truncation, convert to non-recurring
    if (visibleAfterTruncate.length === 1) {
      // Delete all overrides (no longer needed)
      const { error: deleteOverridesError } = await supabase
        .from('lesson_override')
        .delete()
        .eq('lesson_id', lesson.id);

      if (deleteOverridesError) throw deleteOverridesError;

      // Convert to non-recurring lesson with the remaining occurrence's date
      const { error: updateError } = await supabase
        .from('lesson')
        .update({ 
          recurrence_rule: null,
          date: visibleAfterTruncate[0].toISOString()
        })
        .eq('id', lesson.id);

      if (updateError) throw updateError;

      console.log(`Converted lesson ${lesson.id} to non-recurring after truncation - only 1 occurrence remains.`);
      return;
    }

    // Otherwise, truncate normally
    const { error: updateError } = await supabase
      .from('lesson')
      .update({ recurrence_rule: updatedRule.toString() })
      .eq('id', lesson.id);

    if (updateError) throw updateError;

    console.log(`Truncated recurrence to exclude last occurrence.`);
    return;
  }

  // Normal case: Create override to delete this single occurrence
  const overrideLessonData = {
    lesson_id: lesson.id,
    original_date: lesson.date,
    new_date: null,
    paid: lesson.paid,
    duration: lesson.duration,
    note: lesson.note,
  };

  const { error } = await supabase
    .from('lesson_override')
    .upsert(overrideLessonData, {
      onConflict: 'lesson_id,original_date',
      ignoreDuplicates: false,
    });

  if (error) throw error;
}

