import React, { useMemo } from "react";
import {
  Brain,
  Clock3,
  Smartphone,
  Coffee,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpRight,
} from "lucide-react";
import "./QuickStats.css";

const ICON_MAP = {
  focus: Brain,
  study: Clock3,
  distraction: TrendingDown,
  phone: Smartphone,
  break: Coffee,
  trend: TrendingUp,
};

const DEFAULT_ITEMS = [];

const getTrendIcon = (trend) => {
  const normalized = String(trend || "").toLowerCase();

  if (
    normalized === "up" ||
    normalized === "positive" ||
    normalized === "increase"
  ) {
    return TrendingUp;
  }

  if (
    normalized === "down" ||
    normalized === "negative" ||
    normalized === "decrease"
  ) {
    return TrendingDown;
  }

  return Minus;
};

const normalizeTrend = (trend) => {
  if (!trend) return "neutral";

  const value = String(trend).toLowerCase();

  if (
    ["up", "positive", "increase", "increased"].includes(value)
  ) {
    return "up";
  }

  if (
    ["down", "negative", "decrease", "decreased"].includes(value)
  ) {
    return "down";
  }

  return "neutral";
};

const StatCard = ({
  item,
  index,
  compact,
}) => {
  const Icon =
    item.icon ||
    ICON_MAP[item.iconKey] ||
    Brain;

  const TrendIcon = getTrendIcon(item.trend);
  const trendType = normalizeTrend(item.trend);

  const value =
    item.value !== undefined &&
    item.value !== null
      ? item.value
      : "—";

  const subtitle =
    item.subtitle ||
    item.description ||
    "";

  return (
    <article
      className={`quick-stats__card quick-stats__card--${item.tone || "default"} ${
        compact ? "quick-stats__card--compact" : ""
      }`}
      style={{
        "--card-index": index,
      }}
    >
      <div className="quick-stats__card-top">
        <div className="quick-stats__icon">
          <Icon size={19} strokeWidth={2.15} />
        </div>

        {item.badge && (
          <span className="quick-stats__badge">
            {item.badge}
          </span>
        )}

        {item.link && (
          <button
            type="button"
            className="quick-stats__link"
            onClick={item.onLinkClick}
            aria-label={`Open ${item.label || "details"}`}
          >
            <ArrowUpRight size={15} />
          </button>
        )}
      </div>

      <div className="quick-stats__content">
        <span className="quick-stats__label">
          {item.label || "Statistic"}
        </span>

        <div className="quick-stats__value-row">
          <strong className="quick-stats__value">
            {value}
          </strong>

          {item.unit && (
            <span className="quick-stats__unit">
              {item.unit}
            </span>
          )}
        </div>

        {subtitle && (
          <span className="quick-stats__subtitle">
            {subtitle}
          </span>
        )}
      </div>

      {item.trendValue && (
        <div
          className={`quick-stats__trend quick-stats__trend--${trendType}`}
        >
          <TrendIcon size={13} strokeWidth={2.4} />
          <span>{item.trendValue}</span>
        </div>
      )}

      <div className="quick-stats__shine" />
      <div className="quick-stats__corner-glow" />
    </article>
  );
};

const QuickStats = ({
  stats = DEFAULT_ITEMS,
  items,
  title = "Quick Stats",
  subtitle = "A quick look at your study performance.",
  columns = 4,
  compact = false,
  className = "",
  onCardClick,
}) => {
  const normalizedStats = useMemo(() => {
    const source = Array.isArray(items)
      ? items
      : Array.isArray(stats)
        ? stats
        : [];

    return source.filter(Boolean).map((item, index) => ({
      id:
        item.id ||
        item.key ||
        `quick-stat-${index}`,
      ...item,
    }));
  }, [items, stats]);

  const gridStyle = {
    "--quick-stats-columns": Math.max(
      1,
      Number(columns) || 1
    ),
  };

  return (
    <section
      className={`quick-stats ${
        compact ? "quick-stats--compact" : ""
      } ${className}`}
    >
      {(title || subtitle) && (
        <div className="quick-stats__header">
          <div>
            {title && (
              <h2 className="quick-stats__title">
                {title}
              </h2>
            )}

            {subtitle && (
              <p className="quick-stats__description">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      )}

      {normalizedStats.length > 0 ? (
        <div
          className="quick-stats__grid"
          style={gridStyle}
        >
          {normalizedStats.map((item, index) => (
            <div
              key={item.id}
              className="quick-stats__item"
              onClick={() =>
                onCardClick?.(item)
              }
              role={
                onCardClick
                  ? "button"
                  : undefined
              }
              tabIndex={
                onCardClick
                  ? 0
                  : undefined
              }
              onKeyDown={(event) => {
                if (
                  onCardClick &&
                  (event.key === "Enter" ||
                    event.key === " ")
                ) {
                  event.preventDefault();
                  onCardClick(item);
                }
              }}
            >
              <StatCard
                item={item}
                index={index}
                compact={compact}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="quick-stats__empty">
          <div className="quick-stats__empty-icon">
            <Brain size={20} />
          </div>

          <div>
            <strong>No statistics yet</strong>
            <span>
              Start a study session to build your
              performance insights.
            </span>
          </div>
        </div>
      )}
    </section>
  );
};

export default QuickStats;