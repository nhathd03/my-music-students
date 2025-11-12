import { useNavigate } from 'react-router-dom';
import { markLessonAsUnpaid } from '../../payments/services/paymentService';
import type { LessonWithStudent } from '../types';
import { extractLocalDateFromUTC } from '../utils/dateUtils';

export function useLessonPayment(refetch: () => void) {
  const navigate = useNavigate();

  const handlePayLesson = (lesson: LessonWithStudent) => {
    // Extract local date from timestamp
    const lessonDate = extractLocalDateFromUTC(lesson.timestamp);
    
    navigate('/payments', {
      state: {
        lessonToPay: {
          id: lesson.id,
          date: lessonDate,
          studentId: lesson.student_id,
        }
      }
    });
  };

  const handleUnpayLesson = async (lesson: LessonWithStudent) => {
    try {
      // Extract local date from timestamp
      const lessonDate = extractLocalDateFromUTC(lesson.timestamp);
      await markLessonAsUnpaid(lesson.id, lessonDate);
      refetch();
    } catch (error) {
      console.error('Error marking lesson as unpaid:', error);
      alert('Failed to mark lesson as unpaid. Please try again.');
    }
  };

  return { handlePayLesson, handleUnpayLesson };
}