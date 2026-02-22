import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Convert a date and time (assumed to be in Egypt timezone) to UTC ISO string.
 * This ensures backend receives times in the correct timezone regardless of user's browser timezone.
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param timeStr - Time string in HH:MM format
 * @returns ISO string representing the UTC equivalent of the Egypt-timezone datetime
 */
export function convertEgyptTimeToUTC(
  dateStr: string,
  timeStr: string,
): string {
  // Create a date/time combination
  const dateTimeStr = `${dateStr}T${timeStr}`;

  // Create date in local browser timezone
  const localDate = new Date(dateTimeStr);

  // Get local timezone offset in minutes
  // Note: getTimezoneOffset() returns -(UTC offset), so UTC+2 becomes -120
  const localOffset = localDate.getTimezoneOffset();

  // Egypt timezone offset: UTC+2 means -120 in getTimezoneOffset terms
  const egyptOffset = -120;

  // Calculate the difference between Egypt timezone and local timezone
  const timezoneShift = (egyptOffset - localOffset) * 60000; // convert to milliseconds

  // Adjust the date to represent Egypt time converted to UTC
  const adjustedDate = new Date(localDate.getTime() + timezoneShift);

  return adjustedDate.toISOString();
}
