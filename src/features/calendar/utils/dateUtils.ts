/**
 * Date utility functions for calendar operations
 * Handles UTC to local time conversions consistently
 */

/**
 * Converts a UTC date string from the database to a local Date object
 * Ensures proper timezone handling by explicitly parsing as UTC
 */
export function parseUTCDate(dateString: string): Date {
  if (dateString.includes('Z') || dateString.includes('+') || dateString.includes('-', 10)) {
    return new Date(dateString);
  }

  return new Date(dateString + 'Z');
}

/**
 * Creates a consistent lookup key for lesson overrides
 * Format: "<lesson_id>|<date_iso>"
 */
export function createOverrideKey(lessonId: number, date: string | Date): string {
  const dateISO = typeof date === 'string' ? new Date(date).toISOString() : date.toISOString();
  return `${lessonId}|${dateISO}`;
}

