// TypeScript types for Supabase database schema
export interface Database {
  public: {
    Tables: {
      student: {
        Row: Student;
        Insert: Omit<Student, 'id' | 'created_at'>;
        Update: Partial<Omit<Student, 'id' | 'created_at'>>;
      };
      lesson: {
        Row: Lesson;
        Insert: Omit<Lesson, 'id' | 'created_at'>;
        Update: Partial<Omit<Lesson, 'id' | 'created_at'>>;
      };
      payment: {
        Row: Payment;
        Insert: Omit<Payment, 'id'>;
        Update: Partial<Omit<Payment, 'id'>>;
      };
      payment_item: {
        Row: PaymentItem;
        Insert: Omit<PaymentItem, 'id' | 'created_at'>;
        Update: Partial<Omit<PaymentItem, 'id' | 'created_at'>>;
      };
      lesson_note: {
        Row: LessonNote;
        Insert: Omit<LessonNote, 'id' | 'created_at'>;
        Update: Partial<Omit<LessonNote, 'id' | 'created_at'>>;
      };
    };
  };
}

export interface Student {
  id: number;
  name: string;
  email: string | null;
  rate: number | null;
  description: string | null;
  created_at: string;
}

export interface Lesson {
  id: number;
  timestamp: string;
  duration: number;
  student_id: number;
  recurrence_rule: string | null;
  note: string | null;
  created_at: string;
}

export interface Payment {
  id: number;
  date: string;
  total_amount: number;
  method: string | null;
  student_id: number;
  notes: string | null;
}

export interface PaymentItem {
  id: number;
  payment_id: number;
  lesson_id: number;
  lesson_date: string;  
  amount: number;
  created_at: string;
}

export interface LessonNote {
  id: number;
  lesson_id: number;
  lesson_date: string; 
  note: string;
  created_at: string;
}

