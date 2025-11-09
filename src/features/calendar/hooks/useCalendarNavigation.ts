import { useState } from "react";
import { addMonths, subMonths } from 'date-fns';

export function useCalendarNavigation() {
    
    const [currentDate, setCurrentDate] = useState(new Date());

    const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

    return {
        currentDate,
        setCurrentDate,
        goToPreviousMonth,
        goToNextMonth,
    };
}