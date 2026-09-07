import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  BellOff,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  Info,
  Maximize2,
  Phone,
  ShieldAlert,
  Smartphone,
  UserRound,
  UsersRound,
  X,
  Zap,
} from "lucide-react";
import "./AlertPopup.css";

const ALERT_TYPES = {
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
};

const ALERT_LEVELS = {
  INFO: "INFO",
  WARNING: "WARNING",
  CRITICAL: "CRITICAL",
  SUCCESS: "SUCCESS",
};

const ALERT_CONFIG = {
  [ALERT_TYPES.PHONE]: {
    icon: Smartphone,
    tone: "danger",
    title: "Phone detected",
    defaultMessage:
      "A phone was detected during your study session.",
  },

  [ALERT_TYPES.EYES_CLOSED]: {
    icon: EyeOff,
    tone: "warning",
    title: "Eyes closed",
    defaultMessage:
      "Your eyes appear to be closed. Stay alert and keep your focus.",
  },

  [ALERT_TYPES.DROWSY]: {
    icon: Zap,
    tone: "warning",
    title: "Drowsiness detected",
    defaultMessage:
      "You may be getting sleepy. Consider taking a short break.",
  },

  [ALERT_TYPES.LOOKING_AWAY]: {
    icon: Eye,
    tone: "warning",
    title: "Focus drifting",
    defaultMessage:
      "Your attention appears to be away from the study area.",
  },

  [ALERT_TYPES.FACE_MISSING]: {
    icon: UserRound,
    tone: "warning",
    title: "Face not detected",
    defaultMessage:
      "We cannot currently detect your face. Please return to your study position.",
  },

  [ALERT_TYPES.PERSON_LEFT]: {
    icon: UserRound,
    tone: "warning",
    title: "You left the desk",
    defaultMessage:
      "Your face is no longer visible in the camera frame.",
  },

  [ALERT_TYPES.MULTIPLE_PERSON]: {
    icon: UsersRound,
    tone: "danger",
    title: "Multiple people detected",
    defaultMessage:
      "More than one person appears to be visible in the study area.",
  },

  [ALERT_TYPES.BREAK_OVER]: {
    icon: Clock3,
    tone: "success",
    title: "Break is over",
    defaultMessage:
      "Your break has finished. Ready to continue your Daily Goal?",
  },

  [ALERT_TYPES.SESSION_END]: {
    icon: CheckCircle2,
    tone: "success",
    title: "Session completed",
    defaultMessage:
      "Great work! Your study session has been completed.",
  },

  [ALERT_TYPES.LONG_DISTRACTION]: {
    icon: AlertTriangle,
    tone: "warning",
    title: "Long distraction",
    defaultMessage:
      "You have been distracted for a while. Let's bring your focus back.",
  },
};

const LEVEL_CONFIG = {
  [ALERT_LEVELS.INFO]: {
    icon: Info,
    tone: "info",
  },

  [ALERT_LEVELS.WARNING]: {
    icon: AlertTriangle,
    tone: "warning",
  },

  [ALERT_LEVELS.CRITICAL]: {
    icon: ShieldAlert,
    tone: "danger",
  },

  [ALERT_LEVELS.SUCCESS]: {
    icon: CheckCircle2,
    tone: "success",
  },
};

const normalizeType = (type) => {
  const value = String(type || "").toUpperCase();

  return ALERT_CONFIG[value] ? value : null;
};

const normalizeLevel = (level) => {
  const value = String(level || "").toUpperCase();

  return LEVEL_CONFIG[value] ? value : ALERT_LEVELS.INFO;
};

const clamp = (value, min, max) =>
  Math.min(max, Math.max(min, value));

const normalizeConfidence = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  return number <= 1
    ? Math.round(clamp(number, 0, 1) * 100)
    : Math.round(clamp(number, 0, 100));
};

const formatDuration = (seconds) => {
  const totalSeconds = Number(seconds);

  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return null;
  }

  const safeSeconds = Math.floor(totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  if (minutes <= 0) {
    return `${remainingSeconds}s`;
  }

  return `${minutes}m ${String(remainingSeconds).padStart(2, "0")}s`;
};

const getTimestamp = (alert) => {
  if (!alert) return null;

  const value =
    alert.timestamp ||
    alert.createdAt ||
    alert.time ||
    alert.date;

  if (!value) return null;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

const formatTime = (date) => {
  if (!date) return "";

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const getAlertTone = (type, level) => {
  const levelTone = LEVEL_CONFIG[level]?.tone;

  if (levelTone) {
    return levelTone;
  }

  return ALERT_CONFIG[type]?.tone || "info";
};

const AlertPopup = ({
  alert = null,

  visible = true,
  open = true,

  onDismiss,
  onClose,
  onResolve,
  onAction,
  onViewDetails,

  actionLabel = "Got it",
  detailsLabel = "View Details",
  dismissLabel = "Dismiss",

  autoDismiss = false,
  duration = 0,

  showProgress = true,
  showConfidence = true,
  showTimestamp = true,
  showDuration = true,
  showLevel = true,
  showSoundState = false,

  soundEnabled = true,
  muted = false,

  position = "top-right",
  size = "medium",

  className = "",
}) => {
  const [remaining, setRemaining] = useState(
    Number(duration) > 0 ? Number(duration) : 0
  );

  const [isClosing, setIsClosing] = useState(false);

  const timerRef = useRef(null);
  const closeTimerRef = useRef(null);

  const isVisible = Boolean(visible && open && alert);

  const type = useMemo(
    () => normalizeType(alert?.type),
    [alert?.type]
  );

  const level = useMemo(
    () => normalizeLevel(alert?.level),
    [alert?.level]
  );

  const config = ALERT_CONFIG[type] || {
    icon: AlertCircle,
    tone: "info",
    title: "Study alert",
    defaultMessage: "Please check your current study session.",
  };

  const levelConfig =
    LEVEL_CONFIG[level] || LEVEL_CONFIG[ALERT_LEVELS.INFO];

  const Icon = config.icon;
  const LevelIcon = levelConfig.icon;

  const tone = getAlertTone(type, level);

  const confidence = normalizeConfidence(
    alert?.confidence ?? alert?.score
  );

  const timestamp = getTimestamp(alert);

  const alertTitle =
    alert?.title ||
    alert?.name ||
    config.title;

  const alertMessage =
    alert?.message ||
    alert?.description ||
    config.defaultMessage;

  const alertDuration =
    formatDuration(
      alert?.duration ??
        alert?.durationSeconds ??
        alert?.distractionDuration
    );

  const displayDuration =
    Number(duration) > 0 ? Number(duration) : 0;

  const progress =
    displayDuration > 0
      ? clamp((remaining / displayDuration) * 100, 0, 100)
      : 0;

  useEffect(() => {
    if (!isVisible) {
      setRemaining(displayDuration);
      setIsClosing(false);

      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }

      return undefined;
    }

    setRemaining(displayDuration);
    setIsClosing(false);

    if (!autoDismiss || displayDuration <= 0) {
      return undefined;
    }

    timerRef.current = window.setInterval(() => {
      setRemaining((current) => {
        const next = Math.max(0, current - 100);

        if (next <= 0) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }

        return next;
      });
    }, 100);

    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isVisible, autoDismiss, displayDuration]);

  useEffect(() => {
    if (
      !isVisible ||
      !autoDismiss ||
      displayDuration <= 0 ||
      remaining > 0
    ) {
      return undefined;
    }

    setIsClosing(true);

    closeTimerRef.current = window.setTimeout(() => {
      if (onDismiss) {
        onDismiss(alert);
      } else if (onClose) {
        onClose(alert);
      }
    }, 280);

    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [
    remaining,
    isVisible,
    autoDismiss,
    displayDuration,
    alert,
    onDismiss,
    onClose,
  ]);

  const handleDismiss = () => {
    setIsClosing(true);

    window.setTimeout(() => {
      if (onDismiss) {
        onDismiss(alert);
      } else if (onClose) {
        onClose(alert);
      }
    }, 180);
  };

  const handleResolve = () => {
    if (onResolve) {
      onResolve(alert);
      return;
    }

    handleDismiss();
  };

  const handleAction = () => {
    if (onAction) {
      onAction(alert);
      return;
    }

    handleResolve();
  };

  const handleDetails = () => {
    if (onViewDetails) {
      onViewDetails(alert);
    }
  };

  if (!isVisible) {
    return null;
  }

  const rootClasses = [
    "alert-popup",
    `alert-popup--${tone}`,
    `alert-popup--${position}`,
    `alert-popup--${size}`,
    isClosing ? "alert-popup--closing" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <aside
      className={rootClasses}
      role={
        level === ALERT_LEVELS.CRITICAL ||
        level === ALERT_LEVELS.WARNING
          ? "alert"
          : "status"
      }
      aria-live={
        level === ALERT_LEVELS.CRITICAL
          ? "assertive"
          : "polite"
      }
      aria-label={alertTitle}
    >
      <div className="alert-popup__glow" />

      <div className="alert-popup__scan" />

      <div className="alert-popup__inner">
        <div className="alert-popup__icon-wrap">
          <div className="alert-popup__icon">
            <Icon size={23} strokeWidth={2.2} />
          </div>

          <span className="alert-popup__icon-pulse" />
        </div>

        <div className="alert-popup__content">
          <div className="alert-popup__topline">
            {showLevel && (
              <span className="alert-popup__level">
                <LevelIcon size={12} />
                <span>{level}</span>
              </span>
            )}

            {showTimestamp && timestamp && (
              <span className="alert-popup__time">
                <Clock3 size={11} />
                <span>{formatTime(timestamp)}</span>
              </span>
            )}
          </div>

          <h3>{alertTitle}</h3>

          <p>{alertMessage}</p>

          <div className="alert-popup__meta">
            {showConfidence && confidence !== null && (
              <span className="alert-popup__meta-item">
                <Zap size={12} />
                <span>{confidence}% confidence</span>
              </span>
            )}

            {showDuration && alertDuration && (
              <span className="alert-popup__meta-item">
                <Clock3 size={12} />
                <span>{alertDuration}</span>
              </span>
            )}

            {showSoundState && (
              <span className="alert-popup__meta-item">
                {soundEnabled && !muted ? (
                  <>
                    <Bell size={12} />
                    <span>Sound on</span>
                  </>
                ) : (
                  <>
                    <BellOff size={12} />
                    <span>Muted</span>
                  </>
                )}
              </span>
            )}
          </div>

          <div className="alert-popup__actions">
            <button
              type="button"
              className="alert-popup__primary"
              onClick={handleAction}
            >
              <CheckCircle2 size={15} />
              <span>{actionLabel}</span>
            </button>

            {onViewDetails && (
              <button
                type="button"
                className="alert-popup__details"
                onClick={handleDetails}
              >
                <Maximize2 size={14} />
                <span>{detailsLabel}</span>
              </button>
            )}
          </div>
        </div>

        <button
          type="button"
          className="alert-popup__close"
          onClick={handleDismiss}
          aria-label={dismissLabel}
          title={dismissLabel}
        >
          <X size={17} />
        </button>
      </div>

      {showProgress && autoDismiss && displayDuration > 0 && (
        <div className="alert-popup__progress">
          <span
            style={{
              width: `${progress}%`,
            }}
          />
        </div>
      )}

      <div className="alert-popup__corner alert-popup__corner--tl" />
      <div className="alert-popup__corner alert-popup__corner--br" />
    </aside>
  );
};

export {
  ALERT_TYPES,
  ALERT_LEVELS,
  ALERT_CONFIG,
  LEVEL_CONFIG,
};

export default AlertPopup;