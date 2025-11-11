import { startOfMonth, endOfMonth, format } from 'date-fns';
import { rrulestr } from 'rrule';
import { supabase } from '../../../../lib/supabase';
import type { Student } from '../../../../types/database';
import type { LessonWithStudent } from '../../types';

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
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return expandedLessons;
}

/**
 * Expands recurring lessons to generate occurrences for the given date range
 * Also marks each occurrence as paid/unpaid based on payment_items
 * and attaches notes from lesson_note table
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
        const rrule = rrulestr(lesson.recurrence_rule);
        const occurrences = rrule.between(monthStart, monthEnd, true);

        for (const occurrence of occurrences) {
          // set occurrence to local time to prevent DST changes
          
          const occurrenceDate = format(new Date(occurrence), 'yyyy-MM-dd')
          const occurrenceKey = `${lesson.id}-${occurrenceDate}`;
          
          // Get note for this occurrence from noteMap, fallback to lesson.note for backwards compatibility
          const occurrenceNote = noteMap.get(occurrenceKey) || lesson.note || null;
          
          result.push({
            ...lesson,
            date: occurrenceDate,
            paid: paidOccurrences.has(occurrenceKey),
            note: occurrenceNote,
          });
        }
      } catch (error) {
        console.error(`Error parsing recurrence rule for lesson ${lesson.id}:`, error);
        // Skip this lesson if rrule is invalid
      }
    } else {
      // Non-recurring lesson - include if within month range
      const lessonDate = new Date(`${lesson.date}T${lesson.time}`);
      if (lessonDate >= monthStart && lessonDate <= monthEnd) {
        const occurrenceKey = `${lesson.id}-${lesson.date}`;
        
        // Get note for this occurrence from noteMap, fallback to lesson.note
        const occurrenceNote = noteMap.get(occurrenceKey) || lesson.note || null;
        
        result.push({
          ...lesson,
          date: lesson.date,
          paid: paidOccurrences.has(occurrenceKey),
          note: occurrenceNote,
        });
      }
    }
  }

  return result;
}
