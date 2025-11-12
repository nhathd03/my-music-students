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

/**
 * Converts local date and time strings to UTC ISO timestamp string
 * @param date - Date string in format 'yyyy-MM-dd'
 * @param time - Time string in format 'HH:mm' or 'HH:mm:ss'
 * @returns UTC ISO timestamp string (e.g., '2024-01-15T14:30:00.000Z')
 */
export function convertLocalDateTimeToUTC(date: string, time: string): string {
  // Combine date and time, then create a Date object in local timezone
  const localDateTime = new Date(`${date}T${time}`);
  
  // Return as ISO string (which is in UTC)
  return localDateTime.toISOString();
}

/**
 * Extracts local time (HH:mm:ss) from a UTC timestamp
 * The timestamp is converted to local time, then the time portion is extracted
 * @param timestamp - UTC ISO timestamp string
 * @returns Time string in format 'HH:mm:ss'
 */
export function extractLocalTimeFromUTC(timestamp: string): string {
  const date = new Date(timestamp);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Extracts local date (yyyy-MM-dd) from a UTC timestamp
 * The timestamp is converted to local time, then the date portion is extracted
 * @param timestamp - UTC ISO timestamp string
 * @returns Date string in format 'yyyy-MM-dd'
 */
export function extractLocalDateFromUTC(timestamp: string): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

