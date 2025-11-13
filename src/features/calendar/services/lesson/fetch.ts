import { startOfMonth, endOfMonth, format } from 'date-fns';
import { rrulestr } from 'rrule';
import { supabase } from '../../../../lib/supabase';
import type { Student } from '../../../../types/database';
import type { LessonWithStudent } from '../../types';
import { extractLocalTimeFromUTC, extractLocalDateFromUTC } from '../../utils/dateUtils';

const formatDate = (date: Date): string => format(date, 'yyyy-MM-dd');

const createOccurrenceKey = (lessonId: number, date: string): string => 
  `${lessonId}-${date}`;

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
 * Fetches lessons with student data for a given month
 */
async function fetchLessonsWithStudents(monthStart: Date, monthEnd: Date) {
  const { data, error } = await supabase
    .from('lesson')
    .select(`
      *,
      student:student_id (*)
    `)
    .or(
      `recurrence_rule.not.is.null,and(timestamp.gte.${monthStart.toISOString()},timestamp.lte.${monthEnd.toISOString()})`
    )
    .order('timestamp');

  if (error) throw error;
  return data || [];
}

/**
 * Fetches payment items and returns a Set of paid occurrence keys
 */
async function fetchPaidOccurrences(lessonIds: number[]): Promise<Set<string>> {
  if (lessonIds.length === 0) return new Set();

  const { data, error } = await supabase
    .from('payment_item')
    .select('lesson_id, lesson_date')
    .in('lesson_id', lessonIds);

  if (error) throw error;

  return new Set(
    (data || []).map(item => createOccurrenceKey(item.lesson_id, item.lesson_date))
  );
}

/**
 * Fetches lesson notes and returns a Map of occurrence keys to notes
 */
async function fetchLessonNotes(lessonIds: number[]): Promise<Map<string, string>> {
  if (lessonIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('lesson_note')
    .select('lesson_id, lesson_date, note')
    .in('lesson_id', lessonIds);

  if (error) throw error;

  const noteMap = new Map<string, string>();
  (data || []).forEach(note => {
    const key = createOccurrenceKey(note.lesson_id, note.lesson_date);
    noteMap.set(key, note.note);
  });

  return noteMap;
}

/**
 * Creates a lesson occurrence with payment status and note
 */
function createLessonOccurrence(
  lesson: any,
  timestamp: string,
  occurrenceDate: string,
  paidOccurrences: Set<string>,
  noteMap: Map<string, string>
): LessonWithStudent {
  const occurrenceKey = createOccurrenceKey(lesson.id, occurrenceDate);
  const occurrenceNote = noteMap.get(occurrenceKey) || lesson.note || null;

  return {
    ...lesson,
    timestamp,
    paid: paidOccurrences.has(occurrenceKey),
    note: occurrenceNote,
  };
}

/**
 * Expands a recurring lesson into occurrences for the given date range
 */
function expandRecurringLesson(
  lesson: any,
  monthStart: Date,
  monthEnd: Date,
  paidOccurrences: Set<string>,
  noteMap: Map<string, string>
): LessonWithStudent[] {
  try {
    const localTime = extractLocalTimeFromUTC(lesson.timestamp);
    const rrule = rrulestr(lesson.recurrence_rule);
    const occurrences = rrule.between(monthStart, monthEnd, true);

    return occurrences.map(occurrence => {
      const occurrenceDate = formatDate(occurrence);
      const occurrenceTimestamp = `${occurrenceDate}T${localTime}`;
      
      return createLessonOccurrence(
        lesson,
        occurrenceTimestamp,
        occurrenceDate,
        paidOccurrences,
        noteMap
      );
    });
  } catch (error) {
    console.error(`Error parsing recurrence rule for lesson ${lesson.id}:`, error);
    return [];
  }
}

/**
 * Processes a non-recurring lesson if it falls within the date range
 */
function processNonRecurringLesson(
  lesson: any,
  monthStart: Date,
  monthEnd: Date,
  paidOccurrences: Set<string>,
  noteMap: Map<string, string>
): LessonWithStudent | null {
  const lessonDate = new Date(lesson.timestamp);
  
  if (lessonDate < monthStart || lessonDate > monthEnd) {
    return null;
  }

  const lessonLocalDate = extractLocalDateFromUTC(lesson.timestamp);
  
  return createLessonOccurrence(
    lesson,
    lesson.timestamp,
    lessonLocalDate,
    paidOccurrences,
    noteMap
  );
}

/**
 * Expands recurring lessons and filters non-recurring lessons for the given date range
 */
function expandAndFilterLessons(
  lessons: any[],
  monthStart: Date,
  monthEnd: Date,
  paidOccurrences: Set<string>,
  noteMap: Map<string, string>
): LessonWithStudent[] {
  const result: LessonWithStudent[] = [];

  for (const lesson of lessons) {
    if (lesson.recurrence_rule) {
      const occurrences = expandRecurringLesson(
        lesson,
        monthStart,
        monthEnd,
        paidOccurrences,
        noteMap
      );
      result.push(...occurrences);
    } else {
      const occurrence = processNonRecurringLesson(
        lesson,
        monthStart,
        monthEnd,
        paidOccurrences,
        noteMap
      );
      if (occurrence) {
        result.push(occurrence);
      }
    }
  }

  return result;
}

/**
 * Fetches lessons for a given month
 */
export async function fetchLessonsForMonth(
  currentDate: Date
): Promise<LessonWithStudent[]> {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  const lessonsData = await fetchLessonsWithStudents(monthStart, monthEnd);
  const lessonIds = lessonsData.map(l => l.id);

  const [paidOccurrences, noteMap] = await Promise.all([
    fetchPaidOccurrences(lessonIds),
    fetchLessonNotes(lessonIds)
  ]);

  const expandedLessons = expandAndFilterLessons(
    lessonsData,
    monthStart,
    monthEnd,
    paidOccurrences,
    noteMap
  );

  // Sort by timestamp
  expandedLessons.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return expandedLessons;
}