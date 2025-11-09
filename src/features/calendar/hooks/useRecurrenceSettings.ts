import { useState } from "react";
import { generateRRule, parseRRule } from '../utils/rruleUtils';

export function useRecurrenceSettings() {
    // Recurrence state
    const [isRecurring, setIsRecurring] = useState(false);
    const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('WEEKLY');
    const [interval, setInterval] = useState(1);
    const [endType, setEndType] = useState<'never' | 'until' | 'count'>('never');
    const [untilDate, setUntilDate] = useState(new Date().toISOString().split('T')[0]);
    const [occurrenceCount, setOccurrenceCount] = useState(10);
        
    const resetRecurrenceSettings = () => {
        setIsRecurring(false);
        setFrequency('WEEKLY');
        setInterval(1);
        setEndType('never');
        setUntilDate(new Date().toISOString().split('T')[0]);
        setOccurrenceCount(10);
    };

    const loadRecurrenceFromRRule = (rrule: string) => {
        const parsed = parseRRule(rrule);

        if (parsed) {
            setFrequency(parsed.frequency);
            setInterval(parsed.interval);
            setEndType(parsed.endType);
            setUntilDate(parsed.untilDate);
            setOccurrenceCount(parsed.occurrenceCount);
        }
    }

    const generateCurrentRRule = (date: string, time: string) => {
        if (!isRecurring || !date || !time) return null;
        
        return generateRRule(date, time, {
        frequency,
        interval,
        endType,
        untilDate,
        occurrenceCount,
        });
    };

    return {
        isRecurring,
        setIsRecurring,
        frequency,
        setFrequency,
        interval,
        setInterval,
        endType,
        setEndType,
        untilDate,
        setUntilDate,
        occurrenceCount,
        setOccurrenceCount,
        resetRecurrenceSettings,
        loadRecurrenceFromRRule,
        generateCurrentRRule,
    };
}