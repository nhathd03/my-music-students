import { useNavigate } from 'react-router-dom';
import { markLessonAsUnpaid } from '../../payments/services/paymentService';
import type { LessonWithStudent } from '../types';

export function useLessonPayment(refetch: () => void) {
  const navigate = useNavigate();

  const handlePayLesson = (lesson: LessonWithStudent) => {
    navigate('/payments', {
      state: {
        lessonToPay: {
          id: lesson.id,
          date: lesson.date,
          studentId: lesson.student_id,
        }
      }
    });
  };

  const handleUnpayLesson = async (lesson: LessonWithStudent) => {
    try {
      await markLessonAsUnpaid(lesson.id, lesson.date);
      refetch();
    } catch (error) {
      console.error('Error marking lesson as unpaid:', error);
      alert('Failed to mark lesson as unpaid. Please try again.');
    }
  };

  return { handlePayLesson, handleUnpayLesson };
}