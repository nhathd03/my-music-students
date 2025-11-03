import { startOfMonth, endOfMonth } from 'date-fns';
import { supabase } from '../../../../lib/supabase';
import type { Student } from '../../../../types/database';
import type { LessonWithStudent } from '../../types';
import { buildOverrideMap, expandLessonsWithOverrides } from './helpers';

/**
 * Lesson Service - Fetch Operations
 * Handles fetching lessons and students from the database
 */

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

