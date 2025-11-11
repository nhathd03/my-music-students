// hooks/form/useLessonForm.ts
import { useEffect } from "react";
import { format } from 'date-fns';
import type { Lesson } from '../../../../types/database';
import type { LessonFormData } from '../../types';
import * as lessonService from '../../services/lesson';
import type { useRecurrenceSettings } from "../useRecurrenceSettings";
import { parseUTCDate } from "../../utils/dateUtils";
import { useLessonFormState } from "./useLessonFormState";
import { useLessonFormModals } from "./useLessonFormModals";
import { useLessonOperations } from "./useLessonOperations";
import { parseRRule } from "../../utils/rruleUtils";
import { RRule } from "rrule";

/**
 * Checks if a recurring lesson has future occurrences
 * Returns false for non-recurring lessons or if there are no future occurrences
 */
const hasFutureOccurrences = (lesson: Lesson) => {
    // Non-recurring lessons don't have "future occurrences" in the series sense
    if (!lesson.recurrence_rule) return false;
    
    try {
        const parsed = parseRRule(lesson.recurrence_rule);
        if (!parsed) return false;
        
        // If endType is 'never', there are always future occurrences (infinite series)
        if (parsed.endType === 'never') return true;
        
        // Check if there's an occurrence after the current lesson date
        const rule = RRule.fromString(lesson.recurrence_rule);
        const currentDate = new Date(lesson.date);
        const nextOccurrence = rule.after(currentDate);
        
        return nextOccurrence !== null;
    } catch (error) {
        console.error('Error checking future occurrences:', error);
        return false;
    }
}

export function useLessonFormActions(  
    refetch: () => Promise<void>,
    recurrenceSettings: ReturnType<typeof useRecurrenceSettings>
) {
    const formState = useLessonFormState();
    const modals = useLessonFormModals();
    const operations = useLessonOperations();

    /**
     * Parse RRULE when editing a recurring lesson
     */
    useEffect(() => {
        if (formState.editingLesson?.recurrence_rule) {
            recurrenceSettings.loadRecurrenceFromRRule(formState.editingLesson.recurrence_rule);
        }
    }, [formState.editingLesson, recurrenceSettings]);

    /**
     * Sync recurrence rule with formData when settings change
     */
    useEffect(() => {
        if (formState.formData.date && formState.formData.time) {
            const rrule = recurrenceSettings.generateCurrentRRule(
                formState.formData.date, 
                formState.formData.time
            );
            
            if (rrule !== formState.formData.recurrence_rule) {
                formState.updateFormData({ recurrence_rule: rrule });
            }
        }
    }, [
        recurrenceSettings.isRecurring,
        recurrenceSettings.frequency,
        recurrenceSettings.interval,
        recurrenceSettings.endType,
        recurrenceSettings.untilDate,
        recurrenceSettings.occurrenceCount,
        formState.formData.date,
        formState.formData.time,
    ]);

    /**
     * Trigger action when recurring edit scope is selected
     */
    useEffect(() => {
        if (!modals.recurringEditScope || !modals.recurringAction) return;
        const run = async () => {
            try {
                switch (modals.recurringAction) {
                    case 'edit': 
                        await performSubmit(); 
                        break;
                    case 'delete': 
                        performDelete(); 
                        break;
                }
            } catch (error) {
                console.error('Error performing recurring action:', error);
                alert('Failed to perform action');
            } finally {
                modals.setRecurringEditScope(null);
                modals.setRecurringAction(null);
            }
        };
        
        run();
    }, [modals.recurringEditScope, modals.recurringAction]);

    /**
     * Reset everything - form, modals, and recurrence settings
     */
    const resetForm = () => {
        formState.resetFormData();
        modals.resetAllModals();
        recurrenceSettings.resetRecurrenceSettings();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formState.editingLesson?.recurrence_rule && !modals.recurringEditScope) {
            modals.setRecurringAction('edit');
            if (hasFutureOccurrences(formState.editingLesson)) {
                modals.setShowRecurringEditModal(true);
            }
            return;
        }

        await performSubmit();
    };

    const performSubmit = async () => {
        
        const lessonData: lessonService.LessonInsertData = {
            student_id: parseInt(formState.formData.student_id),
            date: formState.formData.date,
            time: formState.formData.time,
            duration: parseInt(formState.formData.duration),
        };
        
        if (formState.formData.recurrence_rule) {
            lessonData.recurrence_rule = formState.formData.recurrence_rule;
        }
        
        if (formState.formData.note) {
            lessonData.note = formState.formData.note;
        }

        let result;
        if (formState.editingLesson) {
            result = await operations.updateLesson(
                formState.editingLesson, 
                lessonData, 
                modals.recurringEditScope || undefined
            );
        } else {
            result = await operations.createLesson(lessonData);
        }

        if (result.success) {
            resetForm();
            await refetch();
        } else {
            alert('Failed to save lesson');
        }
    };

    const handleEdit = (lesson: Lesson) => {
        const lessonDate = parseUTCDate(lesson.date);
        recurrenceSettings.setIsRecurring(!!lesson.recurrence_rule);

        const initialFormData: LessonFormData = {
            student_id: lesson.student_id.toString(),
            date: format(lessonDate, 'yyyy-MM-dd'),
            time: format(lessonDate, 'HH:mm'),
            duration: lesson.duration.toString(),
            recurrence_rule: lesson.recurrence_rule || null,
            note: lesson.note || null,
        };

        formState.loadFormData(initialFormData, lesson);
    };

    const handleDelete = (lesson: Lesson) => {
        if (lesson.recurrence_rule) {
            if (hasFutureOccurrences(lesson)) {
                formState.setEditingLesson(lesson);
                modals.setRecurringAction('delete');
                modals.setShowRecurringEditModal(true);
                return;
            } 
            modals.setPendingDeleteLesson(lesson);
            modals.setPendingDeleteScope('single');
            modals.setShowConfirmDelete(true);
            return;
        }

        modals.setPendingDeleteLesson(lesson);
        modals.setPendingDeleteScope(null);
        modals.setShowConfirmDelete(true);
    };

    const handleConfirmDelete = async () => {
        if (!modals.pendingDeleteLesson) return;
             
        const result = await operations.deleteLesson(
            modals.pendingDeleteLesson, 
            modals.pendingDeleteScope || undefined
        );

        if (result.success) {
            await refetch();
            modals.setShowConfirmDelete(false);
            modals.setPendingDeleteLesson(null);
            modals.setPendingDeleteScope(null);
            modals.resetRecurringState();
        } else {
            alert('Failed to delete lesson');
            modals.setShowConfirmDelete(false);
            modals.setPendingDeleteLesson(null);
            modals.setPendingDeleteScope(null);
        }
    };

    const performDelete = () => {
        if (!formState.editingLesson) return;

        modals.setPendingDeleteLesson(formState.editingLesson);
        modals.setPendingDeleteScope(modals.recurringEditScope);
        modals.setShowConfirmDelete(true);
        modals.setShowRecurringEditModal(false);
    };

    const handleRequestClose = () => {
        if (formState.hasFormChanged()) {
            formState.setShowForm(false);
            modals.setShowConfirmDiscard(true);
        } else {
            resetForm();
        }
    };

    const handleConfirmDiscard = () => {
        resetForm();
        modals.setShowConfirmDiscard(false);
    };

    const handleDateClick = (date: Date) => {
        const initialFormData: LessonFormData = {
            student_id: '',
            date: format(date, 'yyyy-MM-dd'),
            time: '',
            duration: '60',
            recurrence_rule: null,
            note: null,
        };
        formState.loadFormData(initialFormData);
    };

    return {
        // Spread form state
        ...formState,
        
        // Handlers
        handleSubmit,
        handleEdit,
        handleDelete,
        handleConfirmDelete,
        handleDateClick,
        handleRequestClose,
        handleConfirmDiscard,
        resetForm,
        
        // Modal states
        ...modals,
    };
}