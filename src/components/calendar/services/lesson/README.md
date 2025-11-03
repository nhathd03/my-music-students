# Lesson Service - Modular Architecture

This directory contains the modularized lesson service, organized into focused, maintainable modules.

## 📁 Structure

```
lesson/
├── types.ts           # Type definitions (LessonInsertData)
├── helpers.ts         # Shared utility functions
├── fetch.ts           # Fetch operations (students, lessons)
├── create.ts          # Create operations
├── update.ts          # Update operations (single, recurring, paid status)
├── delete.ts          # Delete operations (single, recurring occurrences)
├── index.ts           # Main entry point - re-exports everything
└── README.md          # This file
```

## 📦 Module Breakdown

### **types.ts** (11 lines)
- `LessonInsertData` - Type definition for lesson data

### **helpers.ts** (138 lines)
- `buildOverrideMap()` - Creates lookup map for lesson overrides
- `expandLessonsWithOverrides()` - Expands recurring lessons and applies overrides
- `isOverrideRedundant()` - Checks if override matches original lesson

### **fetch.ts** (88 lines)
- `fetchStudents()` - Fetches all students from database
- `fetchLessonsForMonth()` - Fetches lessons for a given month with overrides

### **create.ts** (16 lines)
- `createLesson()` - Creates a new lesson

### **update.ts** (570 lines)
- `updateLesson()` - Updates an existing lesson
- `toggleLessonPaid()` - Toggles paid status (handles recurring lessons)
- `updateSingleOccurrence()` - Updates single occurrence of recurring lesson
- `deleteFutureOccurrences()` - Deletes all future occurrences
- `updateCurrentAndFutureOccurrences()` - Updates current and future occurrences (split series)

### **delete.ts** (243 lines)
- `deleteLesson()` - Deletes a non-recurring lesson
- `isLastOccurrence()` - Checks if occurrence is last in series
- `deleteSingleOccurrence()` - Deletes single occurrence (with smart conversion)

### **index.ts** (48 lines)
- Main entry point that re-exports all functions

## 🎯 Usage

### Import Everything
```typescript
import * as lessonService from './lesson';

// Use functions
await lessonService.fetchLessonsForMonth(new Date());
await lessonService.createLesson(lessonData);
```

### Import Specific Functions
```typescript
import { 
  fetchLessonsForMonth, 
  createLesson,
  updateLesson,
  deleteLesson 
} from './lesson';

// Use directly
await fetchLessonsForMonth(new Date());
await createLesson(lessonData);
```

### Import Types
```typescript
import type { LessonInsertData } from './lesson';

const data: LessonInsertData = {
  student_id: 1,
  date: '2025-01-01T10:00:00.000Z',
  duration: 60,
  paid: false,
  recurrence_rule: null
};
```

## 📊 Stats

| Module | Lines | Purpose |
|--------|-------|---------|
| types.ts | 11 | Type definitions |
| helpers.ts | 138 | Shared utilities |
| fetch.ts | 88 | Fetch operations |
| create.ts | 16 | Create operations |
| update.ts | 570 | Update operations |
| delete.ts | 243 | Delete operations |
| index.ts | 48 | Re-exports |
| **Total** | **1,114** | **Was 1,030 in single file** |

## ✅ Benefits

1. **Better Organization** - Each file has a single, clear purpose
2. **Easier Navigation** - Find functions quickly by category
3. **Maintainability** - Smaller files are easier to understand and modify
4. **Testability** - Test individual modules in isolation
5. **Code Reuse** - Helper functions are clearly separated
6. **Type Safety** - Types are centralized and easy to find
7. **Documentation** - Each module can be documented separately

## 🔄 Migration

The old `lessonService.ts` file still exists as a backward-compatible wrapper that re-exports from this module. It can be safely deleted once you're confident everything works.

## 🛠️ Recent Updates

- **Modularization** - Split 1030-line file into focused modules
- **Override Handling** - Fixed `updateCurrentAndFutureOccurrences` to handle rescheduled occurrences
- **Smart Deletion** - Auto-converts to non-recurring when only 1-2 occurrences remain
- **Redundancy Checks** - Automatically removes redundant overrides

