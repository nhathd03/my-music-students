import { addMonths, subMonths } from 'date-fns';
import type { Lesson, Student } from '../../../types/database';
import type { LessonWithStudent } from '../types';

export interface CalendarState {
  navigation: {
    currentDate: Date;
  };
  data: {
    lessons: LessonWithStudent[];
    students: Student[];
    loading: boolean;
  };
  form: {
    showForm: boolean;
  };
  modals: {
    showConfirmDiscard: boolean;
    showConfirmDelete: boolean;
    showRecurringEditModal: boolean;
    pendingDeleteLesson: Lesson | null;
    pendingDeleteScope: 'single' | 'future' | null;
    recurringEditScope: 'single' | 'future' | null;
    recurringAction: 'edit' | 'delete' | null;
  };
}

export type CalendarAction =
  | { type: 'NAVIGATE_PREVIOUS_MONTH' }
  | { type: 'NAVIGATE_NEXT_MONTH' }
  | { type: 'SET_CURRENT_DATE'; payload: Date }
  | { type: 'FETCH_DATA_START' }
  | { type: 'FETCH_DATA_SUCCESS'; payload: { lessons: LessonWithStudent[]; students: Student[] } }
  | { type: 'FETCH_DATA_ERROR' }
  | { type: 'SHOW_FORM' }
  | { type: 'HIDE_FORM' }
  | { type: 'RESET_FORM' }
  | { type: 'SHOW_CONFIRM_DISCARD' }
  | { type: 'HIDE_CONFIRM_DISCARD' }
  | { type: 'SHOW_CONFIRM_DELETE'; payload: { lesson: Lesson; scope?: 'single' | 'future' | null } }
  | { type: 'HIDE_CONFIRM_DELETE' }
  | { type: 'SHOW_RECURRING_EDIT_MODAL'; payload: 'edit' | 'delete' }
  | { type: 'HIDE_RECURRING_EDIT_MODAL' }
  | { type: 'SET_RECURRING_EDIT_SCOPE'; payload: 'single' | 'future' | null }
  | { type: 'RESET_RECURRING_STATE' };

const initialState: CalendarState = {
  navigation: {
    currentDate: new Date(),
  },
  data: {
    lessons: [],
    students: [],
    loading: true,
  },
  form: {
    showForm: false,
  },
  modals: {
    showConfirmDiscard: false,
    showConfirmDelete: false,
    showRecurringEditModal: false,
    pendingDeleteLesson: null,
    pendingDeleteScope: null,
    recurringEditScope: null,
    recurringAction: null,
  },
};

export function calendarReducer(state: CalendarState, action: CalendarAction): CalendarState {
  switch (action.type) {
    case 'NAVIGATE_PREVIOUS_MONTH':
      return {
        ...state,
        navigation: {
          currentDate: subMonths(state.navigation.currentDate, 1),
        },
      };

    case 'NAVIGATE_NEXT_MONTH':
      return {
        ...state,
        navigation: {
          currentDate: addMonths(state.navigation.currentDate, 1),
        },
      };

    case 'SET_CURRENT_DATE':
      return {
        ...state,
        navigation: {
          currentDate: action.payload,
        },
      };

    case 'FETCH_DATA_START':
      return {
        ...state,
        data: {
          ...state.data,
          loading: true,
        },
      };

    case 'FETCH_DATA_SUCCESS':
      return {
        ...state,
        data: {
          lessons: action.payload.lessons,
          students: action.payload.students,
          loading: false,
        },
      };

    case 'FETCH_DATA_ERROR':
      return {
        ...state,
        data: {
          ...state.data,
          loading: false,
        },
      };

    case 'SHOW_FORM':
      return {
        ...state,
        form: {
          showForm: true,
        },
      };

    case 'HIDE_FORM':
      return {
        ...state,
        form: {
          showForm: false,
        },
      };

    case 'RESET_FORM':
      return {
        ...state,
        form: {
          showForm: false,
        },
        modals: {
          ...state.modals,
          showConfirmDiscard: false,
          showConfirmDelete: false,
          showRecurringEditModal: false,
          pendingDeleteLesson: null,
          pendingDeleteScope: null,
          recurringEditScope: null,
          recurringAction: null,
        },
      };

    case 'SHOW_CONFIRM_DISCARD':
      return {
        ...state,
        modals: {
          ...state.modals,
          showConfirmDiscard: true,
        },
      };

    case 'HIDE_CONFIRM_DISCARD':
      return {
        ...state,
        modals: {
          ...state.modals,
          showConfirmDiscard: false,
        },
      };

    case 'SHOW_CONFIRM_DELETE':
      return {
        ...state,
        modals: {
          ...state.modals,
          showConfirmDelete: true,
          pendingDeleteLesson: action.payload.lesson,
          pendingDeleteScope: action.payload.scope || null,
        },
      };

    case 'HIDE_CONFIRM_DELETE':
      return {
        ...state,
        modals: {
          ...state.modals,
          showConfirmDelete: false,
          pendingDeleteLesson: null,
          pendingDeleteScope: null,
        },
      };

    case 'SHOW_RECURRING_EDIT_MODAL':
      return {
        ...state,
        modals: {
          ...state.modals,
          showRecurringEditModal: true,
          recurringAction: action.payload,
        },
      };

    case 'HIDE_RECURRING_EDIT_MODAL':
      return {
        ...state,
        modals: {
          ...state.modals,
          showRecurringEditModal: false,
        },
      };

    case 'SET_RECURRING_EDIT_SCOPE':
      return {
        ...state,
        modals: {
          ...state.modals,
          recurringEditScope: action.payload,
        },
      };

    case 'RESET_RECURRING_STATE':
      return {
        ...state,
        modals: {
          ...state.modals,
          showRecurringEditModal: false,
          recurringEditScope: null,
          recurringAction: null,
        },
      };

    default:
      return state;
  }
}

export { initialState };

