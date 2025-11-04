import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '../../../lib/supabase';
import type { Payment, Student } from '../../../types/database';
import type { PaymentWithStudent, PaymentFormData, LessonForPayment } from '../types';
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
  const [selectedStudent, setSelectedStudent] = useState<string>('all');
  const [unpaidLessons, setUnpaidLessons] = useState<LessonForPayment[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(false);

  // Form state
  const [formData, setFormData] = useState<PaymentFormData>({
    student_id: '',
    selectedLessons: [],
    total_amount: '',
    method: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  });

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
   * Deletes a payment after confirmation
   */
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this payment record?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('payment')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchData();
    } catch (error) {
      console.error('Error deleting payment:', error);
      alert('Failed to delete payment');
    }
  };

  /**
   * Resets the form to its initial state
   */
  const resetForm = () => {
    setFormData({
      student_id: '',
      selectedLessons: [],
      total_amount: '',
      method: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
    });
    setEditingPayment(null);
    setShowForm(false);
    setUnpaidLessons([]);
  };

  /**
   * Updates form data (partial update)
   */
  const updateFormData = (data: Partial<PaymentFormData>) => {
    setFormData({ ...formData, ...data });
  };

  // Filter payments by selected student
  const filteredPayments = selectedStudent === 'all'
    ? payments
    : payments.filter(p => p.student_id === parseInt(selectedStudent));

  // Calculate total amount for filtered payments
  const totalAmount = filteredPayments.reduce(
    (sum, payment) => sum + parseFloat(payment.total_amount.toString()),
    0
  );

  return {
    // State
    payments: filteredPayments,
    students,
    loading,
    showForm,
    editingPayment,
    selectedStudent,
    formData,
    totalAmount,
    unpaidLessons,
    loadingLessons,

    // Actions
    handleSubmit,
    handleEdit,
    handleDelete,
    resetForm,
    updateFormData,
    setShowForm,
    setSelectedStudent,
  };
}

