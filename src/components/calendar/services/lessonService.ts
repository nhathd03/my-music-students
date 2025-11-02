import { startOfMonth, endOfMonth } from 'date-fns';
import { RRule, rrulestr } from 'rrule';
import { supabase } from '../../../lib/supabase';
import type { Lesson, Student } from '../../../types/database';
import type { LessonWithStudent } from '../types';
import { createOverrideKey } from '../utils/dateUtils';

/**
 * Lesson Service
 * Handles all database operations for lessons, students, and overrides
 */

// ============================================================================
// Fetch Operations
// ============================================================================

/**
 * Fetches all students from the database
 */
export async function fetchStudents(): Promise<Student[]> {
  const { data, error } = await supabase
    .from('student')
    .select('*')
    .order('name');

  if (error) throw error;
  return data || [];
}

/**
 * Fetches lessons for a given month, including recurring lessons and overrides
 */
export async function fetchLessonsForMonth(
  currentDate: Date
): Promise<LessonWithStudent[]> {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  // Fetch base lessons (recurring + lessons in current month)
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

  // Fetch overrides for current month
  const { data: overrideLessonsData, error: overrideLessonsError } = await supabase
  .from('lesson_override')
  .select(`
    *,
    lesson:lesson_id (
      *,
      student:student_id (*)
    )
  `)
  .or(
    `and(new_date.not.is.null,new_date.gte.${monthStart.toISOString()},new_date.lte.${monthEnd.toISOString()}),` +
    `and(new_date.is.null,original_date.gte.${monthStart.toISOString()},original_date.lte.${monthEnd.toISOString()})`
  )
  .order('original_date');

  if (overrideLessonsError) throw overrideLessonsError;

  // Build override lookup map
  const overrideMap = buildOverrideMap(overrideLessonsData || []);

  // Expand recurring lessons and apply overrides
  const lessonsWithOccurrences = expandLessonsWithOverrides(
    lessonsData || [],
    overrideMap,
    monthStart,
    monthEnd
  );

  // Sort by date
  lessonsWithOccurrences.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return lessonsWithOccurrences;
}

/**
 * Builds a lookup map for lesson overrides
 * Key format: "<lesson_id>|<original_date_ISO>"
 */
function buildOverrideMap(overrides: any[]): Map<string, any> {
  const overrideMap = new Map<string, any>();

  for (const override of overrides) {
    // Use createOverrideKey for consistency
    const key = createOverrideKey(override.lesson_id, override.original_date);
    overrideMap.set(key, override);
  }

  return overrideMap;
}

/**
 * Expands recurring lessons and applies overrides
 */
function expandLessonsWithOverrides(
  lessons: any[],
  overrideMap: Map<string, any>,
  monthStart: Date,
  monthEnd: Date
): LessonWithStudent[] {
  const result: LessonWithStudent[] = [];

  for (const lesson of lessons) {
    if (lesson.recurrence_rule) {
      // Recurring lesson - generate occurrences
      const rrule = rrulestr(lesson.recurrence_rule);
      const occurrences = rrule.between(monthStart, monthEnd, true);

      for (const occurrence of occurrences) {
        const occurrenceISO = occurrence.toISOString();
        const occurrenceKey = createOverrideKey(lesson.id, occurrenceISO);
        const override = overrideMap.get(occurrenceKey);
        
        if (override) {
          // Skip if this occurrence was deleted (new_date is null)
          if (override.new_date === null) continue;

          // Apply override 
          const normalizedDate = new Date(override.new_date).toISOString();
          result.push({
            ...lesson,
            date: normalizedDate,
            duration: override.duration ?? lesson.duration,
            paid: override.paid ?? lesson.paid,
            note: override.note ?? lesson.note,
            created_at: override.created_at,
            student: Array.isArray(override.lesson.student)
              ? override.lesson.student[0]
              : override.lesson.student,
          });
        } else {
          // No override - use occurrence date
          result.push({
            ...lesson,
            date: occurrenceISO,
          });
        }
      }
    } else {
      // Non-recurring lesson
      const lessonKey = createOverrideKey(lesson.id, lesson.date);
      const override = overrideMap.get(lessonKey);

      if (override) {
        // Skip if lesson was deleted
        if (override.new_date === null) continue;

        // Apply override 
        const normalizedDate = new Date(override.new_date).toISOString();
        result.push({
          ...lesson,
          date: normalizedDate,
          duration: override.duration ?? lesson.duration,
          paid: override.paid ?? lesson.paid,
          note: override.note ?? lesson.note,
          created_at: override.created_at,
          student: Array.isArray(override.lesson.student)
            ? override.lesson.student[0]
            : override.lesson.student,
        });
      } else {
        // No override 
        const normalizedDate = new Date(lesson.date).toISOString();
        result.push({
          ...lesson,
          date: normalizedDate,
        });
      }
    }
  }
  console.log('result:', result);
  return result;
}

// ============================================================================
// Create/Update Operations
// ============================================================================

export type LessonInsertData = {
  student_id: number;
  date: string;
  duration: number;
  paid: boolean;
  recurrence_rule?: string | null;
};

/**
 * Creates a new lesson
 */
export async function createLesson(lessonData: LessonInsertData): Promise<void> {
  const { error } = await supabase.from('lesson').insert([lessonData]);

  if (error) throw error;
}

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
 * Checks if an override is redundant (all fields match original lesson and not rescheduled)
 */
function isOverrideRedundant(override: any, lesson: Lesson, originalDate: string): boolean {
  // Normalize dates to ISO strings for comparison
  const overrideNewDate = new Date(override.new_date).toISOString();
  const normalizedOriginalDate = new Date(originalDate).toISOString();
  
  const isRedundant = (
    overrideNewDate === normalizedOriginalDate &&
    override.paid === lesson.paid &&
    override.duration === lesson.duration &&
    (override.note === lesson.note || (override.note === null && lesson.note === null))
  );

  return isRedundant;
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

// ============================================================================
// Delete Operations
// ============================================================================

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
  
  // Generate occurrences within a reasonable range (10 years or until UNTIL date)
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
