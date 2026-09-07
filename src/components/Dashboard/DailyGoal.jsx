import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Target,
  Play,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Clock3,
  Trophy,
} from "lucide-react";
import "./DailyGoal.css";

const clamp = (value, min = 0, max = 100) =>
  Math.min(Math.max(Number(value) || 0, min), max);

const formatDuration = (seconds = 0) => {
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

const AnimatedNumber = ({ value }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const previousValue = useRef(0);

  useEffect(() => {
    const target = Number(value) || 0;
    const startValue = previousValue.current;
    const startTime = performance.now();
    const duration = 850;

    let frame;

    const animate = (time) => {
      const progress = Math.min(
        (time - startTime) / duration,
        1
      );

      const eased =
        1 - Math.pow(1 - progress, 3);

      const current =
        startValue + (target - startValue) * eased;

      setDisplayValue(current);

      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      } else {
        previousValue.current = target;
      }
    };

    frame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{Math.round(displayValue)}</>;
};

const GoalRing = ({
  progress,
  completed,
  size = 178,
  strokeWidth = 11,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const safeProgress = clamp(progress);

  const dashOffset =
    circumference -
    (safeProgress / 100) * circumference;

  return (
    <div
      className={`daily-goal__ring ${
        completed ? "daily-goal__ring--completed" : ""
      }`}
      style={{
        "--goal-size": `${size}px`,
      }}
    >
      <div className="daily-goal__ring-glow" />

      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="daily-goal__ring-svg"
        aria-hidden="true"
      >
        <circle
          className="daily-goal__ring-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
        />

        <circle
          className="daily-goal__ring-progress"
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

      <div className="daily-goal__ring-orbit daily-goal__ring-orbit--one" />
      <div className="daily-goal__ring-orbit daily-goal__ring-orbit--two" />

      <div className="daily-goal__ring-content">
        {completed ? (
          <>
            <div className="daily-goal__complete-icon">
              <CheckCircle2 size={26} />
            </div>

            <strong>Complete!</strong>
          </>
        ) : (
          <>
            <strong>
              <AnimatedNumber value={safeProgress} />%
            </strong>

            <span>completed</span>
          </>
        )}
      </div>
    </div>
  );
};

const DailyGoal = ({
  targetSeconds = 0,
  completedSeconds = 0,
  progress,
  remainingSeconds,
  isCompleted = false,
  isActive = false,
  onStart,
  onViewDetails,
  title = "Daily Goal",
  subtitle = "Build your focus streak one session at a time.",
  className = "",
}) => {
  const calculatedProgress = useMemo(() => {
    if (typeof progress === "number") {
      return clamp(progress);
    }

    if (!targetSeconds || targetSeconds <= 0) {
      return 0;
    }

    return clamp(
      (completedSeconds / targetSeconds) * 100
    );
  }, [progress, completedSeconds, targetSeconds]);

  const calculatedRemaining = useMemo(() => {
    if (typeof remainingSeconds === "number") {
      return Math.max(0, remainingSeconds);
    }

    return Math.max(
      0,
      Number(targetSeconds || 0) -
        Number(completedSeconds || 0)
    );
  }, [
    remainingSeconds,
    targetSeconds,
    completedSeconds,
  ]);

  const completed =
    isCompleted ||
    calculatedProgress >= 100;

  const safeCompletedSeconds = Math.max(
    0,
    Number(completedSeconds) || 0
  );

  const safeTargetSeconds = Math.max(
    0,
    Number(targetSeconds) || 0
  );

  const containerClasses = [
    "daily-goal",
    completed ? "daily-goal--completed" : "",
    isActive ? "daily-goal--active" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={containerClasses}>
      <div className="daily-goal__ambient daily-goal__ambient--one" />
      <div className="daily-goal__ambient daily-goal__ambient--two" />

      <div className="daily-goal__header">
        <div className="daily-goal__heading">
          <div className="daily-goal__icon">
            <Target size={20} strokeWidth={2.2} />
          </div>

          <div>
            <div className="daily-goal__title-row">
              <h2>{title}</h2>

              {isActive && !completed && (
                <span className="daily-goal__active-badge">
                  <span />
                  In Progress
                </span>
              )}
            </div>

            <p>{subtitle}</p>
          </div>
        </div>

        <div className="daily-goal__sparkle">
          <Sparkles size={17} />
        </div>
      </div>

      <div className="daily-goal__content">
        <div className="daily-goal__visual">
          <GoalRing
            progress={calculatedProgress}
            completed={completed}
          />

          {completed && (
            <div className="daily-goal__celebration">
              <span>🎉</span>
              <span>Goal achieved</span>
            </div>
          )}
        </div>

        <div className="daily-goal__details">
          <div className="daily-goal__headline">
            {completed ? (
              <>
                <span className="daily-goal__eyebrow">
                  Daily Goal Completed
                </span>

                <h3>
                  Amazing work!
                  <span> 🎉</span>
                </h3>

                <p>
                  You reached your study target for today.
                  Keep the momentum going tomorrow.
                </p>
              </>
            ) : (
              <>
                <span className="daily-goal__eyebrow">
                  Today&apos;s Progress
                </span>

                <h3>
                  Keep going.
                  <span> You&apos;re doing great!</span>
                </h3>

                <p>
                  Stay focused and complete your Daily Goal
                  at your own pace.
                </p>
              </>
            )}
          </div>

          <div className="daily-goal__stats">
            <div className="daily-goal__stat">
              <div className="daily-goal__stat-icon">
                <Clock3 size={16} />
              </div>

              <div>
                <span>Completed</span>
                <strong>
                  {formatDuration(
                    safeCompletedSeconds
                  )}
                </strong>
              </div>
            </div>

            <div className="daily-goal__stat">
              <div className="daily-goal__stat-icon">
                <Target size={16} />
              </div>

              <div>
                <span>Target</span>
                <strong>
                  {formatDuration(
                    safeTargetSeconds
                  )}
                </strong>
              </div>
            </div>

            <div className="daily-goal__stat">
              <div className="daily-goal__stat-icon">
                <Trophy size={16} />
              </div>

              <div>
                <span>Remaining</span>
                <strong>
                  {completed
                    ? "Done"
                    : formatDuration(
                        calculatedRemaining
                      )}
                </strong>
              </div>
            </div>
          </div>

          <div className="daily-goal__progress">
            <div className="daily-goal__progress-top">
              <span>Goal progress</span>
              <strong>
                {Math.round(calculatedProgress)}%
              </strong>
            </div>

            <div className="daily-goal__progress-track">
              <div
                className="daily-goal__progress-fill"
                style={{
                  width: `${calculatedProgress}%`,
                }}
              >
                <span />
              </div>
            </div>
          </div>

          <div className="daily-goal__actions">
            {!completed && onStart && (
              <button
                type="button"
                className="daily-goal__button daily-goal__button--primary"
                onClick={onStart}
              >
                <Play size={17} fill="currentColor" />
                <span>
                  {isActive
                    ? "Continue Session"
                    : "Start Session"}
                </span>
              </button>
            )}

            {onViewDetails && (
              <button
                type="button"
                className="daily-goal__button daily-goal__button--secondary"
                onClick={onViewDetails}
              >
                <span>View Details</span>
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default DailyGoal;