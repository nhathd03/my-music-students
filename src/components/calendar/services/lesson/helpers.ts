import { rrulestr } from 'rrule';
import type { Lesson } from '../../../../types/database';
import type { LessonWithStudent } from '../../types';
import { createOverrideKey } from '../../utils/dateUtils';

/**
 * Lesson Service Helpers
 * Shared utility functions for lesson operations
 */

/**
 * Builds a lookup map for lesson overrides
 * Key format: "<lesson_id>|<original_date_ISO>"
 */
export function buildOverrideMap(overrides: any[]): Map<string, any> {
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
export function expandLessonsWithOverrides(
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

/**
 * Checks if an override is redundant (all fields match original lesson and not rescheduled)
 */
export function isOverrideRedundant(override: any, lesson: Lesson, originalDate: string): boolean {
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

