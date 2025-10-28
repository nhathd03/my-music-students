import { Plus } from 'lucide-react';
import { useStudents } from './hooks/useStudents';
import StudentForm from './StudentForm';
import StudentList from './StudentList';
import '../Students.css';

/**
 * Students Component (Main Container)
 * 
 * This is the main container component that orchestrates all student-related
 * functionality. It delegates specific responsibilities to smaller,
 * focused sub-components:
 * 
 * - StudentForm: Handles adding/editing student records
 * - StudentList: Displays the grid of student cards
 * - StudentCard: Individual student display (used by StudentList)
 * 
 * Business logic is managed by the useStudents custom hook,
 * keeping this component focused on composition and layout.
 */
export default function Students() {
  const {
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
  } = useStudents();

  // Loading state
  if (loading) {
    return <div className="students-loading">Loading students...</div>;
  }

  return (
    <div className="students-container">
      {/* Header Section */}
      <div className="students-header">
        <div>
          <h2>Students</h2>
          <p className="students-subtitle">Manage your piano students</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <Plus size={18} />
          Add Student
        </button>
      </div>

      {/* Form Section - Add/Edit students */}
      {showForm && (
        <StudentForm
          formData={formData}
          editingStudent={editingStudent}
          onSubmit={handleSubmit}
          onCancel={resetForm}
          onChange={updateFormData}
        />
      )}

      {/* List Section - Display all students */}
      <StudentList
        students={students}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}

