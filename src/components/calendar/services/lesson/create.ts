import { supabase } from '../../../../lib/supabase';
import type { LessonInsertData } from './types';

/**
 * Lesson Service - Create Operations
 * Handles creating new lessons
 */

/**
 * Creates a new lesson
 */
export async function createLesson(lessonData: LessonInsertData): Promise<void> {
  const { error } = await supabase.from('lesson').insert([lessonData]);

  if (error) throw error;
}

