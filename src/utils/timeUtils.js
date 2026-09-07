import { APP_CONFIG, DAY_NAMES, MONTH_NAMES } from "./constants";

const {
  secondsPerMinute,
  secondsPerHour,
  millisecondsPerSecond,
  millisecondsPerMinute,
  millisecondsPerHour,
} = APP_CONFIG.time;

/**
 * Safely converts a value into a non-negative number.
 */
export const toSafeNumber = (value, fallback = 0) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.max(0, number);
};

/**
 * Converts seconds into HH:MM:SS.
 */
export const formatTime = (totalSeconds = 0) => {
  const seconds = Math.floor(toSafeNumber(totalSeconds));

  const hours = Math.floor(seconds / secondsPerHour);
  const minutes = Math.floor(
    (seconds % secondsPerHour) / secondsPerMinute
  );
  const remainingSeconds = seconds % secondsPerMinute;

  return [
    hours,
    minutes,
    remainingSeconds,
  ]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
};

/**
 * Converts seconds into a short human-readable format.
 *
 * Example:
 * 3661 -> "1h 1m"
 */
export const formatDuration = (totalSeconds = 0) => {
  const seconds = Math.floor(toSafeNumber(totalSeconds));

  if (seconds < secondsPerMinute) {
    return `${seconds}s`;
  }

  const hours = Math.floor(seconds / secondsPerHour);
  const minutes = Math.floor(
    (seconds % secondsPerHour) / secondsPerMinute
  );

  if (hours > 0) {
    return minutes > 0
      ? `${hours}h ${minutes}m`
      : `${hours}h`;
  }

  return `${minutes}m`;
};

/**
 * More detailed duration.
 *
 * Example:
 * 3661 -> "1h 1m 1s"
 */
export const formatDetailedDuration = (totalSeconds = 0) => {
  const seconds = Math.floor(toSafeNumber(totalSeconds));

  const hours = Math.floor(seconds / secondsPerHour);
  const minutes = Math.floor(
    (seconds % secondsPerHour) / secondsPerMinute
  );
  const remainingSeconds = seconds % secondsPerMinute;

  const parts = [];

  if (hours > 0) {
    parts.push(`${hours}h`);
  }

  if (minutes > 0 || hours > 0) {
    parts.push(`${minutes}m`);
  }

  if (remainingSeconds > 0 || parts.length === 0) {
    parts.push(`${remainingSeconds}s`);
  }

  return parts.join(" ");
};

/**
 * Converts milliseconds to seconds.
 */
export const millisecondsToSeconds = (milliseconds = 0) => {
  return Math.floor(
    toSafeNumber(milliseconds) / millisecondsPerSecond
  );
};

/**
 * Converts seconds to milliseconds.
 */
export const secondsToMilliseconds = (seconds = 0) => {
  return toSafeNumber(seconds) * millisecondsPerSecond;
};

/**
 * Converts minutes to seconds.
 */
export const minutesToSeconds = (minutes = 0) => {
  return toSafeNumber(minutes) * secondsPerMinute;
};

/**
 * Converts hours to seconds.
 */
export const hoursToSeconds = (hours = 0) => {
  return toSafeNumber(hours) * secondsPerHour;
};

/**
 * Converts seconds to minutes.
 */
export const secondsToMinutes = (seconds = 0) => {
  return toSafeNumber(seconds) / secondsPerMinute;
};

/**
 * Converts seconds to hours.
 */
export const secondsToHours = (seconds = 0) => {
  return toSafeNumber(seconds) / secondsPerHour;
};

/**
 * Converts a date into a local date key.
 *
 * Example:
 * "2026-09-03"
 */
export const getDateKey = (date = new Date()) => {
  const currentDate = date instanceof Date
    ? date
    : new Date(date);

  if (Number.isNaN(currentDate.getTime())) {
    return "";
  }

  const year = currentDate.getFullYear();
  const month = String(currentDate.getMonth() + 1).padStart(2, "0");
  const day = String(currentDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

/**
 * Checks whether two dates belong to the same local day.
 */
export const isSameDay = (firstDate, secondDate) => {
  return getDateKey(firstDate) === getDateKey(secondDate);
};

/**
 * Returns today's start.
 */
export const startOfDay = (date = new Date()) => {
  const result = new Date(date);

  result.setHours(0, 0, 0, 0);

  return result;
};

/**
 * Returns today's end.
 */
export const endOfDay = (date = new Date()) => {
  const result = new Date(date);

  result.setHours(23, 59, 59, 999);

  return result;
};

/**
 * Returns the start of the current week.
 * Week starts on Monday.
 */
export const startOfWeek = (date = new Date()) => {
  const result = startOfDay(date);
  const day = result.getDay();

  const mondayOffset = day === 0 ? -6 : 1 - day;

  result.setDate(result.getDate() + mondayOffset);

  return result;
};

/**
 * Returns the start of the current month.
 */
export const startOfMonth = (date = new Date()) => {
  const result = new Date(date);

  result.setDate(1);
  result.setHours(0, 0, 0, 0);

  return result;
};

/**
 * Returns readable date.
 *
 * Example:
 * "03 September 2026"
 */
export const formatDate = (
  date = new Date(),
  options = {}
) => {
  const currentDate = date instanceof Date
    ? date
    : new Date(date);

  if (Number.isNaN(currentDate.getTime())) {
    return "";
  }

  const defaultOptions = {
    day: "2-digit",
    month: "long",
    year: "numeric",
  };

  return new Intl.DateTimeFormat(
    options.locale || undefined,
    {
      ...defaultOptions,
      ...options,
    }
  ).format(currentDate);
};

/**
 * Example:
 * "Thu, 03 Sep"
 */
export const formatCompactDate = (
  date = new Date(),
  locale
) => {
  const currentDate = date instanceof Date
    ? date
    : new Date(date);

  if (Number.isNaN(currentDate.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(currentDate);
};

/**
 * Example:
 * "12:45 PM"
 */
export const formatClockTime = (
  date = new Date(),
  locale
) => {
  const currentDate = date instanceof Date
    ? date
    : new Date(date);

  if (Number.isNaN(currentDate.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(currentDate);
};

/**
 * Example:
 * "Thursday"
 */
export const getDayName = (date = new Date()) => {
  const currentDate = date instanceof Date
    ? date
    : new Date(date);

  if (Number.isNaN(currentDate.getTime())) {
    return "";
  }

  return DAY_NAMES[currentDate.getDay()] || "";
};

/**
 * Example:
 * "September"
 */
export const getMonthName = (date = new Date()) => {
  const currentDate = date instanceof Date
    ? date
    : new Date(date);

  if (Number.isNaN(currentDate.getTime())) {
    return "";
  }

  return MONTH_NAMES[currentDate.getMonth()] || "";
};

/**
 * Returns relative time.
 *
 * Example:
 * "just now", "2 minutes ago", "3 hours ago"
 */
export const getRelativeTime = (
  date,
  now = new Date()
) => {
  const target = date instanceof Date ? date : new Date(date);
  const current = now instanceof Date ? now : new Date(now);

  if (
    Number.isNaN(target.getTime()) ||
    Number.isNaN(current.getTime())
  ) {
    return "";
  }

  const difference = Math.max(
    0,
    current.getTime() - target.getTime()
  );

  const seconds = Math.floor(
    difference / millisecondsPerSecond
  );

  if (seconds < secondsPerMinute) {
    return "just now";
  }

  const minutes = Math.floor(
    difference / millisecondsPerMinute
  );

  if (minutes < 60) {
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  }

  const hours = Math.floor(
    difference / millisecondsPerHour
  );

  if (hours < 24) {
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days} ${days === 1 ? "day" : "days"} ago`;
  }

  return formatCompactDate(target);
};

/**
 * Returns remaining seconds between now and a future date.
 */
export const getRemainingSeconds = (
  targetDate,
  now = Date.now()
) => {
  const target = targetDate instanceof Date
    ? targetDate.getTime()
    : new Date(targetDate).getTime();

  if (!Number.isFinite(target)) {
    return 0;
  }

  return Math.max(
    0,
    Math.ceil((target - now) / millisecondsPerSecond)
  );
};

/**
 * Checks whether a timestamp is in the past.
 */
export const isPast = (date) => {
  const timestamp = date instanceof Date
    ? date.getTime()
    : new Date(date).getTime();

  return Number.isFinite(timestamp) && timestamp < Date.now();
};

/**
 * Adds seconds to a date.
 */
export const addSeconds = (
  date,
  seconds = 0
) => {
  const result = date instanceof Date
    ? new Date(date)
    : new Date(date);

  if (Number.isNaN(result.getTime())) {
    return null;
  }

  result.setTime(
    result.getTime() + secondsToMilliseconds(seconds)
  );

  return result;
};

/**
 * Returns percentage progress between elapsed and target seconds.
 */
export const getTimeProgress = (
  elapsedSeconds = 0,
  targetSeconds = 0
) => {
  const elapsed = toSafeNumber(elapsedSeconds);
  const target = toSafeNumber(targetSeconds);

  if (target <= 0) {
    return 0;
  }

  return Math.min(100, (elapsed / target) * 100);
};

export default {
  toSafeNumber,
  formatTime,
  formatDuration,
  formatDetailedDuration,
  millisecondsToSeconds,
  secondsToMilliseconds,
  minutesToSeconds,
  hoursToSeconds,
  secondsToMinutes,
  secondsToHours,
  getDateKey,
  isSameDay,
  startOfDay,
  endOfDay,
  startOfWeek,
  startOfMonth,
  formatDate,
  formatCompactDate,
  formatClockTime,
  getDayName,
  getMonthName,
  getRelativeTime,
  getRemainingSeconds,
  isPast,
  addSeconds,
  getTimeProgress,
};