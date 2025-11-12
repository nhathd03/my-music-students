import { supabase } from '../../../../lib/supabase';
import type { LessonInsertData } from './types';
import * as lessonNoteService from './notes';
import { extractLocalDateFromUTC } from '../../utils/dateUtils';

/**
 * Creates a new lesson
 */
export async function createLesson(lessonData: LessonInsertData): Promise<void> {
  // Separate note from lessonData
  const note = lessonData.note;
  const lessonDataWithoutNote = { ...lessonData };
  delete lessonDataWithoutNote.note;
  
  // If it's a recurring lesson, keep note in lesson.note for backwards compatibility
  // If it's non-recurring, save to lesson_note table
  if (!lessonData.recurrence_rule && note) {
    lessonDataWithoutNote.note = null;
  } else if (lessonData.recurrence_rule && note) {
    lessonDataWithoutNote.note = note;
  }
  
  const { data: insertedLesson, error } = await supabase
    .from('lesson')
    .insert([lessonDataWithoutNote])
    .select()
    .single();

  if (error) throw error;
  
  // For non-recurring lessons, save note to lesson_note table
  if (!lessonData.recurrence_rule && note) {
    // Extract local date from the timestamp for lesson_note
    const lessonDate = extractLocalDateFromUTC(insertedLesson.timestamp);
    await lessonNoteService.upsertLessonNote(
      insertedLesson.id,
      lessonDate,
      note
    );
  }
}

