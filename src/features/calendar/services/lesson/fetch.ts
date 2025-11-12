import { startOfMonth, endOfMonth, format } from 'date-fns';
import { rrulestr } from 'rrule';
import { supabase } from '../../../../lib/supabase';
import type { Student } from '../../../../types/database';
import type { LessonWithStudent } from '../../types';
import { extractLocalTimeFromUTC, extractLocalDateFromUTC } from '../../utils/dateUtils';

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
 * Fetches lessons for a given month
 */
export async function fetchLessonsForMonth(
  currentDate: Date
): Promise<LessonWithStudent[]> {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  // Fetch all lessons with student data
  // For recurring lessons, we fetch all of them and filter by month during expansion
  // For non-recurring lessons, we filter by timestamp range
  const { data: lessonsData, error: lessonsError } = await supabase
    .from('lesson')
    .select(`
      *,
      student:student_id (*)
    `)
    .or(
      `recurrence_rule.not.is.null,and(timestamp.gte.${monthStart.toISOString()},timestamp.lte.${monthEnd.toISOString()})`
    )
    .order('timestamp');

  if (lessonsError) throw lessonsError;

  // Fetch all payment items to determine which lessons are paid
  const lessonIds = (lessonsData || []).map(l => l.id);
  const { data: paymentItems, error: paymentError } = await supabase
    .from('payment_item')
    .select('lesson_id, lesson_date')
    .in('lesson_id', lessonIds);

  if (paymentError) throw paymentError;

  // Create a Set of paid lesson occurrences (lesson_id + date)
  const paidOccurrences = new Set(
    (paymentItems || []).map(item => 
      `${item.lesson_id}-${item.lesson_date}`
    )
  );

  // Fetch all lesson notes for per-occurrence notes
  const { data: lessonNotes, error: notesError } = await supabase
    .from('lesson_note')
    .select('lesson_id, lesson_date, note')
    .in('lesson_id', lessonIds);

  if (notesError) throw notesError;

  // Create a Map of lesson notes (lesson_id + date) -> note
  const noteMap = new Map<string, string>();
  (lessonNotes || []).forEach(note => {
    const key = `${note.lesson_id}-${note.lesson_date}`;
    noteMap.set(key, note.note);
  });

  // Expand recurring lessons for this month
  const expandedLessons = expandRecurringLessons(
    lessonsData || [],
    monthStart,
    monthEnd,
    paidOccurrences,
    noteMap
  );

  // Sort by date
  expandedLessons.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return expandedLessons;
}

/**
 * Expands recurring lessons to generate occurrences for the given date range
 * Also marks each occurrence as paid/unpaid based on payment_items
 * and attaches notes from lesson_note table
 * 
 * For recurring lessons: extracts local time from UTC timestamp and uses it for all occurrences
 */
function expandRecurringLessons(
  lessons: any[],
  monthStart: Date,
  monthEnd: Date,
  paidOccurrences: Set<string>,
  noteMap: Map<string, string>
): LessonWithStudent[] {
  const result: LessonWithStudent[] = [];

  for (const lesson of lessons) {
    if (lesson.recurrence_rule) {
      // Recurring lesson - generate occurrences
      try {
        // Extract local time from the UTC timestamp stored in database
        const localTime = extractLocalTimeFromUTC(lesson.timestamp);
        
        const rrule = rrulestr(lesson.recurrence_rule);
        const occurrences = rrule.between(monthStart, monthEnd, true);

        for (const occurrence of occurrences) {
          // Format occurrence date as yyyy-MM-dd
          const occurrenceDate = format(occurrence, 'yyyy-MM-dd');
          const occurrenceKey = `${lesson.id}-${occurrenceDate}`;
          
          const occurrenceTimestamp = `${occurrenceDate}T${localTime}`;
          
          // Get note for this occurrence from noteMap, fallback to lesson.note for backwards compatibility
          const occurrenceNote = noteMap.get(occurrenceKey) || lesson.note || null;
          
          result.push({
            ...lesson,
            timestamp: occurrenceTimestamp, 
            paid: paidOccurrences.has(occurrenceKey),
            note: occurrenceNote,
          });
        }
      } catch (error) {
        console.error(`Error parsing recurrence rule for lesson ${lesson.id}:`, error);
        // Skip this lesson if rrule is invalid
      }
    } else {
      const lessonLocalDate = extractLocalDateFromUTC(lesson.timestamp);
      const lessonDate = new Date(lesson.timestamp);
      
      if (lessonDate >= monthStart && lessonDate <= monthEnd) {
        const occurrenceKey = `${lesson.id}-${lessonLocalDate}`;
        
        // Get note for this occurrence from noteMap, fallback to lesson.note
        const occurrenceNote = noteMap.get(occurrenceKey) || lesson.note || null;
        
        result.push({
          ...lesson,
          paid: paidOccurrences.has(occurrenceKey),
          note: occurrenceNote,
        });
      }
    }
  }

  return result;
}
