// hooks/useLessonOperations.ts
import { useCallback } from 'react';
import * as lessonService from '../services/lesson';
import type { Lesson } from '../../../types/database';
import type { LessonInsertData } from '../services/lesson/types';

export function useLessonOperations() {
  const createLesson = useCallback(async (lessonData: LessonInsertData) => {
    try {
      await lessonService.createLesson(lessonData);
      return { success: true };
    } catch (error) {
      console.error('Error creating lesson:', error);
      return { success: false, error };
    }
  }, []);

  const updateLesson = useCallback(async (
    lesson: Lesson,
    lessonData: LessonInsertData,
    scope?: 'single' | 'future'
  ) => {
    try {
      if (lesson.recurrence_rule && scope === 'single') {
        await lessonService.updateSingleOccurrence(lesson, lessonData);
      } else if (lesson.recurrence_rule && scope === 'future') {
        await lessonService.updateCurrentAndFutureOccurrences(lesson, lessonData);
      } else {
        await lessonService.updateLesson(lesson.id, lessonData);
      }
      return { success: true };
    } catch (error) {
      console.error('Error updating lesson:', error);
      return { success: false, error };
    }
  }, []);

  const deleteLesson = useCallback(async (
    lesson: Lesson,
    scope?: 'single' | 'future'
  ) => {
    try {
      if (scope === 'single') {
        await lessonService.deleteSingleOccurrence(lesson);
      } else if (scope === 'future') {
        await lessonService.deleteFutureOccurrences(lesson);
      } else {
        await lessonService.deleteLesson(lesson.id);
      }
      return { success: true };
    } catch (error) {
      console.error('Error deleting lesson:', error);
      return { success: false, error };
    }
  }, []);

  return {
    createLesson,
    updateLesson,
    deleteLesson,
  };
}