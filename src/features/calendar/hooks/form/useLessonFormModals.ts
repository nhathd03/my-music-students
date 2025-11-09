import { useState } from "react";
import type { Lesson } from "../../../../types/database";

export function useLessonFormModals() {
  const [showConfirmDiscard, setShowConfirmDiscard] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showRecurringEditModal, setShowRecurringEditModal] = useState(false);
  
  const [pendingDeleteLesson, setPendingDeleteLesson] = useState<Lesson | null>(null);
  const [pendingDeleteScope, setPendingDeleteScope] = useState<'single' | 'future' | null>(null);
  const [recurringEditScope, setRecurringEditScope] = useState<'single' | 'future' | null>(null);
  const [recurringAction, setRecurringAction] = useState<'edit' | 'delete' | null>(null);

  const resetRecurringState = () => {
    setShowRecurringEditModal(false);
    setRecurringEditScope(null);
    setRecurringAction(null);
  };

  const resetAllModals = () => {
    setShowConfirmDiscard(false);
    setShowConfirmDelete(false);
    resetRecurringState();
    setPendingDeleteLesson(null);
    setPendingDeleteScope(null);
  };

  return {
    // Discard modal
    showConfirmDiscard,
    setShowConfirmDiscard,
    
    // Delete modal
    showConfirmDelete,
    setShowConfirmDelete,
    pendingDeleteLesson,
    setPendingDeleteLesson,
    pendingDeleteScope,
    setPendingDeleteScope,
    
    // Recurring modal
    showRecurringEditModal,
    setShowRecurringEditModal,
    recurringEditScope,
    setRecurringEditScope,
    recurringAction,
    setRecurringAction,
    
    // Utils
    resetRecurringState,
    resetAllModals,
  };
}