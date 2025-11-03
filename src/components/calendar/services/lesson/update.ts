import { RRule, rrulestr } from 'rrule';
import { supabase } from '../../../../lib/supabase';
import type { Lesson } from '../../../../types/database';
import type { LessonInsertData } from './types';
import { isOverrideRedundant } from './helpers';

/**
 * Lesson Service - Update Operations
 * Handles updating lessons (single, recurring, paid status, etc.)
 */

/**
 * Updates an existing lesson
 */
export async function updateLesson(
  lessonId: number,
  lessonData: Partial<LessonInsertData>
): Promise<void> {
  const { error } = await supabase
    .from('lesson')
    .update(lessonData)
    .eq('id', lessonId);

  if (error) throw error;
}

/**
 * Updates the paid status of a lesson (recurring or non-recurring)
 */
export async function toggleLessonPaid(lesson: Lesson): Promise<void> {
  if (lesson.recurrence_rule) {
    const lessonDateISO = lesson.date;

    // Fetch the original lesson from database (not the merged version with overrides)
    const { data: originalLesson, error: fetchError } = await supabase
      .from('lesson')
      .select('*')
      .eq('id', lesson.id)
      .single();

    if (fetchError) throw fetchError;

    // Check if an override already exists where new_date matches this occurrence
    // This handles cases where the occurrence was rescheduled
    const { data: existingByNewDate } = await supabase
      .from('lesson_override')
      .select('*')
      .eq('lesson_id', lesson.id)
      .eq('new_date', lessonDateISO)
      .maybeSingle();

    // Also check for override where original_date matches (non-rescheduled)
    const { data: existingByOriginalDate } = await supabase
      .from('lesson_override')
      .select('*')
      .eq('lesson_id', lesson.id)
      .eq('original_date', lessonDateISO)
      .maybeSingle();

    // Use whichever override exists (prioritize new_date match for rescheduled events)
    const existing = existingByNewDate || existingByOriginalDate;
    const originalDate = existing?.original_date || lessonDateISO;

    const newPaid = existing ? !existing.paid : !lesson.paid;

    const overrideLessonData = {
      lesson_id: lesson.id,
      original_date: originalDate,
      // Preserve existing override data if it exists
      new_date: existing?.new_date || originalDate,
      paid: newPaid,
      duration: existing?.duration || originalLesson.duration,
      note: existing?.note || originalLesson.note,
    };

    // Check if the override would be redundant after toggling paid
    if (isOverrideRedundant(overrideLessonData, originalLesson, originalDate)) {
      // Delete the redundant override
      const { error } = await supabase
        .from('lesson_override')
        .delete()
        .eq('lesson_id', lesson.id)
        .eq('original_date', originalDate);

      if (error) throw error;
    } else {
      // Create or update the override
      const { error } = await supabase
        .from('lesson_override')
        .upsert(overrideLessonData, {
          onConflict: 'lesson_id,original_date',
          ignoreDuplicates: false,
        });

      if (error) throw error;
    }
  } else {
    // Non-recurring lesson - update directly
    const { error } = await supabase
      .from('lesson')
      .update({ paid: !lesson.paid })
      .eq('id', lesson.id);

    if (error) throw error;
  }
}

/**
 * Updates a single occurrence of a recurring lesson by creating/updating an override
 */
export async function updateSingleOccurrence(
  lesson: Lesson,
  displayedDate: string,
  updatedData: Partial<LessonInsertData>
): Promise<void> {
  // Fetch the original lesson from database (not the merged version with overrides)
  const { data: originalLesson, error: fetchError } = await supabase
    .from('lesson')
    .select('*')
    .eq('id', lesson.id)
    .single();

  if (fetchError) throw fetchError;

  // Check if an override already exists where new_date matches the displayed date
  // This handles cases where we're editing an already-overridden occurrence
  const { data: existingByNewDate } = await supabase
    .from('lesson_override')
    .select('*')
    .eq('lesson_id', lesson.id)
    .eq('new_date', displayedDate)
    .maybeSingle();

  // Also check for override where original_date matches
  const { data: existingByOriginalDate } = await supabase
    .from('lesson_override')
    .select('*')
    .eq('lesson_id', lesson.id)
    .eq('original_date', displayedDate)
    .maybeSingle();

  // Use whichever override exists (prioritize new_date match)
  const existing = existingByNewDate || existingByOriginalDate;
  
  // Use the true original RRULE date (from existing override, or displayedDate if no override)
  const trueOriginalDate = existing?.original_date || displayedDate;

  // Create override with updated data
  const overrideData = {
    lesson_id: lesson.id,
    original_date: trueOriginalDate,
    new_date: updatedData.date || trueOriginalDate,
    paid: updatedData.paid ?? originalLesson.paid,
    duration: updatedData.duration ?? originalLesson.duration,
    note: originalLesson.note,
  };

  // Check if the override would be redundant (matches original lesson)
  if (isOverrideRedundant(overrideData, originalLesson, trueOriginalDate)) {
    // Delete the redundant override if it exists
    const { error } = await supabase
      .from('lesson_override')
      .delete()
      .eq('lesson_id', lesson.id)
      .eq('original_date', trueOriginalDate);

    if (error) throw error;
    console.log(`Deleted redundant override for lesson ${lesson.id} at ${trueOriginalDate}`);
  } else {
    // Create or update the override
    const { error } = await supabase
      .from('lesson_override')
      .upsert(overrideData, {
        onConflict: 'lesson_id,original_date',
        ignoreDuplicates: false,
      });

    if (error) throw error;
  }
}

/**
 * Updates the current and all future occurrences of a recurring lesson
 * 
 * This function:
 * 1. Truncates the original lesson to end before this occurrence
 * 2. Creates a new recurring lesson starting from this occurrence with updated data
 * 3. Handles edge cases:
 *    - If this is the first occurrence, updates the lesson directly instead of splitting
 *    - If truncation results in 0 visible occurrences, deletes the old lesson
 *    - If truncation results in 1 visible occurrence, converts the old lesson to non-recurring
 *    - If the current occurrence is an override, deletes the override before proceeding
 */
export async function updateCurrentAndFutureOccurrences(
  lesson: Lesson,
  updatedData: Partial<LessonInsertData>
): Promise<void> {
  const displayedDateISO = new Date(lesson.date).toISOString();

  // Fetch original lesson
  const { data: originalLesson, error: fetchError } = await supabase
    .from('lesson')
    .select('*')
    .eq('id', lesson.id)
    .single();

  if (fetchError) throw fetchError;

  if (!originalLesson.recurrence_rule) {
    throw new Error('Lesson is not recurring.');
  }

  // Check if this occurrence is an override (rescheduled from original RRULE date)
  const { data: existingByNewDate } = await supabase
    .from('lesson_override')
    .select('*')
    .eq('lesson_id', lesson.id)
    .eq('new_date', displayedDateISO)
    .maybeSingle();

  // Check for override where original_date matches (non-rescheduled override)
  const { data: existingByOriginalDate } = await supabase
    .from('lesson_override')
    .select('*')
    .eq('lesson_id', lesson.id)
    .eq('original_date', displayedDateISO)
    .maybeSingle();

  // Use whichever override exists
  const existingOverride = existingByNewDate || existingByOriginalDate;
  
  // Use the true original RRULE date (from existing override, or displayedDate if no override)
  const trueOriginalDateISO = existingOverride?.original_date || displayedDateISO;

  // If this occurrence is an override, delete it before proceeding with the split
  if (existingOverride) {
    const { error: deleteOverrideError } = await supabase
      .from('lesson_override')
      .delete()
      .eq('lesson_id', lesson.id)
      .eq('original_date', existingOverride.original_date);

    if (deleteOverrideError) throw deleteOverrideError;
    
    console.log(`Deleted override at ${existingOverride.original_date} before splitting series.`);
  }

  // Use the true original RRULE date for all subsequent logic
  const lessonDate = new Date(trueOriginalDateISO);

  // Parse the recurrence rule
  const oldRule = rrulestr(originalLesson.recurrence_rule);
  const startDate = new Date(originalLesson.date);

  // Generate all occurrences to find if this is the first one
  const endDate = oldRule.options.until 
    ? new Date(oldRule.options.until)
    : new Date(startDate.getTime() + 10 * 365 * 24 * 60 * 60 * 1000);
  
  const allOccurrences = oldRule.between(startDate, endDate, true);

  // Fetch existing overrides to account for deleted occurrences
  const { data: existingOverrides, error: overridesError } = await supabase
    .from('lesson_override')
    .select('original_date, new_date')
    .eq('lesson_id', lesson.id);

  if (overridesError) throw overridesError;

  const deletedDates = new Set(
    (existingOverrides || [])
      .filter(o => o.new_date === null)
      .map(o => new Date(o.original_date).toISOString())
  );

  const visibleOccurrences = allOccurrences.filter(
    occurrence => !deletedDates.has(occurrence.toISOString())
  );

  // Use the true original RRULE date for comparison
  const currentIndex = visibleOccurrences.findIndex(
    occ => occ.toISOString() === trueOriginalDateISO
  );

  const isFirstOccurrence = currentIndex === 0;

  // CASE 1: If this is the first occurrence, just update the lesson directly
  if (isFirstOccurrence) {
    const updatePayload: any = {};
    
    if (updatedData.date !== undefined) {
      // If date changed, update the start date of the recurrence
      updatePayload.date = updatedData.date;
    }
    if (updatedData.duration !== undefined) {
      updatePayload.duration = updatedData.duration;
    }
    if (updatedData.paid !== undefined) {
      updatePayload.paid = updatedData.paid;
    }
    if (updatedData.recurrence_rule !== undefined) {
      updatePayload.recurrence_rule = updatedData.recurrence_rule;
    }

    const { error: updateError } = await supabase
      .from('lesson')
      .update(updatePayload)
      .eq('id', lesson.id);

    if (updateError) throw updateError;

    // Delete all overrides since we're updating the base lesson
    const { error: deleteOverridesError } = await supabase
      .from('lesson_override')
      .delete()
      .eq('lesson_id', lesson.id);

    if (deleteOverridesError) throw deleteOverridesError;

    console.log(`Updated lesson ${lesson.id} directly - was first occurrence.`);
    return;
  }

  // CASE 2: This is NOT the first occurrence, so we need to split the series
  
  // Step 1: Truncate the original lesson to end before this occurrence
  const untilDate = new Date(lessonDate);
  untilDate.setDate(untilDate.getDate() - 1);
  untilDate.setHours(23, 59, 59, 999);

  const truncatedRule = new RRule({
    ...oldRule.options,
    until: untilDate,
  });

  const remainingOccurrences = truncatedRule.between(startDate, untilDate, true);

  // Check visible occurrences before this date
  const visibleBeforeOccurrences = remainingOccurrences.filter(
    occurrence => !deletedDates.has(occurrence.toISOString())
  );

  // Step 2: Create the new lesson with updated data starting from this occurrence
  const newLessonData: LessonInsertData = {
    student_id: originalLesson.student_id,
    date: updatedData.date || trueOriginalDateISO,
    duration: updatedData.duration ?? originalLesson.duration,
    paid: updatedData.paid ?? originalLesson.paid,
    recurrence_rule: updatedData.recurrence_rule ?? originalLesson.recurrence_rule,
  };

  const { error: createError } = await supabase
    .from('lesson')
    .insert([newLessonData]);

  if (createError) throw createError;

  // Step 3: Handle the old lesson based on remaining visible occurrences
  if (visibleBeforeOccurrences.length === 0) {
    // No visible occurrences remain in the old series - delete it entirely
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

    console.log(`Deleted old lesson ${lesson.id} - no visible occurrences remained before split.`);
  } else if (visibleBeforeOccurrences.length === 1) {
    // Only one occurrence remains - convert to non-recurring
    const { error: deleteOverridesError } = await supabase
      .from('lesson_override')
      .delete()
      .eq('lesson_id', lesson.id);

    if (deleteOverridesError) throw deleteOverridesError;

    const { error: updateError } = await supabase
      .from('lesson')
      .update({ 
        recurrence_rule: null,
        date: visibleBeforeOccurrences[0].toISOString()
      })
      .eq('id', lesson.id);

    if (updateError) throw updateError;

    console.log(`Converted old lesson ${lesson.id} to non-recurring - only 1 occurrence remained before split.`);
  } else {
    // Multiple occurrences remain - truncate the recurrence
    const { error: updateError } = await supabase
      .from('lesson')
      .update({ recurrence_rule: truncatedRule.toString() })
      .eq('id', lesson.id);

    if (updateError) throw updateError;

    // Delete orphaned overrides (at or after the current true original date)
    const { error: deleteError } = await supabase
      .from('lesson_override')
      .delete()
      .eq('lesson_id', lesson.id)
      .gte('original_date', trueOriginalDateISO);

    if (deleteError) throw deleteError;

    console.log(`Truncated old lesson ${lesson.id} at ${untilDate.toISOString()} and created new series.`);
  }
}

