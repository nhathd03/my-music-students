import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '../../../lib/supabase';
import type { Payment, Student } from '../../../types/database';
import type { PaymentWithStudent, PaymentFormData } from '../types';

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

  // Form state
  const [formData, setFormData] = useState<PaymentFormData>({
    student_id: '',
    amount: '',
    method: '',
    date: format(new Date(), 'yyyy-MM-dd'),
  });

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

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

    try {
      const paymentData = {
        student_id: parseInt(formData.student_id),
        amount: parseFloat(formData.amount),
        method: formData.method || null,
        date: new Date(formData.date).toISOString(),
      };

      if (editingPayment) {
        // Update existing payment
        const { error } = await supabase
          .from('payment')
          .update(paymentData)
          .eq('id', editingPayment.id);

        if (error) throw error;
      } else {
        // Create new payment
        const { error } = await supabase
          .from('payment')
          .insert([paymentData]);

        if (error) throw error;
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
   */
  const handleEdit = (payment: Payment) => {
    setEditingPayment(payment);
    setFormData({
      student_id: payment.student_id.toString(),
      amount: payment.amount.toString(),
      method: payment.method || '',
      date: format(new Date(payment.date), 'yyyy-MM-dd'),
    });
    setShowForm(true);
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
      amount: '',
      method: '',
      date: format(new Date(), 'yyyy-MM-dd'),
    });
    setEditingPayment(null);
    setShowForm(false);
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
    (sum, payment) => sum + parseFloat(payment.amount.toString()),
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

