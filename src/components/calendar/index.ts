/**
 * Calendar Module
 * 
 * This module exports all calendar-related components in a modular structure.
 * The main Calendar component orchestrates smaller, focused sub-components.
 * 
 * Components:
 * - Calendar: Main container component
 * - LessonForm: Add/edit lesson form
 * - CalendarNavigation: Month navigation controls
 * - CalendarGrid: Calendar day grid with lessons
 * - LessonPill: Individual lesson display
 * 
 * Hooks:
 * - useCalendar: Custom hook for calendar business logic
 * 
 * Types:
 * - All TypeScript interfaces and types for calendar
 */

export { default } from './Calendar';
export { default as LessonForm } from './LessonModal';
export { default as CalendarNavigation } from './CalendarNavigation';
export { default as CalendarGrid } from './CalendarGrid';
export { default as LessonPill } from './LessonPill';
export { useCalendar } from './hooks/useCalendar';
export * from './types';

