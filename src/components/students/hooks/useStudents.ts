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
  const [showConfirmDiscard, setShowConfirmDiscard] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [formData, setFormData] = useState<StudentFormData>({
    name: '',
    email: '',
    rate: '',
    description: '',
  });
  
  // Track original form data for change detection
  const [originalFormData, setOriginalFormData] = useState<StudentFormData | null>(null);

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
        description: formData.description || null,
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
   * Sets original form data when creating new student
   */
  useEffect(() => {
    if (showForm && !editingStudent) {
      setOriginalFormData(null);
    }
  }, [showForm, editingStudent]);

  /**
   * Sets up the form for editing an existing student
   */
  const handleEdit = (student: Student) => {
    const initialData = {
      name: student.name,
      email: student.email || '',
      rate: student.rate?.toString() || '',
      description: student.description || '',
    };
    setEditingStudent(student);
    setFormData(initialData);
    setOriginalFormData(initialData);
    setShowForm(true);
  };

  /**
   * Request to delete a student - shows confirmation modal
   * Note: This will cascade delete all associated lessons and payments
   */
  const handleDelete = (id: number) => {
    setPendingDeleteId(id);
    setShowConfirmDelete(true);
  };

  /**
   * Confirm delete student
   */
  const handleConfirmDelete = async () => {
    if (!pendingDeleteId) return;

    try {
      const { error } = await supabase
        .from('student')
        .delete()
        .eq('id', pendingDeleteId);

      if (error) throw error;
      fetchStudents();
      setShowConfirmDelete(false);
      setPendingDeleteId(null);
    } catch (error) {
      console.error('Error deleting student:', error);
      alert('Failed to delete student');
      setShowConfirmDelete(false);
      setPendingDeleteId(null);
    }
  };

  /**
   * Check if form has unsaved changes
   */
  const hasFormChanged = (): boolean => {
    if (!originalFormData) {
      // New student - check if any field has value
      return !!(formData.name || formData.email || formData.rate || formData.description);
    }
    
    return (
      formData.name !== originalFormData.name ||
      formData.email !== originalFormData.email ||
      formData.rate !== originalFormData.rate ||
      formData.description !== originalFormData.description
    );
  };

  /**
   * Request to close modal - shows confirmation if there are unsaved changes
   */
  const handleRequestClose = () => {
    if (hasFormChanged()) {
      setShowConfirmDiscard(true); // Show confirmation modal (form stays visible underneath)
    } else {
      resetForm();
    }
  };

  /**
   * Resets the form to its initial state
   */
  const resetForm = () => {
    setFormData({ name: '', email: '', rate: '', description: '' });
    setEditingStudent(null);
    setOriginalFormData(null);
    setShowForm(false);
    setShowConfirmDiscard(false);
  };

  /**
   * Confirm discard changes
   */
  const handleConfirmDiscard = () => {
    resetForm();
  };

  /**
   * Updates form data (partial update)
   */
  const updateFormData = (data: Partial<StudentFormData>) => {
    setFormData({ ...formData, ...data });
  };

  /**
   * Filter students based on search query
   * Searches in name, email, and description
   */
  const filteredStudents = students.filter(student => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase().trim();
    const nameMatch = student.name.toLowerCase().includes(query);
    const emailMatch = student.email?.toLowerCase().includes(query) || false;
    const descriptionMatch = student.description?.toLowerCase().includes(query) || false;
    
    return nameMatch || emailMatch || descriptionMatch;
  });

  return {
    // State
    students: filteredStudents,
    allStudents: students, // Keep original for reference if needed
    loading,
    showForm,
    editingStudent,
    formData,
    showConfirmDiscard,
    showConfirmDelete,
    searchQuery,

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
    setSearchQuery,
    hasFormChanged,
    setShowConfirmDelete,
    setPendingDeleteId,
    setShowConfirmDiscard,
  };
}

