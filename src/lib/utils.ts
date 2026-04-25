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
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const timeMatch = timeStr.match(/^(\d{2}):(\d{2})$/);
  if (!match || !timeMatch) {
    return new Date(`${dateStr}T${timeStr}`).toISOString();
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);

  const getTimeZoneOffsetMs = (date: Date, timeZone: string): number => {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const parts = formatter.formatToParts(date);

    const getValue = (type: Intl.DateTimeFormatPartTypes): number =>
      Number(parts.find((part) => part.type === type)?.value || 0);

    const tzAsUTC = Date.UTC(
      getValue("year"),
      getValue("month") - 1,
      getValue("day"),
      getValue("hour"),
      getValue("minute"),
      getValue("second"),
    );

    return tzAsUTC - date.getTime();
  };

  const cairoTimeZone = "Africa/Cairo";

  // Start from the wall-clock date/time components and solve for UTC instant in Cairo.
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const initialOffset = getTimeZoneOffsetMs(new Date(utcGuess), cairoTimeZone);
  let targetUtc = utcGuess - initialOffset;

  // Re-check once to handle DST boundary transitions robustly.
  const correctedOffset = getTimeZoneOffsetMs(
    new Date(targetUtc),
    cairoTimeZone,
  );
  if (correctedOffset !== initialOffset) {
    targetUtc = utcGuess - correctedOffset;
  }

  return new Date(targetUtc).toISOString();
}
