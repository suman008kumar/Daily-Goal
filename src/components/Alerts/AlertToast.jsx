import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  Info,
  Smartphone,
  UserRound,
  UsersRound,
  X,
  Zap,
} from "lucide-react";
import "./AlertToast.css";

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

const TYPE_CONFIG = {
  [ALERT_TYPES.PHONE]: {
    icon: Smartphone,
    tone: "danger",
    title: "Phone detected",
    message: "A phone was detected during your study session.",
  },

  [ALERT_TYPES.EYES_CLOSED]: {
    icon: EyeOff,
    tone: "warning",
    title: "Eyes closed",
    message: "Your eyes appear to be closed.",
  },

  [ALERT_TYPES.DROWSY]: {
    icon: Zap,
    tone: "warning",
    title: "Drowsiness detected",
    message: "You may be getting sleepy. Consider taking a short break.",
  },

  [ALERT_TYPES.LOOKING_AWAY]: {
    icon: Eye,
    tone: "warning",
    title: "Focus drifting",
    message: "Your attention appears to be away from the study area.",
  },

  [ALERT_TYPES.FACE_MISSING]: {
    icon: UserRound,
    tone: "warning",
    title: "Face not detected",
    message: "Your face is not currently visible to the camera.",
  },

  [ALERT_TYPES.PERSON_LEFT]: {
    icon: UserRound,
    tone: "warning",
    title: "Desk left",
    message: "You appear to have left the study area.",
  },

  [ALERT_TYPES.MULTIPLE_PERSON]: {
    icon: UsersRound,
    tone: "danger",
    title: "Multiple people detected",
    message: "More than one person appears to be visible.",
  },

  [ALERT_TYPES.BREAK_OVER]: {
    icon: Clock3,
    tone: "success",
    title: "Break is over",
    message: "Your break has finished. Ready to continue?",
  },

  [ALERT_TYPES.SESSION_END]: {
    icon: CheckCircle2,
    tone: "success",
    title: "Session completed",
    message: "Great work! Your study session is complete.",
  },

  [ALERT_TYPES.LONG_DISTRACTION]: {
    icon: AlertTriangle,
    tone: "warning",
    title: "Long distraction",
    message: "Let's bring your focus back to the study session.",
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
    icon: AlertCircle,
    tone: "danger",
  },

  [ALERT_LEVELS.SUCCESS]: {
    icon: CheckCircle2,
    tone: "success",
  },
};

const DEFAULT_DURATION = 5000;

const normalizeType = (type) => {
  const normalized = String(type || "").toUpperCase();

  return TYPE_CONFIG[normalized] ? normalized : null;
};

const normalizeLevel = (level) => {
  const normalized = String(level || "").toUpperCase();

  return LEVEL_CONFIG[normalized]
    ? normalized
    : ALERT_LEVELS.INFO;
};

const getTone = (type, level) => {
  return (
    LEVEL_CONFIG[level]?.tone ||
    TYPE_CONFIG[type]?.tone ||
    "info"
  );
};

const normalizeConfidence = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  return number <= 1
    ? Math.round(Math.max(0, Math.min(1, number)) * 100)
    : Math.round(Math.max(0, Math.min(100, number)));
};

const getTimestamp = (alert) => {
  const value =
    alert?.timestamp ||
    alert?.createdAt ||
    alert?.time ||
    alert?.date;

  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

const formatTime = (date) => {
  if (!date) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const AlertToast = ({
  alert = null,

  visible = true,

  duration = DEFAULT_DURATION,
  autoDismiss = true,

  onDismiss,
  onClick,

  showClose = true,
  showProgress = true,
  showConfidence = false,
  showTimestamp = false,

  position = "top-right",

  index = 0,

  pauseOnHover = true,

  className = "",
}) => {
  const [remaining, setRemaining] = useState(
    Math.max(0, Number(duration) || 0)
  );

  const [paused, setPaused] = useState(false);
  const [closing, setClosing] = useState(false);

  const intervalRef = useRef(null);
  const closeRef = useRef(null);

  const type = useMemo(
    () => normalizeType(alert?.type),
    [alert?.type]
  );

  const level = useMemo(
    () => normalizeLevel(alert?.level),
    [alert?.level]
  );

  const config =
    TYPE_CONFIG[type] || {
      icon: AlertCircle,
      tone: "info",
      title: "Study alert",
      message: "Please check your current study session.",
    };

  const levelConfig =
    LEVEL_CONFIG[level] || LEVEL_CONFIG[ALERT_LEVELS.INFO];

  const Icon = config.icon;
  const LevelIcon = levelConfig.icon;

  const tone = getTone(type, level);

  const confidence = normalizeConfidence(
    alert?.confidence ?? alert?.score
  );

  const timestamp = getTimestamp(alert);

  const title =
    alert?.title ||
    alert?.name ||
    config.title;

  const message =
    alert?.message ||
    alert?.description ||
    config.message;

  const totalDuration = Math.max(
    0,
    Number(duration) || 0
  );

  const progress =
    totalDuration > 0
      ? Math.max(
          0,
          Math.min(
            100,
            (remaining / totalDuration) * 100
          )
        )
      : 0;

  const isVisible = Boolean(visible && alert);

  useEffect(() => {
    setRemaining(totalDuration);
    setPaused(false);
    setClosing(false);
  }, [alert?.id, totalDuration]);

  useEffect(() => {
    if (
      !isVisible ||
      !autoDismiss ||
      totalDuration <= 0 ||
      paused
    ) {
      return undefined;
    }

    intervalRef.current = window.setInterval(() => {
      setRemaining((current) => {
        const next = Math.max(0, current - 100);

        if (next <= 0 && intervalRef.current) {
          window.clearInterval(intervalRef.current);
          intervalRef.current = null;
        }

        return next;
      });
    }, 100);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [
    isVisible,
    autoDismiss,
    totalDuration,
    paused,
  ]);

  useEffect(() => {
    if (
      !isVisible ||
      !autoDismiss ||
      totalDuration <= 0 ||
      remaining > 0
    ) {
      return undefined;
    }

    setClosing(true);

    closeRef.current = window.setTimeout(() => {
      onDismiss?.(alert);
    }, 260);

    return () => {
      if (closeRef.current) {
        window.clearTimeout(closeRef.current);
        closeRef.current = null;
      }
    };
  }, [
    remaining,
    isVisible,
    autoDismiss,
    totalDuration,
    alert,
    onDismiss,
  ]);

  const handleDismiss = (event) => {
    event?.stopPropagation();

    setClosing(true);

    window.setTimeout(() => {
      onDismiss?.(alert);
    }, 180);
  };

  const handleClick = () => {
    onClick?.(alert);
  };

  const handleMouseEnter = () => {
    if (pauseOnHover) {
      setPaused(true);
    }
  };

  const handleMouseLeave = () => {
    if (pauseOnHover) {
      setPaused(false);
    }
  };

  if (!isVisible) {
    return null;
  }

  const classes = [
    "alert-toast",
    `alert-toast--${tone}`,
    `alert-toast--${position}`,
    closing ? "alert-toast--closing" : "",
    paused ? "alert-toast--paused" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classes}
      style={{
        "--toast-index": index,
      }}
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
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <div className="alert-toast__background-glow" />

      <div className="alert-toast__content">
        <div className="alert-toast__icon-wrap">
          <div className="alert-toast__icon">
            <Icon size={19} strokeWidth={2.2} />
          </div>

          <span className="alert-toast__pulse" />
        </div>

        <div className="alert-toast__body">
          <div className="alert-toast__heading">
            <span className="alert-toast__title">
              {title}
            </span>

            {showTimestamp && timestamp && (
              <span className="alert-toast__timestamp">
                {formatTime(timestamp)}
              </span>
            )}
          </div>

          <p>{message}</p>

          {(showConfidence || level !== ALERT_LEVELS.INFO) && (
            <div className="alert-toast__meta">
              {level !== ALERT_LEVELS.INFO && (
                <span className="alert-toast__level">
                  <LevelIcon size={11} />
                  {level}
                </span>
              )}

              {showConfidence &&
                confidence !== null && (
                  <span className="alert-toast__confidence">
                    <Zap size={11} />
                    {confidence}%
                  </span>
                )}
            </div>
          )}
        </div>

        {showClose && (
          <button
            type="button"
            className="alert-toast__close"
            onClick={handleDismiss}
            aria-label="Dismiss alert"
            title="Dismiss"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {showProgress &&
        autoDismiss &&
        totalDuration > 0 && (
          <div
            className="alert-toast__progress"
            aria-hidden="true"
          >
            <span
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
        )}

      <div className="alert-toast__edge" />
    </div>
  );
};

export {
  ALERT_TYPES,
  ALERT_LEVELS,
  TYPE_CONFIG,
  LEVEL_CONFIG,
};

export default AlertToast;