/**
 * Students Module
 * 
 * This module exports all student-related components in a modular structure.
 * The main Students component orchestrates smaller, focused sub-components.
 * 
 * Components:
 * - Students: Main container component
 * - StudentModal: Add/edit student form
 * - StudentList: Grid of student cards
 * - StudentCard: Individual student display
 * 
 * Hooks:
 * - useStudents: Custom hook for student business logic
 * 
 * Types:
 * - All TypeScript interfaces and types for students
 */

export { default } from './Students';
export { default as StudentModal } from './StudentModal';
export { default as StudentList } from './StudentList';
export { default as StudentCard } from './StudentCard';
export { useStudents } from './hooks/useStudents';
export * from './types';

