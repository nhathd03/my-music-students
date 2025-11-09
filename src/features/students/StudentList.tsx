import StudentCard from './StudentCard';
import type { StudentListProps } from './types';

/**
 * StudentList Component
 * 
 * Displays all students in a responsive grid layout.
 * Shows an empty state when no students are available.
 * 
 * The grid automatically adjusts based on screen size:
 * - Desktop: Multiple columns
 * - Tablet: 2 columns
 * - Mobile: Single column
 */
export default function StudentList({ students, onEdit, onDelete }: StudentListProps) {
  // Empty state
  if (students.length === 0) {
    return (
      <div className="card students-empty">
        <p>No students found. Try adjusting your search or add your first student to get started!</p>
      </div>
    );
  }

  // Grid view
  return (
    <div className="students-grid">
      {students.map((student) => (
        <StudentCard
          key={student.id}
          student={student}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

