import React, {
  forwardRef,
  memo,
  useEffect,
  useState,
} from "react";
import "./ProgressRing.css";

const SIZE_CONFIG = {
  xs: {
    size: 44,
    stroke: 4,
    fontSize: 10,
    labelSize: 7,
  },
  sm: {
    size: 64,
    stroke: 5,
    fontSize: 13,
    labelSize: 8,
  },
  md: {
    size: 96,
    stroke: 7,
    fontSize: 20,
    labelSize: 9,
  },
  lg: {
    size: 132,
    stroke: 9,
    fontSize: 27,
    labelSize: 10,
  },
  xl: {
    size: 172,
    stroke: 11,
    fontSize: 35,
    labelSize: 12,
  },
};

const VARIANT_CONFIG = {
  primary: {
    start: "var(--color-primary, #0e4a63)",
    end: "var(--color-accent, #1ab0b7)",
  },
  accent: {
    start: "var(--color-accent, #1ab0b7)",
    end: "var(--color-primary, #0e4a63)",
  },
  success: {
    start: "var(--color-success, #22c55e)",
    end: "var(--color-accent, #1ab0b7)",
  },
  warning: {
    start: "var(--color-warning, #f59e0b)",
    end: "var(--color-accent, #1ab0b7)",
  },
  danger: {
    start: "var(--color-danger, #ef4444)",
    end: "var(--color-warning, #f59e0b)",
  },
  info: {
    start: "var(--color-info, #3b82f6)",
    end: "var(--color-accent, #1ab0b7)",
  },
};

const clamp = (value, min, max) =>
  Math.min(max, Math.max(min, value));

const normalizeVariant = (variant) =>
  VARIANT_CONFIG[variant]
    ? variant
    : "primary";

const normalizeSize = (size) =>
  SIZE_CONFIG[size]
    ? size
    : "md";

const formatDefaultValue = (
  value,
  showPercentage
) => {
  if (showPercentage) {
    return `${Math.round(value)}%`;
  }

  return Math.round(value);
};

const ProgressRing = forwardRef(
  (
    {
      value = 0,
      max = 100,
      min = 0,

      size = "md",
      variant = "primary",

      label = "",
      valueLabel,
      centerContent,
      children,

      showValue = true,
      showPercentage = true,
      showLabel = true,

      thickness,
      trackOpacity = 0.1,

      rounded = true,
      glow = true,
      animated = true,

      duration = 900,

      startAngle = -90,

      showTicks = false,
      tickCount = 12,

      className = "",
      ariaLabel,
      title,
    },
    ref
  ) => {
    const safeSize = normalizeSize(size);
    const safeVariant = normalizeVariant(variant);

    const config = SIZE_CONFIG[safeSize];

    const numericMin = Number.isFinite(Number(min))
      ? Number(min)
      : 0;

    const numericMax = Number.isFinite(Number(max))
      ? Number(max)
      : 100;

    const range = Math.max(
      numericMax - numericMin,
      1
    );

    const numericValue = Number.isFinite(
      Number(value)
    )
      ? Number(value)
      : numericMin;

    const normalizedValue = clamp(
      numericValue,
      numericMin,
      numericMax
    );

    const percentage = clamp(
      ((normalizedValue - numericMin) / range) *
        100,
      0,
      100
    );

    const [displayProgress, setDisplayProgress] =
      useState(animated ? 0 : percentage);

    useEffect(() => {
      if (!animated) {
        setDisplayProgress(percentage);
        return undefined;
      }

      let frameId;
      let startTime = null;

      const initialProgress = displayProgress;
      const difference =
        percentage - initialProgress;

      const easeOutCubic = (progress) =>
        1 - Math.pow(1 - progress, 3);

      const animate = (timestamp) => {
        if (!startTime) {
          startTime = timestamp;
        }

        const elapsed = timestamp - startTime;

        const animationProgress = clamp(
          elapsed / Math.max(duration, 1),
          0,
          1
        );

        const eased =
          easeOutCubic(animationProgress);

        setDisplayProgress(
          initialProgress + difference * eased
        );

        if (animationProgress < 1) {
          frameId =
            requestAnimationFrame(animate);
        }
      };

      frameId =
        requestAnimationFrame(animate);

      return () =>
        cancelAnimationFrame(frameId);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [percentage, animated, duration]);

    const ringSize = config.size;

    const strokeWidth =
      Number.isFinite(Number(thickness))
        ? Number(thickness)
        : config.stroke;

    const radius =
      (ringSize - strokeWidth) / 2;

    const circumference =
      2 * Math.PI * radius;

    const dashOffset =
      circumference -
      (displayProgress / 100) *
        circumference;

    const variantConfig =
      VARIANT_CONFIG[safeVariant];

    const centerValue =
      valueLabel ??
      formatDefaultValue(
        normalizedValue,
        showPercentage
      );

    const classes = [
      "dg-progress-ring",
      `dg-progress-ring--${safeSize}`,
      `dg-progress-ring--${safeVariant}`,
      rounded
        ? "dg-progress-ring--rounded"
        : "",
      glow
        ? "dg-progress-ring--glow"
        : "",
      animated
        ? "dg-progress-ring--animated"
        : "dg-progress-ring--static",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    const renderTicks = () => {
      if (!showTicks || tickCount <= 0) {
        return null;
      }

      return (
        <div
          className="dg-progress-ring__ticks"
          aria-hidden="true"
          style={{
            "--tick-count": tickCount,
          }}
        >
          {Array.from({
            length: tickCount,
          }).map((_, index) => (
            <span
              key={index}
              style={{
                transform: `rotate(${
                  index *
                  (360 / tickCount)
                }deg) translateY(calc(var(--ring-size) / -2 + 3px))`,
              }}
            />
          ))}
        </div>
      );
    };

    return (
      <div
        ref={ref}
        className={classes}
        title={title}
        role="progressbar"
        aria-valuemin={numericMin}
        aria-valuemax={numericMax}
        aria-valuenow={Math.round(
          normalizedValue
        )}
        aria-label={
          ariaLabel ||
          label ||
          `${Math.round(percentage)}% progress`
        }
        style={{
          "--ring-size": `${ringSize}px`,
          "--ring-thickness": `${strokeWidth}px`,
          "--ring-track-opacity": trackOpacity,
          "--ring-start": variantConfig.start,
          "--ring-end": variantConfig.end,
          "--ring-font-size": `${config.fontSize}px`,
          "--ring-label-size": `${config.labelSize}px`,
          "--ring-angle": `${startAngle}deg`,
        }}
      >
        <div className="dg-progress-ring__visual">
          <svg
            className="dg-progress-ring__svg"
            width={ringSize}
            height={ringSize}
            viewBox={`0 0 ${ringSize} ${ringSize}`}
            aria-hidden="true"
          >
            <defs>
              <linearGradient
                id={`progress-gradient-${safeSize}-${safeVariant}`}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop
                  offset="0%"
                  stopColor={variantConfig.start}
                />

                <stop
                  offset="100%"
                  stopColor={variantConfig.end}
                />
              </linearGradient>

              <filter
                id={`progress-glow-${safeSize}-${safeVariant}`}
                x="-80%"
                y="-80%"
                width="260%"
                height="260%"
              >
                <feGaussianBlur
                  stdDeviation="3"
                  result="blur"
                />

                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <circle
              className="dg-progress-ring__track"
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
            />

            <circle
              className="dg-progress-ring__value"
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              stroke={`url(#progress-gradient-${safeSize}-${safeVariant})`}
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeWidth={strokeWidth}
              filter={
                glow
                  ? `url(#progress-glow-${safeSize}-${safeVariant})`
                  : undefined
              }
            />
          </svg>

          {renderTicks()}

          <div className="dg-progress-ring__center">
            {centerContent || (
              <>
                {showValue && (
                  <span className="dg-progress-ring__value-text">
                    {centerValue}
                  </span>
                )}

                {showLabel && label && (
                  <span className="dg-progress-ring__label">
                    {label}
                  </span>
                )}

                {children}
              </>
            )}
          </div>

          <span
            className="dg-progress-ring__orbit dg-progress-ring__orbit--one"
            aria-hidden="true"
          />

          <span
            className="dg-progress-ring__orbit dg-progress-ring__orbit--two"
            aria-hidden="true"
          />
        </div>
      </div>
    );
  }
);

ProgressRing.displayName = "ProgressRing";

export default memo(ProgressRing);