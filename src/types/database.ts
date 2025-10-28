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
    };
  };
}

export interface Student {
  id: number;
  name: string;
  email: string | null;
  rate: number | null;
  created_at: string;
}

export interface Lesson {
  id: number;
  date: string;
  duration: number;
  paid: boolean;
  student_id: number;
  created_at: string;
}

export interface Payment {
  id: number;
  date: string;
  amount: number;
  method: string | null;
  student_id: number;
}

