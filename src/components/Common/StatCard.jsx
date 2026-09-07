import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Brain,
  CheckCircle2,
  Clock3,
  Coffee,
  Flame,
  Minus,
  MoreHorizontal,
  Smartphone,
  Target,
  TrendingUp,
  UserRound,
} from "lucide-react";

import "./StatCard.css";

const ICON_MAP = {
  activity: Activity,
  brain: Brain,
  clock: Clock3,
  coffee: Coffee,
  focus: Brain,
  flame: Flame,
  phone: Smartphone,
  target: Target,
  trending: TrendingUp,
  user: UserRound,
  success: CheckCircle2,
};

const TREND_ICONS = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  neutral: Minus,
};

const TREND_LABELS = {
  up: "Improving",
  down: "Declining",
  neutral: "Stable",
};

const normalizeTrend = (trend) => {
  if (!trend) return null;

  if (typeof trend === "string") {
    const value = trend.toLowerCase();

    if (["up", "increase", "increased", "positive"].includes(value)) {
      return "up";
    }

    if (["down", "decrease", "decreased", "negative"].includes(value)) {
      return "down";
    }

    return "neutral";
  }

  if (typeof trend === "object") {
    return normalizeTrend(
      trend.direction ||
        trend.type ||
        trend.status
    );
  }

  return null;
};

const getTrendValue = (trend) => {
  if (!trend || typeof trend !== "object") {
    return null;
  }

  return (
    trend.value ??
    trend.amount ??
    trend.percentage ??
    null
  );
};

const getTrendText = (trend) => {
  if (!trend) return "";

  if (typeof trend === "string") {
    return TREND_LABELS[normalizeTrend(trend)] || "";
  }

  return (
    trend.label ||
    trend.text ||
    TREND_LABELS[normalizeTrend(trend)] ||
    ""
  );
};

const getNumericValue = (value) => {
  if (typeof value === "number") {
    return Number.isFinite(value)
      ? value
      : 0;
  }

  const parsed = Number(
    String(value ?? "")
      .replace(/,/g, "")
      .replace(/[^\d.-]/g, "")
  );

  return Number.isFinite(parsed)
    ? parsed
    : 0;
};

const formatNumber = (
  value,
  decimals = 0
) => {
  if (!Number.isFinite(value)) {
    return "0";
  }

  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const getInitialDisplayValue = (value) => {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  return getNumericValue(value);
};

const AnimatedValue = ({
  value,
  duration = 850,
  decimals = 0,
  prefix = "",
  suffix = "",
  formatter,
  enabled = true,
}) => {
  const numericValue =
    getInitialDisplayValue(value);

  const [displayValue, setDisplayValue] =
    useState(
      enabled
        ? 0
        : numericValue
    );

  const previousValueRef =
    useRef(
      enabled
        ? 0
        : numericValue
    );

  useEffect(() => {
    if (!enabled) {
      setDisplayValue(numericValue);
      previousValueRef.current =
        numericValue;
      return undefined;
    }

    const start =
      previousValueRef.current;

    const end = numericValue;

    if (start === end) {
      setDisplayValue(end);
      return undefined;
    }

    let frameId;
    let startTime;

    const easeOut = (progress) =>
      1 - Math.pow(1 - progress, 4);

    const animate = (timestamp) => {
      if (!startTime) {
        startTime = timestamp;
      }

      const elapsed =
        timestamp - startTime;

      const progress = Math.min(
        elapsed / duration,
        1
      );

      const eased =
        easeOut(progress);

      const current =
        start +
        (end - start) * eased;

      setDisplayValue(current);

      if (progress < 1) {
        frameId =
          requestAnimationFrame(
            animate
          );
      } else {
        previousValueRef.current =
          end;
      }
    };

    frameId =
      requestAnimationFrame(animate);

    return () =>
      cancelAnimationFrame(frameId);
  }, [
    numericValue,
    duration,
    enabled,
  ]);

  const formatted = formatter
    ? formatter(displayValue)
    : formatNumber(
        displayValue,
        decimals
      );

  return (
    <>
      {prefix}
      {formatted}
      {suffix}
    </>
  );
};

const StatCard = ({
  label,
  title,

  value = 0,
  unit = "",
  subtitle,
  description,

  icon,
  iconKey = "activity",

  trend,
  trendValue,
  trendLabel,

  badge,
  badgeVariant = "default",

  progress,
  progressMax = 100,

  status,

  href,
  onClick,

  footer,
  action,
  onAction,

  formatter,

  decimals = 0,
  prefix = "",
  suffix = "",

  animate = true,
  animationDuration = 850,

  size = "md",
  variant = "default",

  loading = false,
  disabled = false,

  showIcon = true,
  showTrend = true,
  showProgress = false,
  showAction = false,

  compact = false,
  elevated = false,
  glow = false,

  className = "",
}) => {
  const IconComponent =
    icon ||
    ICON_MAP[iconKey] ||
    Activity;

  const normalizedTrend =
    normalizeTrend(trend);

  const TrendIcon =
    normalizedTrend
      ? TREND_ICONS[
          normalizedTrend
        ]
      : null;

  const resolvedTrendValue =
    trendValue ??
    getTrendValue(trend);

  const resolvedTrendLabel =
    trendLabel ??
    getTrendText(trend);

  const safeProgress = Math.min(
    Math.max(
      getNumericValue(progress),
      0
    ),
    getNumericValue(progressMax) || 100
  );

  const progressPercentage =
    progressMax > 0
      ? Math.min(
          100,
          Math.max(
            0,
            (safeProgress /
              progressMax) *
              100
          )
        )
      : 0;

  const displayLabel =
    label || title || "Statistic";

  const displaySubtitle =
    subtitle || description;

  const hasTrend =
    showTrend &&
    (normalizedTrend ||
      resolvedTrendValue !== null);

  const hasAction =
    showAction &&
    (action || onAction);

  const cardClassName = useMemo(
    () =>
      [
        "dg-stat-card",
        `dg-stat-card--${size}`,
        `dg-stat-card--${variant}`,
        compact
          ? "dg-stat-card--compact"
          : "",
        elevated
          ? "dg-stat-card--elevated"
          : "",
        glow
          ? "dg-stat-card--glow"
          : "",
        loading
          ? "dg-stat-card--loading"
          : "",
        disabled
          ? "dg-stat-card--disabled"
          : "",
        onClick || href
          ? "dg-stat-card--interactive"
          : "",
        className,
      ]
        .filter(Boolean)
        .join(" "),
    [
      size,
      variant,
      compact,
      elevated,
      glow,
      loading,
      disabled,
      onClick,
      href,
      className,
    ]
  );

  const handleCardClick = (event) => {
    if (
      disabled ||
      loading
    ) {
      return;
    }

    onClick?.(event);
  };

  const handleKeyDown = (event) => {
    if (
      !onClick ||
      disabled ||
      loading
    ) {
      return;
    }

    if (
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      onClick(event);
    }
  };

  if (loading) {
    return (
      <div
        className={`${cardClassName} dg-stat-card--skeleton`}
        aria-busy="true"
        aria-label={`${displayLabel} loading`}
      >
        <div className="dg-stat-card__skeleton-top">
          <span className="dg-stat-card__skeleton-icon" />
          <span className="dg-stat-card__skeleton-menu" />
        </div>

        <span className="dg-stat-card__skeleton-label" />
        <span className="dg-stat-card__skeleton-value" />
        <span className="dg-stat-card__skeleton-subtitle" />
      </div>
    );
  }

  const cardContent = (
    <>
      <span className="dg-stat-card__ambient dg-stat-card__ambient--one" />
      <span className="dg-stat-card__ambient dg-stat-card__ambient--two" />

      <span
        className="dg-stat-card__shine"
        aria-hidden="true"
      />

      <div className="dg-stat-card__top">
        {showIcon ? (
          <div className="dg-stat-card__icon">
            <IconComponent
              size={19}
              strokeWidth={2.1}
            />

            <span className="dg-stat-card__icon-pulse" />
          </div>
        ) : (
          <span />
        )}

        {hasAction ? (
          <button
            type="button"
            className="dg-stat-card__action"
            onClick={(event) => {
              event.stopPropagation();
              onAction?.(event);
            }}
            aria-label={
              typeof action === "string"
                ? action
                : "More options"
            }
          >
            {typeof action === "string" ? (
              action
            ) : (
              <MoreHorizontal size={18} />
            )}
          </button>
        ) : (
          <span className="dg-stat-card__top-space" />
        )}
      </div>

      <div className="dg-stat-card__main">
        <div className="dg-stat-card__label-row">
          <span className="dg-stat-card__label">
            {displayLabel}
          </span>

          {badge ? (
            <span
              className={[
                "dg-stat-card__badge",
                `dg-stat-card__badge--${badgeVariant}`,
              ].join(" ")}
            >
              {badge}
            </span>
          ) : null}
        </div>

        <div className="dg-stat-card__value-row">
          <strong className="dg-stat-card__value">
            <AnimatedValue
              value={value}
              duration={
                animationDuration
              }
              decimals={decimals}
              prefix={prefix}
              suffix={suffix}
              formatter={formatter}
              enabled={animate}
            />
          </strong>

          {unit ? (
            <span className="dg-stat-card__unit">
              {unit}
            </span>
          ) : null}
        </div>

        {displaySubtitle ? (
          <p className="dg-stat-card__subtitle">
            {displaySubtitle}
          </p>
        ) : null}
      </div>

      {hasTrend ? (
        <div
          className={[
            "dg-stat-card__trend",
            normalizedTrend
              ? `dg-stat-card__trend--${normalizedTrend}`
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {TrendIcon ? (
            <TrendIcon
              size={14}
              strokeWidth={2.4}
            />
          ) : null}

          {resolvedTrendValue !==
          null ? (
            <span className="dg-stat-card__trend-value">
              {resolvedTrendValue}
            </span>
          ) : null}

          {resolvedTrendLabel ? (
            <span className="dg-stat-card__trend-label">
              {resolvedTrendLabel}
            </span>
          ) : null}
        </div>
      ) : null}

      {status ? (
        <div className="dg-stat-card__status">
          <span className="dg-stat-card__status-dot" />
          <span>{status}</span>
        </div>
      ) : null}

      {showProgress ? (
        <div className="dg-stat-card__progress">
          <div className="dg-stat-card__progress-track">
            <span
              className="dg-stat-card__progress-fill"
              style={{
                "--stat-progress":
                  `${progressPercentage}%`,
              }}
            />
          </div>

          <span className="dg-stat-card__progress-value">
            {formatNumber(
              progressPercentage
            )}%
          </span>
        </div>
      ) : null}

      {footer ? (
        <div className="dg-stat-card__footer">
          {footer}
        </div>
      ) : null}

      <span className="dg-stat-card__corner dg-stat-card__corner--tl" />
      <span className="dg-stat-card__corner dg-stat-card__corner--br" />
    </>
  );

  if (href && !disabled) {
    return (
      <a
        href={href}
        className={cardClassName}
        aria-label={displayLabel}
      >
        {cardContent}
      </a>
    );
  }

  return (
    <div
      className={cardClassName}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      role={onClick ? "button" : undefined}
      tabIndex={
        onClick &&
        !disabled &&
        !loading
          ? 0
          : undefined
      }
      aria-disabled={
        disabled || loading
      }
    >
      {cardContent}
    </div>
  );
};

export default StatCard;