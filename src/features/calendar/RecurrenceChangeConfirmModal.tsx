import ConfirmationModal from '../../components/ConfirmationModal';

interface RecurrenceChangeConfirmModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Modal to confirm changes to recurrence settings
 * This appears when a user modifies recurrence options on an existing recurring lesson
 * and informs them that all future occurrences will be updated
 */
export default function RecurrenceChangeConfirmModal({
  onConfirm,
  onCancel,
}: RecurrenceChangeConfirmModalProps) {
  return (
    <ConfirmationModal
      title="Update Recurring Lesson"
      message="Changing the recurrence will update all future entries. Are you sure you want to continue?"
      confirmText="Update"
      cancelText="Cancel"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

