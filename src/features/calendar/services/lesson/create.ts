import { supabase } from '../../../../lib/supabase';
import type { LessonInsertData } from './types';
import * as lessonNoteService from './notes';

/**
 * Creates a new lesson
 * For recurring lessons, notes go in lesson.note (for default note)
 * For non-recurring lessons, notes go in lesson_note table
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
    await lessonNoteService.upsertLessonNote(
      insertedLesson.id,
      insertedLesson.date,
      note
    );
  }
}

