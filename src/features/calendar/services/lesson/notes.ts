import { supabase } from '../../../../lib/supabase';

/**
 * Lesson Note Service
 * Handles creating, updating, and deleting per-occurrence lesson notes
 */

/**
 * Creates or updates a note for a specific lesson occurrence
 */
export async function upsertLessonNote(
  lessonId: number,
  lessonDate: string,
  note: string
): Promise<void> {
  const { error } = await supabase
    .from('lesson_note')
    .upsert(
      {
        lesson_id: lessonId,
        lesson_date: lessonDate,
        note: note.trim(),
      },
      {
        onConflict: 'lesson_id,lesson_date',
      }
    );

  if (error) throw error;
}

/**
 * Deletes a note for a specific lesson occurrence
 */
export async function deleteLessonNote(
  lessonId: number,
  lessonDate: string
): Promise<void> {
  const { error } = await supabase
    .from('lesson_note')
    .delete()
    .eq('lesson_id', lessonId)
    .eq('lesson_date', lessonDate);

  if (error) throw error;
}

/**
 * Deletes all notes for a lesson (when lesson is deleted)
 */
export async function deleteAllLessonNotes(lessonId: number): Promise<void> {
  const { error } = await supabase
    .from('lesson_note')
    .delete()
    .eq('lesson_id', lessonId);

  if (error) throw error;
}

