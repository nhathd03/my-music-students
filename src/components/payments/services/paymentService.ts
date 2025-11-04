import { rrulestr } from 'rrule';
import { supabase } from '../../../lib/supabase';
import type { LessonForPayment } from '../types';

/**
 * Payment Service
 * Handles payment-related database operations
 */

/**
 * Fetches unpaid lessons for a specific student
 * A lesson is unpaid if it has no payment_items linking to it
 *
 */
export async function fetchUnpaidLessons(studentId: number): Promise<LessonForPayment[]> {
  try {
    // Fetch all lessons for this student
    const { data: lessons, error: lessonsError } = await supabase
      .from('lesson')
      .select('id, date, duration, student_id, note, recurrence_rule')
      .eq('student_id', studentId)
      .order('date', { ascending: true });

    if (lessonsError) throw lessonsError;

    // Fetch all paid lesson occurrences for that student (lesson_id + lesson_date combinations)
    const { data: paidOccurrences, error: paymentItemsError } = await supabase
      .from('payment_item')
      .select('lesson_id, lesson_date')
      .in('lesson_id', (lessons || []).map(l => l.id));

    if (paymentItemsError) throw paymentItemsError;

    // Create a Set of paid (lesson_id, date) combinations for fast lookup
    // Using "lessonId-date" as the key format
    const paidOccurrenceKeys = new Set(
      (paidOccurrences || []).map(item => 
        `${item.lesson_id}-${new Date(item.lesson_date).toISOString()}`
      )
    );

    // Expand lessons and filter to unpaid occurrences
    const unpaidLessons: LessonForPayment[] = [];
    const today = new Date();
    const MAX_OCCURRENCES_TO_SHOW = 50; // Show up to 50 unpaid lessons per student

    for (const lesson of lessons || []) {

      if (lesson.recurrence_rule) {
        // Recurring lesson - expand into occurrences
        try {
          const rrule = rrulestr(lesson.recurrence_rule);
          const lessonStartDate = new Date(lesson.date);
          
          // Generate occurrences starting from the lesson's original start date
          const farFuture = new Date(today.getTime() + 1095 * 24 * 60 * 60 * 1000); // 3 years
          const endDate = rrule.options.until 
            ? new Date(rrule.options.until)
            : farFuture;
          
          const allOccurrences = rrule.between(lessonStartDate, endDate, true);
          
          // Find unpaid occurrences starting from the earliest
          let unpaidCount = 0;
          
          for (const occurrence of allOccurrences) {
            const occurrenceDate = occurrence.toISOString();
            const occurrenceKey = `${lesson.id}-${occurrenceDate}`;
            
            // Skip if this specific occurrence is already paid
            if (paidOccurrenceKeys.has(occurrenceKey)) {
              continue;
            }

            // Add unpaid occurrence to the list
            unpaidLessons.push({
              id: lesson.id,
              date: occurrenceDate,
              duration: lesson.duration,
              student_id: lesson.student_id,
              note: null, // Notes not needed in payment selection
            });
            
            unpaidCount++;
            
            // Stop after we have enough unpaid occurrences for this lesson
            if (unpaidCount >= MAX_OCCURRENCES_TO_SHOW) {
              break;
            }
          }
        } catch (error) {
          console.error(`Error parsing recurrence rule for lesson ${lesson.id}:`, error);
          // Skip this lesson if rrule is invalid
        }
      } else {
        // Non-recurring lesson - add if not paid
        const lessonDate = new Date(lesson.date).toISOString();
        const occurrenceKey = `${lesson.id}-${lessonDate}`;
        
        if (!paidOccurrenceKeys.has(occurrenceKey)) {
          unpaidLessons.push({
            id: lesson.id,
            date: lesson.date,
            duration: lesson.duration,
            student_id: lesson.student_id,
            note: null, // Notes not needed in payment selection
          });
        }
      }
    }

    // Sort by date
    unpaidLessons.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return unpaidLessons;
  } catch (error) {
    console.error('Error fetching unpaid lessons:', error);
    throw error;
  }
}

/**
 * Creates a payment and links it to selected lesson occurrences via payment_items
 */
export async function createPaymentWithLessons(
  studentId: number,
  lessons: Array<{ id: number; date: string }>,
  totalAmount: number,
  method: string | null,
  date: string,
  notes: string | null
): Promise<void> {
  try {
    // Step 1: Create the payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payment')
      .insert({
        student_id: studentId,
        date: new Date(date).toISOString(),
        method,
        total_amount: totalAmount,
        notes,
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    // Step 2: Calculate amount per lesson (split evenly for now)
    const amountPerLesson = totalAmount / lessons.length;

    // Step 3: Create payment_items for each lesson occurrence
    const paymentItems = lessons.map(lesson => ({
      payment_id: payment.id,
      lesson_id: lesson.id,
      lesson_date: new Date(lesson.date).toISOString(),
      amount: amountPerLesson,
    }));

    const { error: itemsError } = await supabase
      .from('payment_item')
      .insert(paymentItems);

    if (itemsError) throw itemsError;

    console.log(`Created payment ${payment.id} with ${lessons.length} lesson occurrence(s)`);
  } catch (error) {
    console.error('Error creating payment with lessons:', error);
    throw error;
  }
}

