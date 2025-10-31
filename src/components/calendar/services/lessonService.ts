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
 * Updates the paid status of a lesson (recurring or non-recurring)
 */
export async function toggleLessonPaid(lesson: Lesson): Promise<void> {
  const lessonDateISO = lesson.date;

  if (lesson.recurrence_rule) {
    // Recurring lesson - use override
    const { data: existing } = await supabase
      .from('lesson_override')
      .select('paid')
      .eq('lesson_id', lesson.id)
      .eq('original_date', lessonDateISO)
      .maybeSingle();

    const newPaid = existing ? !existing.paid : !lesson.paid;

    const overrideLessonData = {
      lesson_id: lesson.id,
      original_date: lessonDateISO,
      new_date: lessonDateISO,
      paid: newPaid,
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
  } else {
    // Non-recurring lesson - update directly
    const { error } = await supabase
      .from('lesson')
      .update({ paid: !lesson.paid })
      .eq('id', lesson.id);

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
 * Deletes a single occurrence of a recurring lesson (creates override with new_date = null)
 */
export async function deleteSingleOccurrence(lesson: Lesson): Promise<void> {
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
 */
export async function deleteFutureOccurrences(lesson: Lesson): Promise<void> {
  const { data, error } = await supabase
    .from('lesson')
    .select('*')
    .eq('id', lesson.id)
    .single();

  if (error) throw error;
  const originalLesson = data;
  if (!originalLesson.recurrence_rule)
    throw new Error('Lesson is not recurring.');

  const lessonDate = new Date(lesson.date);
  const untilDate = new Date(lessonDate);
  untilDate.setDate(untilDate.getDate() - 1);
  untilDate.setHours(23, 59, 59, 999);

  // Parse the original rule
  const oldRule = rrulestr(originalLesson.recurrence_rule);

  // Build a new rule using the old rule’s options + new UNTIL
  const updatedRule = new RRule({
    ...oldRule.options,
    until: untilDate,
  });

  const updatedRRule = updatedRule.toString();
  console.log('Updated RRULE:', updatedRRule);
  // → RRULE:FREQ=WEEKLY;INTERVAL=1;UNTIL=20251028T235959Z

  const { error: updateError } = await supabase
    .from('lesson')
    .update({ recurrence_rule: updatedRRule })
    .eq('id', lesson.id);

  if (updateError) throw updateError;
}
