import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import type { Student } from '../../../types/database';
import type { StudentFormData } from '../types';

/**
 * Custom Hook: useStudents
 * 
 * Manages all student-related state and operations:
 * - Data fetching (students)
 * - Form state management
 * - CRUD operations (Create, Read, Update, Delete)
 * 
 * This hook encapsulates the business logic, making the main
 * Students component cleaner and more focused on presentation.
 */
export function useStudents() {
  // State management
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Form state
  const [formData, setFormData] = useState<StudentFormData>({
    name: '',
    email: '',
    rate: '',
  });

  // Fetch students on mount
  useEffect(() => {
    fetchStudents();
  }, []);

  /**
   * Fetches all students from Supabase, ordered by name
   */
  const fetchStudents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('student')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
      alert('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles form submission for creating/updating students
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const studentData = {
        name: formData.name,
        email: formData.email || null,
        rate: formData.rate ? parseFloat(formData.rate) : null,
      };

      if (editingStudent) {
        // Update existing student
        const { error } = await supabase
          .from('student')
          .update(studentData)
          .eq('id', editingStudent.id);

        if (error) throw error;
      } else {
        // Create new student
        const { error } = await supabase
          .from('student')
          .insert([studentData]);

        if (error) throw error;
      }

      resetForm();
      fetchStudents();
    } catch (error) {
      console.error('Error saving student:', error);
      alert('Failed to save student');
    }
  };

  /**
   * Sets up the form for editing an existing student
   */
  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      email: student.email || '',
      rate: student.rate?.toString() || '',
    });
    setShowForm(true);
  };

  /**
   * Deletes a student after confirmation
   * Note: This will cascade delete all associated lessons and payments
   */
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this student? This will also delete all their lessons and payments.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('student')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchStudents();
    } catch (error) {
      console.error('Error deleting student:', error);
      alert('Failed to delete student');
    }
  };

  /**
   * Resets the form to its initial state
   */
  const resetForm = () => {
    setFormData({ name: '', email: '', rate: '' });
    setEditingStudent(null);
    setShowForm(false);
  };

  /**
   * Updates form data (partial update)
   */
  const updateFormData = (data: Partial<StudentFormData>) => {
    setFormData({ ...formData, ...data });
  };

  return {
    // State
    students,
    loading,
    showForm,
    editingStudent,
    formData,

    // Actions
    handleSubmit,
    handleEdit,
    handleDelete,
    resetForm,
    updateFormData,
    setShowForm,
  };
}

