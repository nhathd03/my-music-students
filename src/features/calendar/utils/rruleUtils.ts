import { rrulestr, RRule, Frequency } from 'rrule';

/**
 * RRule utility functions for recurring lesson management
 */

export type RRuleOptions = {
  freq: Frequency;
  interval: number;
  dtstart: Date;
  until?: Date;
  count?: number;
};

export type RecurrenceFormData = {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  interval: number;
  endType: 'never' | 'until' | 'count';
  untilDate: string;
  occurrenceCount: number;
};

/**
 * Generates an RRULE string from recurrence form data
 */
export function generateRRule(
  formDate: string,
  formTime: string,
  recurrenceData: RecurrenceFormData
): string | null {
  const { frequency, interval, endType, untilDate, occurrenceCount } = recurrenceData;

  const freqMap = {
    DAILY: Frequency.DAILY,
    WEEKLY: Frequency.WEEKLY,
    MONTHLY: Frequency.MONTHLY,
  };

  const freq = freqMap[frequency];
  if (!freq) return null;


  const dtstart = new Date(`${formDate}T${formTime}`);

  const options: RRuleOptions = {
    freq,
    interval,
    dtstart,
  };

  if (endType === 'until') {
    options.until = new Date(untilDate);;
  } else if (endType === 'count') {
    options.count = occurrenceCount;
  }

  const rule = new RRule(options);
  return rule.toString();
}

/**
 * Parses an RRULE string and extracts recurrence options
 * Returns null if parsing fails
 */
export function parseRRule(rruleString: string): RecurrenceFormData | null {
  try {
    const rule = rrulestr(rruleString);
    const opts = rule.options;

    const freqName = Object.keys(Frequency).find(
      key => Frequency[key as keyof typeof Frequency] === opts.freq
    ) as 'DAILY' | 'WEEKLY' | 'MONTHLY';

    return {
      frequency: freqName || 'WEEKLY',
      interval: opts.interval || 1,
      endType: opts.until ? 'until' : opts.count ? 'count' : 'never',
      untilDate: opts.until
        ? opts.until.toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
      occurrenceCount: opts.count || 10,
    };
  } catch (err) {
    console.error('Failed to parse RRULE:', err);
    return null;
  }
}

/**
 * Calculates the last occurrence date from an RRULE string
 * Returns the date as YYYY-MM-DD string, or null if there's no end or on error
 */
export function getLastOccurrenceDate(rruleString: string): string | null {
  try {
    const rule = rrulestr(rruleString);
    const opts = rule.options;
    
    // If it never ends, return null
    if (!opts.until && !opts.count) {
      return null;
    }
    

    let endDate: Date;
    
    if (opts.until) {
      endDate = opts.until;
    } else if (opts.count) {
      // Generate all occurrences up to count
      const allOccurrences = rule.all();
      if (allOccurrences.length > 0) {
        endDate = allOccurrences[allOccurrences.length - 1];
      } else {
        return null;
      }
    } else {
      return null;
    }
    
    return endDate.toISOString().split('T')[0];
  } catch (err) {
    console.error('Failed to calculate last occurrence:', err);
    return null;
  }
}

/**
 * Updates an existing RRULE string with new recurrence options while preserving DTSTART
 * This is used when only recurrence settings change but the lesson date/time stays the same
 */
export function updateRRuleOptions(
  existingRRule: string,
  recurrenceData: RecurrenceFormData
): string | null {
  try {
    const rule = rrulestr(existingRRule);
    const opts = rule.options;
    
    const freqMap = {
      DAILY: Frequency.DAILY,
      WEEKLY: Frequency.WEEKLY,
      MONTHLY: Frequency.MONTHLY,
    };
    
    const freq = freqMap[recurrenceData.frequency];
    if (!freq) return null;
    
    // Preserve the original DTSTART
    const newOptions: RRuleOptions = {
      freq,
      interval: recurrenceData.interval,
      dtstart: opts.dtstart || new Date(),
    };
    
    // Update end condition
    if (recurrenceData.endType === 'until') {
      newOptions.until = new Date(recurrenceData.untilDate);
    } else if (recurrenceData.endType === 'count') {
      newOptions.count = recurrenceData.occurrenceCount;
    }
    
    const newRule = new RRule(newOptions);
    return newRule.toString();
  } catch (err) {
    console.error('Failed to update RRule options:', err);
    return null;
  }
}

