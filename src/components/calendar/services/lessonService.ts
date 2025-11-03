/**
 * @deprecated This file has been modularized into separate files.
 * 
 * Use imports from './lesson' instead:
 * 
 * ```typescript
 * import * as lessonService from './lesson';
 * // or import specific functions:
 * import { fetchLessonsForMonth, createLesson } from './lesson';
 * ```
 * 
 * New structure:
 * - ./lesson/types.ts       - Type definitions
 * - ./lesson/helpers.ts     - Shared utility functions
 * - ./lesson/fetch.ts       - Fetch operations
 * - ./lesson/create.ts      - Create operations
 * - ./lesson/update.ts      - Update operations
 * - ./lesson/delete.ts      - Delete operations
 * - ./lesson/index.ts       - Re-exports everything
 * 
 * This file is kept temporarily for reference and will be removed in a future update.
 */

// Re-export everything from the new modular structure for backward compatibility
export * from './lesson';
