import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Timer,
  Sparkles,
  Clock3,
  Zap,
  CircleStop,
} from "lucide-react";
import "./SessionTimer.css";

const STATUS_CONFIG = {
  IDLE: {
    label: "Ready",
    tone: "idle",
    icon: Timer,
  },
  RUNNING: {
    label: "Session Running",
    tone: "running",
    icon: Zap,
  },
  PAUSED: {
    label: "Session Paused",
    tone: "paused",
    icon: Pause,
  },
  COMPLETED: {
    label: "Session Completed",
    tone: "completed",
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: "Session Cancelled",
    tone: "cancelled",
    icon: CircleStop,
  },
};

const clamp = (value, min, max) =>
  Math.min(Math.max(Number(value) || 0, min), max);

const formatTime = (seconds) => {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));

  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  if (hours > 0) {
    return [
      String(hours).padStart(2, "0"),
      String(minutes).padStart(2, "0"),
      String(remainingSeconds).padStart(2, "0"),
    ];
  }

  return [
    "00",
    String(minutes).padStart(2, "0"),
    String(remainingSeconds).padStart(2, "0"),
  ];
};

const formatDurationLabel = (seconds) => {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));

  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m`;
  }

  return `${safeSeconds}s`;
};

const getProgress = (remaining, total) => {
  if (!total || total <= 0) return 0;

  return clamp(((total - remaining) / total) * 100, 0, 100);
};

const AnimatedDigit = ({ value }) => (
  <span className="session-timer__digit" key={value}>
    {value}
  </span>
);

const TimeDisplay = ({ seconds }) => {
  const [hours, minutes, remainingSeconds] = formatTime(seconds);

  return (
    <div className="session-timer__time" aria-label={`${hours} hours ${minutes} minutes ${remainingSeconds} seconds`}>
      <div className="session-timer__time-group">
        <AnimatedDigit value={hours} />
        <span className="session-timer__time-label">HR</span>
      </div>

      <span className="session-timer__separator">:</span>

      <div className="session-timer__time-group">
        <AnimatedDigit value={minutes} />
        <span className="session-timer__time-label">MIN</span>
      </div>

      <span className="session-timer__separator">:</span>

      <div className="session-timer__time-group">
        <AnimatedDigit value={remainingSeconds} />
        <span className="session-timer__time-label">SEC</span>
      </div>
    </div>
  );
};

const TimerRing = ({
  progress,
  size = 290,
  strokeWidth = 12,
  status = "IDLE",
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (progress / 100) * circumference;

  return (
    <div
      className={`session-timer__ring session-timer__ring--${status.toLowerCase()}`}
      style={{
        "--timer-size": `${size}px`,
        "--timer-radius": `${radius}px`,
      }}
    >
      <div className="session-timer__ring-glow" />

      <svg
        className="session-timer__ring-svg"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
      >
        <circle
          className="session-timer__ring-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
        />

        <circle
          className="session-timer__ring-progress"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>

      <div className="session-timer__ring-orbit session-timer__ring-orbit--one" />
      <div className="session-timer__ring-orbit session-timer__ring-orbit--two" />

      <div className="session-timer__ring-center">
        <div className="session-timer__center-icon">
          <Timer size={21} strokeWidth={2.2} />
        </div>
      </div>
    </div>
  );
};

const ActionButton = ({
  children,
  icon: Icon,
  variant = "secondary",
  onClick,
  disabled = false,
  title,
}) => (
  <button
    type="button"
    className={`session-timer__action session-timer__action--${variant}`}
    onClick={onClick}
    disabled={disabled}
    title={title}
  >
    {Icon && <Icon size={17} strokeWidth={2.2} />}
    <span>{children}</span>
  </button>
);

const SessionTimer = ({
  status = "IDLE",
  remainingSeconds = 0,
  elapsedSeconds = 0,
  totalSeconds = 0,
  progress,
  onStart,
  onPause,
  onResume,
  onCancel,
  onComplete,
  onReset,
  title = "Study Session",
  subtitle = "Stay focused and make progress toward your Daily Goal.",
  showControls = true,
  showProgress = true,
  compact = false,
  className = "",
}) => {
  const [displayProgress, setDisplayProgress] = useState(0);
  const previousProgressRef = useRef(0);

  const safeStatus = String(status || "IDLE").toUpperCase();
  const statusConfig = STATUS_CONFIG[safeStatus] || STATUS_CONFIG.IDLE;
  const StatusIcon = statusConfig.icon;

  const calculatedProgress = useMemo(() => {
    if (typeof progress === "number") {
      return clamp(progress, 0, 100);
    }

    return getProgress(remainingSeconds, totalSeconds);
  }, [progress, remainingSeconds, totalSeconds]);

  useEffect(() => {
    let animationFrame;
    const start = performance.now();
    const from = previousProgressRef.current;
    const to = calculatedProgress;

    const animate = (now) => {
      const elapsed = now - start;
      const duration = 650;
      const ratio = Math.min(elapsed / duration, 1);

      const eased =
        1 - Math.pow(1 - ratio, 3);

      const nextValue = from + (to - from) * eased;

      setDisplayProgress(nextValue);

      if (ratio < 1) {
        animationFrame = requestAnimationFrame(animate);
      } else {
        previousProgressRef.current = to;
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [calculatedProgress]);

  const remaining = Math.max(0, Number(remainingSeconds) || 0);
  const elapsed = Math.max(0, Number(elapsedSeconds) || 0);
  const total = Math.max(0, Number(totalSeconds) || 0);

  const isRunning = safeStatus === "RUNNING";
  const isPaused = safeStatus === "PAUSED";
  const isCompleted = safeStatus === "COMPLETED";
  const isIdle = safeStatus === "IDLE";

  const progressLabel = `${Math.round(displayProgress)}%`;

  const containerClasses = [
    "session-timer",
    `session-timer--${statusConfig.tone}`,
    compact ? "session-timer--compact" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={containerClasses}>
      <div className="session-timer__ambient session-timer__ambient--one" />
      <div className="session-timer__ambient session-timer__ambient--two" />

      <div className="session-timer__header">
        <div className="session-timer__heading">
          <div className="session-timer__title-icon">
            <Timer size={20} strokeWidth={2.2} />
          </div>

          <div>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
        </div>

        <div className={`session-timer__status session-timer__status--${statusConfig.tone}`}>
          <span className="session-timer__status-dot" />
          <StatusIcon size={15} />
          <span>{statusConfig.label}</span>
        </div>
      </div>

      <div className="session-timer__body">
        <div className="session-timer__visual">
          <TimerRing
            progress={displayProgress}
            status={safeStatus}
          />

          <div className="session-timer__display">
            <TimeDisplay seconds={remaining} />

            <div className="session-timer__remaining">
              {isRunning && (
                <>
                  <span className="session-timer__live-dot" />
                  <span>Focus time remaining</span>
                </>
              )}

              {isPaused && <span>Session paused</span>}

              {isIdle && <span>Ready when you are</span>}

              {isCompleted && (
                <span>Great work — session complete!</span>
              )}

              {safeStatus === "CANCELLED" && (
                <span>Session cancelled</span>
              )}
            </div>
          </div>
        </div>

        <div className="session-timer__details">
          <div className="session-timer__progress-header">
            <div>
              <span className="session-timer__eyebrow">
                Session Progress
              </span>
              <strong>{progressLabel}</strong>
            </div>

            <div className="session-timer__sparkle">
              <Sparkles size={16} />
            </div>
          </div>

          {showProgress && (
            <div className="session-timer__progress-track">
              <div
                className="session-timer__progress-fill"
                style={{ width: `${displayProgress}%` }}
              >
                <span className="session-timer__progress-shine" />
              </div>
            </div>
          )}

          <div className="session-timer__stats">
            <div className="session-timer__stat">
              <div className="session-timer__stat-icon">
                <Clock3 size={17} />
              </div>

              <div>
                <span>Elapsed</span>
                <strong>{formatDurationLabel(elapsed)}</strong>
              </div>
            </div>

            <div className="session-timer__stat">
              <div className="session-timer__stat-icon">
                <Timer size={17} />
              </div>

              <div>
                <span>Session Target</span>
                <strong>{formatDurationLabel(total)}</strong>
              </div>
            </div>
          </div>

          {showControls && (
            <div className="session-timer__controls">
              {isIdle && (
                <ActionButton
                  icon={Play}
                  variant="primary"
                  onClick={onStart}
                  disabled={!onStart}
                >
                  Start Session
                </ActionButton>
              )}

              {isRunning && (
                <>
                  <ActionButton
                    icon={Pause}
                    variant="secondary"
                    onClick={onPause}
                    disabled={!onPause}
                  >
                    Pause
                  </ActionButton>

                  <ActionButton
                    icon={CheckCircle2}
                    variant="primary"
                    onClick={onComplete}
                    disabled={!onComplete}
                  >
                    Complete
                  </ActionButton>
                </>
              )}

              {isPaused && (
                <>
                  <ActionButton
                    icon={Play}
                    variant="primary"
                    onClick={onResume}
                    disabled={!onResume}
                  >
                    Resume
                  </ActionButton>

                  <ActionButton
                    icon={CheckCircle2}
                    variant="secondary"
                    onClick={onComplete}
                    disabled={!onComplete}
                  >
                    Complete
                  </ActionButton>
                </>
              )}

              {(isCompleted || safeStatus === "CANCELLED") && (
                <ActionButton
                  icon={RotateCcw}
                  variant="primary"
                  onClick={onReset}
                  disabled={!onReset}
                >
                  New Session
                </ActionButton>
              )}

              {(isRunning || isPaused) && (
                <ActionButton
                  icon={CircleStop}
                  variant="danger"
                  onClick={onCancel}
                  disabled={!onCancel}
                >
                  Cancel
                </ActionButton>
              )}
            </div>
          )}

          {isRunning && (
            <div className="session-timer__focus-message">
              <span className="session-timer__focus-message-icon">
                <Zap size={15} />
              </span>

              <span>
                You’re in focus mode. Keep going!
              </span>
            </div>
          )}

          {isCompleted && (
            <div className="session-timer__complete-message">
              <CheckCircle2 size={18} />
              <div>
                <strong>Session completed 🎉</strong>
                <span>Your study progress has been saved.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default SessionTimer;