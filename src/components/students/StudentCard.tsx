import { Edit2, Trash2, Mail, DollarSign } from 'lucide-react';
import type { StudentCardProps } from './types';

/**
 * StudentCard Component
 * 
 * Displays an individual student in a card format.
 * 
 * Features:
 * - Student name as header
 * - Email address (if provided)
 * - Hourly rate (if provided)
 * - Edit and delete action buttons
 * - Hover effects for interactivity
 */
export default function StudentCard({ student, onEdit, onDelete }: StudentCardProps) {
  return (
    <div className="card student-card">
      {/* Card Header - Name and Actions */}
      <div className="student-card-header">
        <h3>{student.name}</h3>
        <div className="student-card-actions">
          <button
            className="icon-btn"
            onClick={() => onEdit(student)}
            title="Edit student"
          >
            <Edit2 size={16} />
          </button>
          <button
            className="icon-btn icon-btn-danger"
            onClick={() => onDelete(student.id)}
            title="Delete student"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Card Info - Email and Rate */}
      <div className="student-card-info">
        {student.email && (
          <div className="info-row">
            <Mail size={16} />
            <span>{student.email}</span>
          </div>
        )}
        {student.rate && (
          <div className="info-row">
            <DollarSign size={16} />
            <span>${student.rate}/hour</span>
          </div>
        )}
      </div>
    </div>
  );
}

