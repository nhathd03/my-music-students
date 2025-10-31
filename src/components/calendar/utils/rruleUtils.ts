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

  // Create date in local time - Date stores as UTC internally
  const [year, month, day] = formDate.split('-').map(Number);
  const [hours, minutes] = formTime.split(':').map(Number);
  const dtstart = new Date(year, month - 1, day, hours, minutes);

  const options: RRuleOptions = {
    freq,
    interval,
    dtstart,
  };

  if (endType === 'until') {
    const until = new Date(untilDate);
    until.setHours(23, 59, 59, 999);
    options.until = until;
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

