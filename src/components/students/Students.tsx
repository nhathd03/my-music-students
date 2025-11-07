import { Plus, Search } from 'lucide-react';
import { useStudents } from './hooks/useStudents';
import StudentModal from './StudentModal';
import StudentList from './StudentList';
import ConfirmationModal from '../shared/ConfirmationModal';
import './styles/Students.css';

/**
 * Students Component (Main Container)
 * 
 * This is the main container component that orchestrates all student-related
 * functionality. It delegates specific responsibilities to smaller,
 * focused sub-components:
 * 
 * - StudentModal: Handles adding/editing student records
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
        <button className="btn btn-primary" onClick={() => {
          // Reset form to initial state when opening
          resetForm();
          setShowForm(true);
        }}>
          <Plus size={18} />
          Add Student
        </button>
      </div>

      {/* Search Bar */}
      <div className="students-search">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="input search-input"
            placeholder="Search students by name, email, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Form Section - Add/Edit students */}
      {showForm && (
        <StudentModal
          formData={formData}
          editingStudent={editingStudent}
          onSubmit={handleSubmit}
          onCancel={resetForm}
          onChange={updateFormData}
          hasUnsavedChanges={hasFormChanged()}
          onRequestClose={handleRequestClose}
        />
      )}

      {/* Unsaved Changes Confirmation Modal */}
      {showConfirmDiscard && (
        <ConfirmationModal
          title="Discard Changes?"
          message="You have unsaved changes. Are you sure you want to discard them?"
          confirmText="Discard"
          cancelText="Cancel"
          onConfirm={handleConfirmDiscard}
          onCancel={() => {
            setShowConfirmDiscard(false); // Just hide confirmation, form stays visible
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showConfirmDelete && (
        <ConfirmationModal
          title="Delete Student?"
          message="Are you sure you want to delete this student? This will also delete all their lessons and payments."
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setShowConfirmDelete(false);
            setPendingDeleteId(null);
          }}
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

