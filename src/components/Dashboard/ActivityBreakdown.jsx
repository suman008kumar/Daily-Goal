import React, { useMemo, useState } from "react";
import {
  Activity,
  ArrowUpRight,
  Brain,
  Coffee,
  EyeOff,
  MoreHorizontal,
  Smartphone,
  UserRound,
} from "lucide-react";
import "./ActivityBreakdown.css";

const EMPTY_ITEMS = [];

const ICON_MAP = {
  focused: Brain,
  focus: Brain,
  distraction: EyeOff,
  break: Coffee,
  phone: Smartphone,
  away: UserRound,
  away_from_desk: UserRound,
  drowsy: EyeOff,
  activity: Activity,
};

const clamp = (value, min, max) =>
  Math.min(max, Math.max(min, value));

const safeNumber = (value, fallback = 0) => {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
};

const formatValue = (value) => {
  const number = safeNumber(value);

  return Number.isInteger(number)
    ? String(number)
    : number.toFixed(1);
};

const normalizeItems = (items) => {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      return {
        ...item,
        id:
          item.id ??
          item.key ??
          `activity-${index}`,
        label:
          item.label ??
          item.name ??
          "Activity",
        value: safeNumber(
          item.value ??
            item.minutes ??
            item.duration ??
            item.seconds ??
            item.percentage ??
            0
        ),
        percentage: safeNumber(
          item.percentage ??
            item.percent ??
            0
        ),
        iconKey:
          item.iconKey ??
          item.type ??
          item.id ??
          "activity",
      };
    })
    .filter(Boolean);
};

const getDurationLabel = (item) => {
  if (item.displayValue) {
    return item.displayValue;
  }

  if (item.formattedValue) {
    return item.formattedValue;
  }

  if (
    item.minutes !== undefined &&
    item.minutes !== null
  ) {
    return `${formatValue(item.minutes)} min`;
  }

  if (
    item.duration !== undefined &&
    item.duration !== null
  ) {
    return `${formatValue(item.duration)} min`;
  }

  if (
    item.seconds !== undefined &&
    item.seconds !== null
  ) {
    const minutes =
      safeNumber(item.seconds) / 60;

    return `${formatValue(minutes)} min`;
  }

  return `${formatValue(item.value)}`;
};

const ActivityIcon = ({
  icon,
  iconKey,
}) => {
  if (React.isValidElement(icon)) {
    return icon;
  }

  if (typeof icon === "function") {
    const CustomIcon = icon;

    return <CustomIcon size={17} />;
  }

  const Icon =
    ICON_MAP[String(iconKey).toLowerCase()] ??
    Activity;

  return <Icon size={17} />;
};

const BreakdownRow = ({
  item,
  index,
  maxValue,
  onSelect,
  selected,
  showValues,
  showPercentage,
  animated,
}) => {
  const percentage = clamp(
    safeNumber(item.percentage),
    0,
    100
  );

  const normalizedWidth =
    maxValue > 0
      ? clamp(
          (item.value / maxValue) * 100,
          5,
          100
        )
      : percentage;

  const rowClassName = [
    "activity-breakdown__row",
    selected
      ? "activity-breakdown__row--selected"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  const handleClick = () => {
    if (typeof onSelect === "function") {
      onSelect(item);
    }
  };

  const handleKeyDown = (event) => {
    if (
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      handleClick();
    }
  };

  return (
    <div
      className={rowClassName}
      style={{
        "--row-index": index,
        "--activity-width":
          `${normalizedWidth}%`,
      }}
      role={
        onSelect ? "button" : undefined
      }
      tabIndex={
        onSelect ? 0 : undefined
      }
      onClick={
        onSelect ? handleClick : undefined
      }
      onKeyDown={
        onSelect
          ? handleKeyDown
          : undefined
      }
    >
      <div className="activity-breakdown__row-top">
        <div className="activity-breakdown__activity">
          <div
            className={[
              "activity-breakdown__activity-icon",
              item.tone
                ? `activity-breakdown__activity-icon--${item.tone}`
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <ActivityIcon
              icon={item.icon}
              iconKey={item.iconKey}
            />
          </div>

          <div className="activity-breakdown__activity-copy">
            <span>
              {item.label}
            </span>

            {item.subtitle && (
              <small>
                {item.subtitle}
              </small>
            )}
          </div>
        </div>

        <div className="activity-breakdown__value">
          {showValues && (
            <strong>
              {getDurationLabel(item)}
            </strong>
          )}

          {showPercentage && (
            <span>
              {formatValue(percentage)}%
            </span>
          )}
        </div>
      </div>

      <div className="activity-breakdown__bar">
        <div className="activity-breakdown__track">
          <div
            className={[
              "activity-breakdown__fill",
              item.tone
                ? `activity-breakdown__fill--${item.tone}`
                : "",
              animated
                ? "activity-breakdown__fill--animated"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <span className="activity-breakdown__fill-shine" />
          </div>
        </div>
      </div>
    </div>
  );
};

const ActivityBreakdown = ({
  items = EMPTY_ITEMS,
  activities,
  title = "Activity Breakdown",
  subtitle = "See where your study time is going.",
  totalLabel = "Total tracked",
  totalValue,
  totalUnit = "min",
  showHeader = true,
  showValues = true,
  showPercentage = true,
  showTotal = true,
  showFooter = true,
  maxItems,
  animated = true,
  compact = false,
  onItemClick,
  className = "",
}) => {
  const [selectedId, setSelectedId] =
    useState(null);

  const sourceItems =
    activities ?? items;

  const normalizedItems = useMemo(
    () =>
      normalizeItems(
        sourceItems
      ),
    [sourceItems]
  );

  const visibleItems = useMemo(() => {
    if (
      !Number.isFinite(
        Number(maxItems)
      )
    ) {
      return normalizedItems;
    }

    return normalizedItems.slice(
      0,
      Math.max(
        0,
        Number(maxItems)
      )
    );
  }, [
    normalizedItems,
    maxItems,
  ]);

  const maxValue = useMemo(() => {
    if (!visibleItems.length) {
      return 0;
    }

    return Math.max(
      ...visibleItems.map(
        (item) => item.value
      )
    );
  }, [visibleItems]);

  const calculatedTotal = useMemo(() => {
    return normalizedItems.reduce(
      (total, item) =>
        total + item.value,
      0
    );
  }, [normalizedItems]);

  const resolvedTotal =
    totalValue !== undefined &&
    totalValue !== null
      ? safeNumber(totalValue)
      : calculatedTotal;

  const totalPercentage = useMemo(() => {
    return normalizedItems.reduce(
      (total, item) =>
        total +
        clamp(
          item.percentage,
          0,
          100
        ),
      0
    );
  }, [normalizedItems]);

  const handleSelect = (item) => {
    setSelectedId((current) =>
      current === item.id
        ? null
        : item.id
    );

    if (
      typeof onItemClick ===
      "function"
    ) {
      onItemClick(item);
    }
  };

  const containerClasses = [
    "activity-breakdown",
    compact
      ? "activity-breakdown--compact"
      : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (!visibleItems.length) {
    return (
      <section className={containerClasses}>
        {showHeader && (
          <header className="activity-breakdown__header">
            <div className="activity-breakdown__heading">
              <div className="activity-breakdown__header-icon">
                <Activity size={18} />
              </div>

              <div>
                <h2>{title}</h2>
                <p>{subtitle}</p>
              </div>
            </div>
          </header>
        )}

        <div className="activity-breakdown__empty">
          <div className="activity-breakdown__empty-icon">
            <Activity size={25} />
          </div>

          <h3>
            No activity data yet
          </h3>

          <p>
            Your activity breakdown
            will appear here after
            you start studying.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className={containerClasses}>
      {showHeader && (
        <header className="activity-breakdown__header">
          <div className="activity-breakdown__heading">
            <div className="activity-breakdown__header-icon">
              <Activity size={18} />
            </div>

            <div>
              <div className="activity-breakdown__title-row">
                <h2>{title}</h2>

                <span className="activity-breakdown__pulse">
                  <span />
                  TRACKING
                </span>
              </div>

              <p>{subtitle}</p>
            </div>
          </div>

          {showTotal && (
            <div className="activity-breakdown__total">
              <span>{totalLabel}</span>

              <strong>
                {formatValue(
                  resolvedTotal
                )}

                <small>
                  {" "}
                  {totalUnit}
                </small>
              </strong>
            </div>
          )}
        </header>
      )}

      <div className="activity-breakdown__content">
        <div className="activity-breakdown__rows">
          {visibleItems.map(
            (item, index) => (
              <BreakdownRow
                key={item.id}
                item={item}
                index={index}
                maxValue={maxValue}
                selected={
                  selectedId ===
                  item.id
                }
                onSelect={
                  onItemClick
                    ? handleSelect
                    : undefined
                }
                showValues={
                  showValues
                }
                showPercentage={
                  showPercentage
                }
                animated={animated}
              />
            )
          )}
        </div>

        <aside className="activity-breakdown__visual">
          <div className="activity-breakdown__donut">
            <div className="activity-breakdown__donut-ring">
              <div className="activity-breakdown__donut-core">
                <Activity size={18} />

                <strong>
                  {formatValue(
                    resolvedTotal
                  )}
                </strong>

                <span>
                  {totalUnit}
                </span>
              </div>
            </div>

            <div className="activity-breakdown__orbit activity-breakdown__orbit--one" />
            <div className="activity-breakdown__orbit activity-breakdown__orbit--two" />
          </div>

          <div className="activity-breakdown__visual-caption">
            <span>
              {formatValue(
                totalPercentage
              )}
              %
            </span>

            <small>
              activity tracked
            </small>
          </div>
        </aside>
      </div>

      {showFooter && (
        <footer className="activity-breakdown__footer">
          <div className="activity-breakdown__footer-left">
            <span className="activity-breakdown__footer-dot" />

            <span>
              Activity is calculated
              from your study
              sessions.
            </span>
          </div>

          <div className="activity-breakdown__footer-action">
            <span>
              Details
            </span>

            <ArrowUpRight
              size={14}
            />
          </div>
        </footer>
      )}

      {selectedId && (
        <div className="activity-breakdown__selection">
          {(() => {
            const selected =
              visibleItems.find(
                (item) =>
                  item.id ===
                  selectedId
              );

            if (!selected) {
              return null;
            }

            return (
              <>
                <div className="activity-breakdown__selection-icon">
                  <ActivityIcon
                    icon={
                      selected.icon
                    }
                    iconKey={
                      selected.iconKey
                    }
                  />
                </div>

                <div>
                  <strong>
                    {selected.label}
                  </strong>

                  <span>
                    {getDurationLabel(
                      selected
                    )}
                    {showPercentage
                      ? ` • ${formatValue(
                          selected.percentage
                        )}%`
                      : ""}
                  </span>
                </div>

                <button
                  type="button"
                  aria-label="Close activity details"
                  onClick={() =>
                    setSelectedId(
                      null
                    )
                  }
                >
                  <MoreHorizontal
                    size={17}
                  />
                </button>
              </>
            );
          })()}
        </div>
      )}
    </section>
  );
};

export default ActivityBreakdown;