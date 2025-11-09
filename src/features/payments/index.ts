/**
 * Payments Module
 * 
 * This module exports all payment-related components in a modular structure.
 * The main Payments component orchestrates smaller, focused sub-components.
 * 
 * Components:
 * - Payments: Main container component
 * - PaymentSummary: Displays payment statistics
 * - PaymentForm: Add/edit payment form (includes modal)
 * - PaymentFilter: Filter payments by student
 * - PaymentTable: Display payments in a table
 * 
 * Hooks:
 * - usePayments: Custom hook for payment business logic
 * 
 * Types:
 * - All TypeScript interfaces and types for payments
 */

export { default } from './Payments';
export { default as PaymentSummary } from './PaymentSummary';
export { default as PaymentForm } from './PaymentForm';
export { default as PaymentFilter } from './PaymentFilter';
export { default as PaymentTable } from './PaymentTable';
export { usePayments } from './hooks/usePayments';
export * from './types';

