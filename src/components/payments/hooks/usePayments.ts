import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '../../../lib/supabase';
import type { Payment, Student } from '../../../types/database';
import type { PaymentWithStudent, PaymentFormData, LessonForPayment, PaymentFilters } from '../types';
import { fetchUnpaidLessons, createPaymentWithLessons } from '../services/paymentService';

/**
 * Custom Hook: usePayments
 * 
 * Manages all payment-related state and operations:
 * - Data fetching (payments and students)
 * - Form state management
 * - CRUD operations (Create, Read, Update, Delete)
 * - Filtering logic
 * 
 * This hook encapsulates the business logic, making the main
 * Payments component cleaner and more focused on presentation.
 */
export function usePayments() {
  // State management
  const [payments, setPayments] = useState<PaymentWithStudent[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [unpaidLessons, setUnpaidLessons] = useState<LessonForPayment[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(false);
  
  // Filter state
  const [filters, setFilters] = useState<PaymentFilters>({
    studentSearch: '',
    studentId: 'all',
    dateFrom: '',
    dateTo: '',
    method: 'all',
    amountMin: '',
    amountMax: '',
  });

  // Form state
  const [formData, setFormData] = useState<PaymentFormData>({
    student_id: '',
    selectedLessons: [],
    total_amount: '',
    method: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });
  
  // Track original form data for change detection
  const [originalFormData, setOriginalFormData] = useState<PaymentFormData | null>(null);
  
  // Confirmation modal state
  const [showConfirmDiscard, setShowConfirmDiscard] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  // Fetch unpaid lessons when student is selected
  useEffect(() => {
    if (formData.student_id) {
      fetchUnpaidLessonsForStudent(parseInt(formData.student_id));
    } else {
      setUnpaidLessons([]);
    }
  }, [formData.student_id]);

  /**
   * Fetches unpaid lessons for a selected student
   */
  const fetchUnpaidLessonsForStudent = async (studentId: number) => {
    try {
      setLoadingLessons(true);
      const lessons = await fetchUnpaidLessons(studentId);
      setUnpaidLessons(lessons);
    } catch (error) {
      console.error('Error fetching unpaid lessons:', error);
      setUnpaidLessons([]);
    } finally {
      setLoadingLessons(false);
    }
  };

  /**
   * Fetches students and payments from Supabase
   */
  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch students
      const { data: studentsData, error: studentsError } = await supabase
        .from('student')
        .select('*')
        .order('name');

      if (studentsError) throw studentsError;
      setStudents(studentsData || []);

      // Fetch payments with student details
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payment')
        .select(`
          *,
          student:student_id (*)
        `)
        .order('date', { ascending: false });

      if (paymentsError) throw paymentsError;

      // Transform the data to flatten student object
      const transformedPayments = (paymentsData as any)?.map((payment: any) => ({
        ...payment,
        student: Array.isArray(payment.student) ? payment.student[0] : payment.student
      })) as PaymentWithStudent[] || [];

      setPayments(transformedPayments);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles form submission for creating/updating payments
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation: Must select at least one lesson for new payments
    if (!editingPayment && formData.selectedLessons.length === 0) {
      alert('Please select at least one lesson for this payment');
      return;
    }

    try {
      if (editingPayment) {
        // Update existing payment (not implemented yet - would need to update payment_items too)
        alert('Editing payments is not yet implemented. Please delete and recreate instead.');
        return;
      } else {
        // Create new payment with lesson links
        await createPaymentWithLessons(
          parseInt(formData.student_id),
          formData.selectedLessons,
          parseFloat(formData.total_amount),
          formData.method || null,
          formData.date,
          formData.notes || null
        );
      }

      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error saving payment:', error);
      alert('Failed to save payment');
    }
  };

  /**
   * Sets original form data when creating new payment
   */
  useEffect(() => {
    if (showForm && !editingPayment) {
      setOriginalFormData(null);
    }
  }, [showForm, editingPayment]);

  /**
   * Sets up the form for editing an existing payment
   * NOTE: Editing is disabled for now since it would require updating payment_items
   */
  const handleEdit = (_payment: Payment) => {
    alert('Editing payments is not yet supported. Please delete and recreate instead.');
    // setEditingPayment(payment);
    // setFormData({
    //   student_id: payment.student_id.toString(),
    //   selectedLessons: [], // Would need to fetch from payment_items
    //   total_amount: payment.total_amount.toString(),
    //   method: payment.method || '',
    //   date: format(new Date(payment.date), 'yyyy-MM-dd'),
    //   notes: payment.notes || '',
    // });
    // setShowForm(true);
  };

  /**
   * Request to delete a payment - shows confirmation modal
   */
  const handleDelete = (id: number) => {
    setPendingDeleteId(id);
    setShowConfirmDelete(true);
  };

  /**
   * Confirm delete payment
   */
  const handleConfirmDelete = async () => {
    if (!pendingDeleteId) return;

    try {
      const { error } = await supabase
        .from('payment')
        .delete()
        .eq('id', pendingDeleteId);

      if (error) throw error;
      fetchData();
      setShowConfirmDelete(false);
      setPendingDeleteId(null);
    } catch (error) {
      console.error('Error deleting payment:', error);
      alert('Failed to delete payment');
      setShowConfirmDelete(false);
      setPendingDeleteId(null);
    }
  };

  /**
   * Check if form has unsaved changes
   */
  const hasFormChanged = (): boolean => {
    if (!originalFormData) {
      // New payment - check if user has actually entered data beyond initial state
      // Initial state: date is pre-filled with today's date
      // Only show warning if user has entered student, selected lessons, amount, method, or notes
      return !!(
        formData.student_id || 
        formData.selectedLessons.length > 0 || 
        formData.total_amount || 
        formData.method || 
        formData.notes
      );
    }
    
    return (
      formData.student_id !== originalFormData.student_id ||
      JSON.stringify(formData.selectedLessons) !== JSON.stringify(originalFormData.selectedLessons) ||
      formData.total_amount !== originalFormData.total_amount ||
      formData.method !== originalFormData.method ||
      formData.date !== originalFormData.date ||
      formData.notes !== originalFormData.notes
    );
  };

  /**
   * Request to close modal - shows confirmation if there are unsaved changes
   */
  const handleRequestClose = () => {
    if (hasFormChanged()) {
      setShowForm(false); // Hide form first, then show confirmation
      setShowConfirmDiscard(true);
    } else {
      resetForm();
    }
  };

  /**
   * Confirm discard changes
   */
  const handleConfirmDiscard = () => {
    resetForm();
    setShowConfirmDiscard(false);
  };

  /**
   * Resets the form to its initial state
   */
  const resetForm = () => {
    const initialFormData: PaymentFormData = {
      student_id: '',
      selectedLessons: [],
      total_amount: '',
      method: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
    };
    setFormData(initialFormData);
    setEditingPayment(null);
    setOriginalFormData(null);
    setShowForm(false);
    setUnpaidLessons([]);
    setShowConfirmDiscard(false);
  };

  /**
   * Updates form data (partial update)
   */
  const updateFormData = (data: Partial<PaymentFormData>) => {
    setFormData({ ...formData, ...data });
  };

  /**
   * Update filter criteria
   */
  const handleFilterChange = (newFilters: Partial<PaymentFilters>) => {
    setFilters({ ...filters, ...newFilters });
  };

  /**
   * Clear all filters
   */
  const handleClearFilters = () => {
    setFilters({
      studentSearch: '',
      studentId: 'all',
      dateFrom: '',
      dateTo: '',
      method: 'all',
      amountMin: '',
      amountMax: '',
    });
  };

  /**
   * Filter payments based on all criteria
   */
  const filteredPayments = payments.filter(payment => {
    // Student filter - by ID or search query
    if (filters.studentId !== 'all') {
      if (payment.student_id !== parseInt(filters.studentId)) {
        return false;
      }
    } else if (filters.studentSearch.trim()) {
      const student = payment.student;
      const searchLower = filters.studentSearch.toLowerCase().trim();
      
      // Search in student name/email
      const studentMatch = student && (
        student.name.toLowerCase().includes(searchLower) ||
        student.email?.toLowerCase().includes(searchLower)
      );
      
      // Search in payment notes
      const notesMatch = payment.notes?.toLowerCase().includes(searchLower) || false;
      
      if (!studentMatch && !notesMatch) return false;
    }

    // Date range filter
    if (filters.dateFrom) {
      const paymentDate = new Date(payment.date);
      const fromDate = new Date(filters.dateFrom);
      if (paymentDate < fromDate) return false;
    }
    if (filters.dateTo) {
      const paymentDate = new Date(payment.date);
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999); // Include entire end date
      if (paymentDate > toDate) return false;
    }

    // Payment method filter
    if (filters.method !== 'all') {
      if (payment.method !== filters.method) return false;
    }

    // Amount range filter
    const amount = parseFloat(payment.total_amount.toString());
    if (filters.amountMin) {
      const minAmount = parseFloat(filters.amountMin);
      if (isNaN(minAmount) || amount < minAmount) return false;
    }
    if (filters.amountMax) {
      const maxAmount = parseFloat(filters.amountMax);
      if (isNaN(maxAmount) || amount > maxAmount) return false;
    }

    return true;
  });

  // Calculate total amount for filtered payments
  const totalAmount = filteredPayments.reduce(
    (sum, payment) => sum + parseFloat(payment.total_amount.toString()),
    0
  );

  return {
    // State
    payments: filteredPayments,
    allPayments: payments, // Keep original for reference
    students,
    loading,
    showForm,
    editingPayment,
    formData,
    totalAmount,
    unpaidLessons,
    loadingLessons,
    filters,

    // Actions
    handleSubmit,
    handleEdit,
    handleDelete,
    handleRequestClose,
    handleConfirmDiscard,
    handleConfirmDelete,
    resetForm,
    updateFormData,
    setShowForm,
    handleFilterChange,
    handleClearFilters,
    hasFormChanged,
    
    // Confirmation modals
    showConfirmDiscard,
    showConfirmDelete,
    setShowConfirmDiscard,
    setShowConfirmDelete,
  };
}

