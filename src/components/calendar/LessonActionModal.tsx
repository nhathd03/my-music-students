import { X, Edit2, Trash2, DollarSign } from 'lucide-react';
import type { LessonWithStudent } from './types';
import { format } from 'date-fns';

interface LessonActionModalProps {
  lesson: LessonWithStudent;
  onEdit: (lesson: LessonWithStudent) => void;
  onDelete: (lesson: LessonWithStudent) => void;
  onPay: (lesson: LessonWithStudent) => void;
  onUnpay: (lesson: LessonWithStudent) => void;
  onClose: () => void;
}

export default function LessonActionModal({
  lesson,
  onEdit,
  onDelete,
  onPay,
  onUnpay,
  onClose,
}: LessonActionModalProps) {
  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content lesson-action-modal" onClick={(e) => e.stopPropagation()}>
        <div className="card">
          <div className="modal-header">
            <h3>{format(new Date(lesson.date), 'MMM d, yyyy')} - {format(new Date(lesson.date), 'h:mm a')}</h3>
            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              title="Close"
            >
              <X size={20} />
            </button>
          </div>

          <div className="lesson-action-info">
            <div className="lesson-action-student">
              <strong>{lesson.student?.name}</strong>
            </div>
            {lesson.note && (
              <div className="lesson-action-note">
                {lesson.note}
              </div>
            )}
          </div>

          <div className="lesson-action-buttons">
            {lesson.paid ? (
              <button
                type="button"
                className="btn btn-secondary lesson-action-button"
                onClick={() => handleAction(() => onUnpay(lesson))}
              >
                <DollarSign size={18} />
                Mark as Unpaid
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary lesson-action-button"
                onClick={() => handleAction(() => onPay(lesson))}
              >
                <DollarSign size={18} />
                Mark as Paid
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary lesson-action-button"
              onClick={() => handleAction(() => onEdit(lesson))}
            >
              <Edit2 size={18} />
              Edit
            </button>
            <button
              type="button"
              className="btn btn-danger lesson-action-button"
              onClick={() => handleAction(() => onDelete(lesson))}
            >
              <Trash2 size={18} />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

