import { useState, useEffect, useCallback } from 'react';

import type { Student } from '../../../types/database';
import type { LessonWithStudent } from '../types';

import * as lessonService from '../services/lesson';


export function useCalendarData(currentDate: Date) { 
    // Calendar state
    const [lessons, setLessons] = useState<LessonWithStudent[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);

    /**
     * Fetches students and lessons from Supabase for the current month
     */
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [studentsData, lessonsData] = await Promise.all([
            lessonService.fetchStudents(),
            lessonService.fetchLessonsForMonth(currentDate),
            ]);
            setStudents(studentsData);
            setLessons(lessonsData);
        } catch (error) {
            console.error('Error fetching data:', error);
            alert('Failed to load calendar data');
        } finally {
            setLoading(false);
        }
    }, [currentDate]);

    // Fetch data when current date changes
    useEffect(() => {
        fetchData();
    }, [currentDate]);

    return {
        lessons,
        students,
        loading,
        refetch: fetchData,
    }

}
