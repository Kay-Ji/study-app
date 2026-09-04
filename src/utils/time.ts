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
    const weekdayIndex = Number(
      new Intl.DateTimeFormat('en-US', { weekday: 'narrow', timeZone: timezone }).format(date)
    );
    // Use Intl format directly
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
 */
export function localToUtcIso(dateStr: string, timeStr: string, timezone: string = 'Asia/Ho_Chi_Minh'): string {
  try {
    // For Asia/Ho_Chi_Minh (UTC+7), offset is +7 hours
    // We construct ISO string with timezone offset
    let tzOffset = '+07:00';
    const matched = TIMEZONE_OPTIONS.find((t) => t.value === timezone);
    if (matched) tzOffset = matched.offset;

    // e.g. "2026-09-04T19:00:00+07:00"
    const parsed = new Date(`${dateStr}T${timeStr}:00${tzOffset}`);
    return parsed.toISOString();
  } catch {
    return new Date().toISOString();
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
