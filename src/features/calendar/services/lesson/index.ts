/**
 * Lesson Service
 */

// Types
export type { LessonInsertData } from './types';

// Fetch operations
export { 
  fetchStudents, 
  fetchLessonsForMonth 
} from './fetch';

// Create operations
export { 
  createLesson 
} from './create';

// Update operations
export { 
  updateLesson,
  updateSingleOccurrence,
  updateCurrentAndFutureOccurrences
} from './update';

// Delete operations
export { 
  deleteLesson,
  deleteSingleOccurrence,
  deleteFutureOccurrences
} from './delete';
