/**
 * Lesson Service
 * Modular service for managing lessons, students, and overrides
 * - types: Type definitions
 * - helpers: Shared utility functions
 * - fetch: Fetching lessons and students
 * - create: Creating new lessons
 * - update: Updating lessons (single, recurring, paid status)
 * - delete: Deleting lessons (single, recurring occurrences)
 */

// Types
export type { LessonInsertData } from './types';

// Helpers (internal use primarily, but exported for flexibility)
export { 
  buildOverrideMap, 
  expandLessonsWithOverrides, 
  isOverrideRedundant 
} from './helpers';

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
  toggleLessonPaid,
  updateSingleOccurrence,
  updateCurrentAndFutureOccurrences
} from './update';

// Delete operations
export { 
  deleteLesson,
  deleteSingleOccurrence,
  deleteFutureOccurrences,
  isLastOccurrence
} from './delete';

