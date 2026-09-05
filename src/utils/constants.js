/**
 * DAILY GOAL
 * Application-wide constants and configuration.
 *
 * Keep reusable product rules here instead of scattering
 * values across components and hooks.
 */

export const APP_CONFIG = Object.freeze({
  name: "DAILY GOAL",
  tagline: "Study Smarter. Stay Focused. Grow Every Day.",
  storageVersion: "v1",
  time: Object.freeze({
    millisecondsPerSecond: 1000,
    secondsPerMinute: 60,
    minutesPerHour: 60,
    secondsPerHour: 3600,
    millisecondsPerMinute: 60 * 1000,
    millisecondsPerHour: 60 * 60 * 1000,
  }),
});

export const ROUTES = Object.freeze({
  dashboard: "/",
  liveMonitoring: "/live-monitoring",
  analytics: "/analytics",
  sessions: "/sessions",
  alerts: "/alerts",
  smartReport: "/smart-report",
  liveUsers: "/live-users",
  settings: "/settings",
});

export const AI_MODES = Object.freeze({
  LIVE: "LIVE",
  DEMO: "DEMO",
});

export const SESSION_STATUS = Object.freeze({
  IDLE: "IDLE",
  RUNNING: "RUNNING",
  PAUSED: "PAUSED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
});

export const CAMERA_STATUS = Object.freeze({
  NOT_ASKED: "not_asked",
  REQUESTING: "requesting",
  GRANTED: "granted",
  DENIED: "denied",
  ERROR: "error",
  UNAVAILABLE: "unavailable",
});

export const ALERT_TYPES = Object.freeze({
  PHONE: "PHONE",
  EYES_CLOSED: "EYES_CLOSED",
  DROWSY: "DROWSY",
  LOOKING_AWAY: "LOOKING_AWAY",
  FACE_MISSING: "FACE_MISSING",
  PERSON_LEFT: "PERSON_LEFT",
  MULTIPLE_PERSON: "MULTIPLE_PERSON",
  BREAK_OVER: "BREAK_OVER",
  SESSION_END: "SESSION_END",
  LONG_DISTRACTION: "LONG_DISTRACTION",
});

export const ALERT_LEVELS = Object.freeze({
  INFO: "INFO",
  WARNING: "WARNING",
  CRITICAL: "CRITICAL",
});

export const FOCUS_LEVELS = Object.freeze({
  EXCELLENT: "Excellent",
  GOOD: "Good",
  NEEDS_ATTENTION: "Needs Attention",
  LOW: "Low Focus",
});

export const FOCUS_THRESHOLDS = Object.freeze({
  excellent: 90,
  good: 75,
  needsAttention: 60,
  minimum: 0,
  maximum: 100,
});

/**
 * Focus-score weights.
 *
 * Total = 100%
 */
export const FOCUS_WEIGHTS = Object.freeze({
  face: 0.15,
  eyes: 0.15,
  attention: 0.25,
  phone: 0.20,
  posture: 0.10,
  drowsiness: 0.10,
  desk: 0.05,
});

export const MONITORING_STATUS = Object.freeze({
  ACTIVE: "ACTIVE",
  PAUSED: "PAUSED",
  INACTIVE: "INACTIVE",
});

export const AI_STATUS = Object.freeze({
  FOCUSED: "focused",
  DISTRACTED: "distracted",
  WARNING: "warning",
  NORMAL: "normal",
  GOOD: "good",
  DROWSY: "drowsy",
  MISSING: "missing",
  DETECTED: "detected",
  NOT_DETECTED: "not_detected",
  UNKNOWN: "unknown",
});

export const DETECTOR_TYPES = Object.freeze({
  FACE: "FACE",
  EYES: "EYES",
  PHONE: "PHONE",
  POSTURE: "POSTURE",
  ATTENTION: "ATTENTION",
  DROWSINESS: "DROWSINESS",
});

export const ALERT_COOLDOWN = Object.freeze({
  defaultSeconds: 10,
  criticalSeconds: 20,
  repeatedDetectionSeconds: 15,
});

export const MONITORING_THRESHOLDS = Object.freeze({
  lookingAwaySeconds: 4,
  drowsinessSeconds: 3,
  faceMissingSeconds: 5,
  longDistractionSeconds: 30,
  multiplePersonSeconds: 3,
});

export const MONITORING_INTERVALS = Object.freeze({
  aiAnalysisMilliseconds: 500,
  demoAnalysisMilliseconds: 1200,
  cameraThrottleMilliseconds: 500,
});

export const SESSION_DEFAULTS = Object.freeze({
  dailyGoalSeconds: 2 * 60 * 60,
  defaultSessionSeconds: 60 * 60,
  breakSeconds: 5 * 60,
  numberOfBreaks: 2,
});

export const GOAL_OPTIONS = Object.freeze([
  {
    id: "30m",
    label: "30 min",
    seconds: 30 * 60,
  },
  {
    id: "45m",
    label: "45 min",
    seconds: 45 * 60,
  },
  {
    id: "60m",
    label: "60 min",
    seconds: 60 * 60,
  },
  {
    id: "90m",
    label: "90 min",
    seconds: 90 * 60,
  },
  {
    id: "120m",
    label: "2 hours",
    seconds: 2 * 60 * 60,
  },
]);

export const ALERT_INTENSITIES = Object.freeze({
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
});

export const THEMES = Object.freeze({
  LIGHT: "light",
  DARK: "dark",
  SYSTEM: "system",
});

export const STORAGE_KEYS = Object.freeze({
  settings: "daily_goal_settings_v1",
  sessions: "daily_goal_sessions_v1",
  alerts: "daily_goal_alerts_v1",
  preferences: "daily_goal_preferences_v1",
  statistics: "daily_goal_statistics_v1",
  monitoring: "daily_goal_monitoring_v1",
  activeSession: "daily_goal_active_session",
  cameraPreferences: "daily_goal_camera_preferences",
});

export const NOTIFICATION_TYPES = Object.freeze({
  PHONE: "phone",
  DROWSINESS: "drowsiness",
  SESSION_COMPLETE: "session-complete",
  BREAK: "break",
  FOCUS: "focus",
});

export const SOUND_TYPES = Object.freeze({
  WARNING: "warning",
  SLEEPY: "sleepy",
  PHONE: "phone",
  DISTRACTION: "distraction",
  BREAK: "break",
  SESSION_COMPLETE: "sessionComplete",
});

export const DAY_NAMES = Object.freeze([
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
]);

export const MONTH_NAMES = Object.freeze([
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]);

export const ACTIVITY_TYPES = Object.freeze({
  FOCUSED: "focused",
  DISTRACTION: "distraction",
  BREAK: "break",
  PHONE: "phone",
  AWAY: "away",
  DROWSY: "drowsy",
});

export const DEFAULT_CONFIDENCE = 0;

export const SCORE_SMOOTHING = Object.freeze({
  defaultFactor: 0.25,
  minimumFactor: 0,
  maximumFactor: 1,
});