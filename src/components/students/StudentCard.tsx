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
 * - Description (if provided)
 * - Edit and delete action buttons
 * - Hover effects for interactivity
 * - Optimized mobile-friendly layout
 */
export default function StudentCard({ student, onEdit, onDelete }: StudentCardProps) {
  return (
    <div className="card student-card">
      {/* Card Header - Name and Actions */}
      <div className="student-card-header">
        <h3 className="student-name">{student.name}</h3>
        <div className="student-card-actions">
          <button
            className="icon-btn icon-btn-edit"
            onClick={() => onEdit(student)}
            title="Edit student"
            aria-label={`Edit ${student.name}`}
          >
            <Edit2 size={18} />
          </button>
          <button
            className="icon-btn icon-btn-danger"
            onClick={() => onDelete(student.id)}
            title="Delete student"
            aria-label={`Delete ${student.name}`}
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {/* Card Body - Description and Details */}
      <div className="student-card-body">
        {/* Description */}
        {student.description && (
          <div className="student-description">
            <p className="student-description-text">{student.description}</p>
          </div>
        )}

        {/* Contact and Rate Information */}
        {(student.email || student.rate) && (
          <div className="student-card-details">
            {student.email && (
              <div className="info-row">
                <div className="info-icon">
                  <Mail size={16} />
                </div>
                <span className="info-text">{student.email}</span>
              </div>
            )}
            {student.rate && (
              <div className="info-row">
                <div className="info-icon">
                  <DollarSign size={16} />
                </div>
                <span className="info-text">${student.rate}/hour</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

