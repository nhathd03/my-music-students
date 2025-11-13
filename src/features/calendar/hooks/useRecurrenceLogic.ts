// hooks/useRecurrenceLogic.ts
import { useState, useCallback } from 'react';
import { parseRRule, generateRRule } from '../utils/rruleUtils';
import { RRule } from 'rrule';
import type { Lesson } from '../../../types/database';

export interface RecurrenceState {
  isRecurring: boolean;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  interval: number;
  endType: 'never' | 'until' | 'count';
  untilDate: string | null;
  occurrenceCount: number;
}

export function useRecurrenceLogic() {
  const [recurrence, setRecurrence] = useState<RecurrenceState>({
    isRecurring: false,
    frequency: 'WEEKLY',
    interval: 1,
    endType: 'never',
    untilDate: null,
    occurrenceCount: 10,
  });

  const setIsRecurring = useCallback((enabled: boolean) => {
    setRecurrence(prev => ({ ...prev, isRecurring: enabled }));
  }, []);

  const setFrequency = useCallback((frequency: RecurrenceState['frequency']) => {
    setRecurrence(prev => ({ ...prev, frequency }));
  }, []);

  const setInterval = useCallback((interval: number) => {
    setRecurrence(prev => ({ ...prev, interval }));
  }, []);

  const setEndType = useCallback((endType: RecurrenceState['endType']) => {
    setRecurrence(prev => ({ ...prev, endType }));
  }, []);

  const setUntilDate = useCallback((date: string) => {
    setRecurrence(prev => ({ ...prev, untilDate: date }));
  }, []);

  const setOccurrenceCount = useCallback((count: number) => {
    setRecurrence(prev => ({ ...prev, occurrenceCount: count }));
  }, []);

  const loadFromRRule = useCallback((rrule: string) => {
    const parsed = parseRRule(rrule);
    if (parsed) {
      setRecurrence({
        isRecurring: true,
        frequency: parsed.frequency,
        interval: parsed.interval,
        endType: parsed.endType,
        untilDate: parsed.untilDate,
        occurrenceCount: parsed.occurrenceCount,
      });
    }
  }, []);

  const generateRRuleString = useCallback((date: string, time: string): string | null => {
    if (!recurrence.isRecurring || !date || !time) return null;
    
    return generateRRule(date, time, {
      frequency: recurrence.frequency,
      interval: recurrence.interval,
      endType: recurrence.endType,
      untilDate: recurrence.untilDate || '',
      occurrenceCount: recurrence.occurrenceCount,
    });
  }, [recurrence]);

  const hasFutureOccurrences = useCallback((lesson: Lesson): boolean => {
    if (!lesson.recurrence_rule) return false;
    
    try {
      const parsed = parseRRule(lesson.recurrence_rule);
      if (!parsed) return false;
      
      if (parsed.endType === 'never') return true;
      
      const rule = RRule.fromString(lesson.recurrence_rule);
      const currentDate = new Date(lesson.timestamp);
      const nextOccurrence = rule.after(currentDate);
      
      return nextOccurrence !== null;
    } catch (error) {
      console.error('Error checking future occurrences:', error);
      return false;
    }
  }, []);

  const reset = useCallback(() => {
    setRecurrence({
      isRecurring: false,
      frequency: 'WEEKLY',
      interval: 1,
      endType: 'never',
      untilDate: null,
      occurrenceCount: 10,
    });
  }, []);

  return {
    recurrence,
    setIsRecurring,
    setFrequency,
    setInterval,
    setEndType,
    setUntilDate,
    setOccurrenceCount,
    loadFromRRule,
    generateRRuleString,
    hasFutureOccurrences,
    reset,
  };
}