/**
 * RecurringEditModal Component
 * 
 * Modal that appears when performing actions on recurring event occurrences.
 * Asks the user whether to apply the action to only this occurrence or this and all future occurrences.
 */

interface RecurringEditModalProps {
  action: 'edit' | 'delete' | 'togglePaid' | null;
  setRecurringEditScope: React.Dispatch<React.SetStateAction<'single' | 'future' | null>>;
  onCancel: () => void;
}

export default function RecurringEditModal({ action, setRecurringEditScope, onCancel }: RecurringEditModalProps) {
  // Get appropriate text based on action
  const getActionText = () => {
    switch (action) {
      case 'edit':
        return {
          title: 'Edit Recurring Event',
          description: 'This is a recurring event. Would you like to edit just this occurrence or this and all future occurrences?',
          singleTitle: 'This occurrence',
          singleSubtitle: 'Only this event will be modified',
          futureTitle: 'This and future occurrences',
          futureSubtitle: 'This and all following events will be modified',
        };
      case 'delete':
        return {
          title: 'Delete Recurring Event',
          description: 'This is a recurring event. Would you like to delete just this occurrence or this and all future occurrences?',
          singleTitle: 'This occurrence',
          singleSubtitle: 'Only this event will be deleted',
          futureTitle: 'This and future occurrences',
          futureSubtitle: 'This and all following events will be deleted',
        };
      case 'togglePaid':
        return {
          title: 'Mark Recurring Event',
          description: 'This is a recurring event. Would you like to mark just this occurrence or this and all future occurrences?',
          singleTitle: 'This occurrence',
          singleSubtitle: 'Only this event will be marked',
          futureTitle: 'This and future occurrences',
          futureSubtitle: 'This and all following events will be marked',
        };
      default:
        return {
          title: 'Recurring Event',
          description: 'This is a recurring event. Choose which occurrences to affect.',
          singleTitle: 'This occurrence',
          singleSubtitle: 'Only this event',
          futureTitle: 'This and future occurrences',
          futureSubtitle: 'This and all following events',
        };
    }
  };

  const text = getActionText();

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content recurring-edit-modal" onClick={(e) => e.stopPropagation()}>
        <div className="card">
          <h3>{text.title}</h3>
          <p className="recurring-edit-description">
            {text.description}
          </p>
          
          <div className="recurring-edit-options">
            <button
              type="button"
              className="btn btn-secondary recurring-edit-btn"
              onClick={() => {
                setRecurringEditScope('single');
                onCancel();
              }}
            >
              <div className="recurring-edit-btn-content">
                <span className="recurring-edit-btn-title">{text.singleTitle}</span>
                <span className="recurring-edit-btn-subtitle">{text.singleSubtitle}</span>
              </div>
            </button>
            
            <button
              type="button"
              className="btn btn-secondary recurring-edit-btn"
              onClick={() => {
                setRecurringEditScope('future');
                onCancel();
              }}
            >
              <div className="recurring-edit-btn-content">
                <span className="recurring-edit-btn-title">{text.futureTitle}</span>
                <span className="recurring-edit-btn-subtitle">{text.futureSubtitle}</span>
              </div>
            </button>
          </div>
          
          <div className="recurring-edit-actions">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

