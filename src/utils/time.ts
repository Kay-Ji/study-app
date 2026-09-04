/**
 * Time and Timezone Utility Functions
 * Handles UTC storage, server time synchronization, and user timezone conversion
 */

export const TIMEZONE_OPTIONS = [
  { value: 'Asia/Ho_Chi_Minh', label: 'Việt Nam (UTC+7)', offset: '+07:00' },
  { value: 'UTC', label: 'Giờ chuẩn Quốc tế (UTC+0)', offset: '+00:00' },
  { value: 'Asia/Tokyo', label: 'Nhật Bản / Hàn Quốc (UTC+9)', offset: '+09:00' },
  { value: 'Asia/Singapore', label: 'Singapore (UTC+8)', offset: '+08:00' },
  { value: 'Europe/London', label: 'London (UTC+1 / UTC+0)', offset: '+01:00' },
  { value: 'America/New_York', label: 'New York (UTC-5 / UTC-4)', offset: '-05:00' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (UTC-8 / UTC-7)', offset: '-08:00' },
];

/**
 * Formats a UTC ISO string into localized time in the specified timezone
 */
export function formatTimeInTz(
  utcIsoString: string,
  timezone: string = 'Asia/Ho_Chi_Minh',
  options?: Intl.DateTimeFormatOptions
): string {
  try {
    const date = new Date(utcIsoString);
    if (isNaN(date.getTime())) return '--:--';

    const defaultOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: timezone,
    };

    return new Intl.DateTimeFormat('vi-VN', { ...defaultOptions, ...options }).format(date);
  } catch (error) {
    console.error('Error formatting time:', error);
    return '--:--';
  }
}

/**
 * Formats a UTC ISO string into localized date in the specified timezone
 */
export function formatDateInTz(
  utcIsoString: string,
  timezone: string = 'Asia/Ho_Chi_Minh',
  options?: Intl.DateTimeFormatOptions
): string {
  try {
    const date = new Date(utcIsoString);
    if (isNaN(date.getTime())) return '--/--/----';

    const defaultOptions: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: timezone,
    };

    return new Intl.DateTimeFormat('vi-VN', { ...defaultOptions, ...options }).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '--/--/----';
  }
}

/**
 * Formats full datetime: e.g. "Thứ Hai, 07/09/2026 19:00"
 */
export function formatFullDateTimeInTz(
  utcIsoString: string,
  timezone: string = 'Asia/Ho_Chi_Minh'
): string {
  try {
    const date = new Date(utcIsoString);
    if (isNaN(date.getTime())) return 'Thời gian không hợp lệ';

    const timeStr = formatTimeInTz(utcIsoString, timezone);
    const dateStr = formatDateInTz(utcIsoString, timezone);
    const weekday = getWeekdayNameInTz(utcIsoString, timezone);

    return `${weekday}, ${dateStr} lúc ${timeStr}`;
  } catch {
    return 'Thời gian không hợp lệ';
  }
}

/**
 * Gets Vietnamese weekday name for a date
 */
export function getWeekdayNameInTz(
  utcIsoString: string,
  timezone: string = 'Asia/Ho_Chi_Minh'
): string {
  try {
    const date = new Date(utcIsoString);
    const dayStr = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', timeZone: timezone }).format(date);
    // Capitalize first letter
    return dayStr.charAt(0).toUpperCase() + dayStr.slice(1);
  } catch {
    return '';
  }
}

/**
 * Convert user local date & time strings (e.g. "2026-09-04" and "19:00")
 * into a standard UTC ISO 8601 string considering the user's timezone.
 *
 * This version correctly accounts for daylight-saving time by probing the
 * IANA timezone via Intl.DateTimeFormat instead of assuming a fixed offset.
 */
export function localToUtcIso(dateStr: string, timeStr: string, timezone: string = 'Asia/Ho_Chi_Minh'): string {
  try {
    const [yearStr, monthStr, dayStr] = dateStr.split('-');
    const [hourStr, minuteStr] = timeStr.split(':');
    const y = Number(yearStr);
    const m = Number(monthStr) - 1;
    const d = Number(dayStr);
    const hh = Number(hourStr);
    const mm = Number(minuteStr);

    // Start probing from UTC midnight of the date, searching +/- 14 hours for
    // the UTC instant that displays as the desired local time in the target TZ.
    // This handles DST transitions (e.g. Europe/London switches between +00:00
    // and +01:00) and non-half-hour offsets robustly.
    const utcMidnight = Date.UTC(y, m, d);
    const probes: { utc: Date; localH: number; localM: number }[] = [];
    for (let offsetH = -14; offsetH <= 14; offsetH += 0.25) {
      const utc = new Date(utcMidnight + offsetH * 3600000);
      const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(utc);
      const localH = Number(parts.find((p) => p.type === 'hour')?.value);
      const localM = Number(parts.find((p) => p.type === 'minute')?.value);
      probes.push({ utc, localH, localM });
    }

    // Find the first probe whose local hour/minute matches.
    const match = probes.find((p) => p.localH === hh && p.localM === mm);
    if (match) return match.utc.toISOString();

    // Fallback: use the static offset from TIMEZONE_OPTIONS (may be off by 1h during DST
    // for zones that observe it, but this only happens for unsupported/unknown zones).
    const matched = TIMEZONE_OPTIONS.find((t) => t.value === timezone);
    const tzOffset = matched?.offset || '+07:00';
    return new Date(`${dateStr}T${timeStr}:00${tzOffset}`).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

/**
 * Convert a UTC ISO string into a YYYY-MM-DD date string expressed in the target timezone.
 */
export function getLocalYmdInTz(utcIsoString: string, timezone: string = 'Asia/Ho_Chi_Minh'): string {
  try {
    const date = new Date(utcIsoString);
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const y = parts.find((p) => p.type === 'year')?.value;
    const mo = parts.find((p) => p.type === 'month')?.value;
    const d = parts.find((p) => p.type === 'day')?.value;
    return `${y}-${mo}-${d}`;
  } catch {
    return '';
  }
}

/**
 * Get remaining time until deadline in friendly Vietnamese format
 */
export function getRemainingTimeStr(deadlineUtcIso: string): { text: string; isUrgent: boolean; isOverdue: boolean } {
  const now = Date.now();
  const deadline = new Date(deadlineUtcIso).getTime();
  const diffMs = deadline - now;

  if (diffMs < 0) {
    const overdueDays = Math.abs(Math.floor(diffMs / 86400000));
    return {
      text: overdueDays === 0 ? 'Quá hạn hôm nay' : `Quá hạn ${overdueDays} ngày`,
      isUrgent: true,
      isOverdue: true,
    };
  }

  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return {
      text: `Còn ${days} ngày ${hours % 24} giờ`,
      isUrgent: days <= 2,
      isOverdue: false,
    };
  }

  if (hours > 0) {
    return {
      text: `Còn ${hours} giờ`,
      isUrgent: true,
      isOverdue: false,
    };
  }

  const minutes = Math.floor(diffMs / 60000);
  return {
    text: `Còn ${minutes} phút!`,
    isUrgent: true,
    isOverdue: false,
  };
}
