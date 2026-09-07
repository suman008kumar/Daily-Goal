import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  BarChart3,
  Brain,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Coffee,
  Eye,
  Flame,
  Info,
  Lightbulb,
  RefreshCw,
  Smartphone,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";

import PageTransition from "../../components/Common/PageTransition";
import Badge from "../../components/Common/Badge";
import ProgressRing from "../../components/Common/ProgressRing";
import EmptyState from "../../components/Common/EmptyState";

import { getSessions } from "../../services/storageService";

import "./Analytics.css";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const RANGE_OPTIONS = [
  {
    value: "daily",
    label: "Daily",
    shortLabel: "Day",
  },
  {
    value: "weekly",
    label: "Weekly",
    shortLabel: "Week",
  },
  {
    value: "monthly",
    label: "Monthly",
    shortLabel: "Month",
  },
];

const ACTIVITY_CONFIG = {
  focused: {
    label: "Focused",
    icon: Brain,
    className: "focused",
  },
  distracted: {
    label: "Distraction",
    icon: Activity,
    className: "distracted",
  },
  break: {
    label: "Break",
    icon: Coffee,
    className: "break",
  },
  phone: {
    label: "Phone",
    icon: Smartphone,
    className: "phone",
  },
  away: {
    label: "Away from Desk",
    icon: Eye,
    className: "away",
  },
  drowsy: {
    label: "Drowsy",
    icon: Zap,
    className: "drowsy",
  },
};

const clamp = (value, min = 0, max = 100) =>
  Math.min(max, Math.max(min, Number(value) || 0));

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const toSeconds = (value) => {
  if (typeof value === "number") {
    return Math.max(0, value);
  }

  if (!value) {
    return 0;
  }

  if (typeof value === "string") {
    if (/^\d+$/.test(value)) {
      return Math.max(0, Number(value));
    }

    const parts = value.split(":").map(Number);

    if (
      parts.length === 3 &&
      parts.every((part) => Number.isFinite(part))
    ) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }

    if (
      parts.length === 2 &&
      parts.every((part) => Number.isFinite(part))
    ) {
      return parts[0] * 60 + parts[1];
    }
  }

  return 0;
};

const formatDuration = (seconds) => {
  const total = Math.max(0, Math.round(toNumber(seconds)));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
};

const formatMinutes = (seconds) =>
  `${Math.max(0, Math.round(toNumber(seconds) / 60))}m`;

const formatDate = (value, options = {}) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    ...options,
  }).format(date);
};

const formatDay = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
  }).format(date);
};

const getSessionDate = (session) => {
  const value =
    session?.date ||
    session?.startTime ||
    session?.startedAt ||
    session?.createdAt ||
    session?.timestamp;

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

const getSessionDuration = (session) => {
  if (session?.durationSeconds != null) {
    return toSeconds(session.durationSeconds);
  }

  if (session?.duration != null) {
    return toSeconds(session.duration);
  }

  const start = new Date(
    session?.startTime || session?.startedAt
  );

  const end = new Date(
    session?.endTime ||
      session?.endedAt ||
      session?.completedAt
  );

  if (
    !Number.isNaN(start.getTime()) &&
    !Number.isNaN(end.getTime()) &&
    end > start
  ) {
    return Math.floor((end - start) / 1000);
  }

  return 0;
};

const getFocusScore = (session) => {
  const value =
    session?.focusScore ??
    session?.score ??
    session?.averageFocus ??
    session?.focus;

  return clamp(value);
};

const getDistractionSeconds = (session, duration) => {
  if (session?.distractionSeconds != null) {
    return toSeconds(session.distractionSeconds);
  }

  if (session?.distractedTime != null) {
    return toSeconds(session.distractedTime);
  }

  const percentage = session?.distractionPercentage;

  if (percentage != null) {
    return duration * clamp(percentage, 0, 100) / 100;
  }

  return 0;
};

const getPhoneSeconds = (session) => {
  return toSeconds(
    session?.phoneSeconds ??
      session?.phoneTime ??
      session?.phoneUsageSeconds ??
      0
  );
};

const getBreakSeconds = (session) => {
  return toSeconds(
    session?.breakSeconds ??
      session?.breakTime ??
      0
  );
};

const getAwaySeconds = (session) => {
  return toSeconds(
    session?.awaySeconds ??
      session?.awayTime ??
      0
  );
};

const getDrowsySeconds = (session) => {
  return toSeconds(
    session?.drowsySeconds ??
      session?.drowsyTime ??
      0
  );
};

const getFocusedSeconds = (session, duration, distraction) => {
  if (session?.focusedSeconds != null) {
    return toSeconds(session.focusedSeconds);
  }

  if (session?.focusedTime != null) {
    return toSeconds(session.focusedTime);
  }

  return Math.max(0, duration - distraction);
};

const getRangeStart = (range, referenceDate = new Date()) => {
  const date = new Date(referenceDate);
  date.setHours(0, 0, 0, 0);

  if (range === "daily") {
    return date;
  }

  if (range === "weekly") {
    const day = date.getDay();
    const difference = day === 0 ? 6 : day - 1;
    date.setDate(date.getDate() - difference);
    return date;
  }

  date.setDate(1);
  return date;
};

const getPreviousRangeStart = (range, referenceDate = new Date()) => {
  const start = getRangeStart(range, referenceDate);

  if (range === "daily") {
    start.setDate(start.getDate() - 1);
  }

  if (range === "weekly") {
    start.setDate(start.getDate() - 7);
  }

  if (range === "monthly") {
    start.setMonth(start.getMonth() - 1);
  }

  return start;
};

const getPreviousRangeEnd = (range, referenceDate = new Date()) => {
  return getRangeStart(range, referenceDate);
};

const getStatus = (score) => {
  if (score >= 90) {
    return "excellent";
  }

  if (score >= 75) {
    return "good";
  }

  if (score >= 60) {
    return "needs_attention";
  }

  return "low";
};

const getStatusLabel = (score) => {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60) return "Needs Attention";
  return "Low Focus";
};

const average = (values) => {
  const valid = values.filter((value) =>
    Number.isFinite(Number(value))
  );

  if (!valid.length) {
    return 0;
  }

  return (
    valid.reduce(
      (sum, value) => sum + Number(value),
      0
    ) / valid.length
  );
};

const getTrend = (current, previous) => {
  if (!previous && !current) {
    return {
      direction: "neutral",
      value: 0,
    };
  }

  if (!previous) {
    return {
      direction: "up",
      value: 100,
    };
  }

  const difference = ((current - previous) / Math.abs(previous)) * 100;

  return {
    direction:
      Math.abs(difference) < 0.5
        ? "neutral"
        : difference > 0
        ? "up"
        : "down",
    value: Math.abs(difference),
  };
};

const getHourLabel = (hour) => {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
  }).format(date);
};

/* -------------------------------------------------------------------------- */
/* Small components                                                            */
/* -------------------------------------------------------------------------- */

const MetricCard = ({
  icon: Icon,
  label,
  value,
  unit,
  trend,
  description,
  index = 0,
}) => {
  const TrendIcon =
    trend?.direction === "up"
      ? TrendingUp
      : trend?.direction === "down"
      ? TrendingDown
      : Activity;

  return (
    <article
      className="analytics-metric-card"
      style={{
        "--analytics-delay": `${index * 70}ms`,
      }}
    >
      <div className="analytics-metric-top">
        <span className="analytics-metric-icon">
          <Icon size={19} strokeWidth={2} />
        </span>

        {trend && (
          <span
            className={`analytics-trend analytics-trend--${trend.direction}`}
          >
            <TrendIcon size={13} />
            {trend.value > 0
              ? `${Math.round(trend.value)}%`
              : "Stable"}
          </span>
        )}
      </div>

      <div className="analytics-metric-label">
        {label}
      </div>

      <div className="analytics-metric-value">
        {value}
        {unit && (
          <span className="analytics-metric-unit">
            {unit}
          </span>
        )}
      </div>

      {description && (
        <div className="analytics-metric-description">
          {description}
        </div>
      )}
    </article>
  );
};

const ChartTooltip = ({
  point,
  visible,
  x,
  y,
}) => {
  if (!visible || !point) {
    return null;
  }

  return (
    <div
      className="analytics-chart-tooltip"
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
    >
      <strong>{point.label}</strong>
      <span>{Math.round(point.value)} focus</span>
    </div>
  );
};

const FocusChart = ({ data }) => {
  const [activeIndex, setActiveIndex] = useState(null);

  const width = 900;
  const height = 330;
  const paddingX = 46;
  const paddingY = 30;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const points = useMemo(() => {
    if (!data.length) {
      return [];
    }

    return data.map((item, index) => {
      const denominator = Math.max(1, data.length - 1);

      const x =
        paddingX +
        (index / denominator) * chartWidth;

      const y =
        paddingY +
        ((100 - clamp(item.value)) / 100) *
          chartHeight;

      return {
        ...item,
        x,
        y,
      };
    });
  }, [data, chartHeight, chartWidth]);

  const linePath = points
    .map((point, index) =>
      `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
    )
    .join(" ");

  const areaPath =
    points.length > 0
      ? `${linePath} L ${
          points[points.length - 1].x
        } ${height - paddingY} L ${
          points[0].x
        } ${height - paddingY} Z`
      : "";

  const activePoint =
    activeIndex != null
      ? points[activeIndex]
      : null;

  return (
    <div className="analytics-focus-chart">
      {data.length ? (
        <>
          <div className="analytics-chart-legend">
            <span>
              <i className="analytics-legend-dot" />
              Focus Score
            </span>

            <span className="analytics-chart-range">
              0 — 100
            </span>
          </div>

          <div className="analytics-chart-wrapper">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="analytics-line-chart"
              role="img"
              aria-label="Focus score chart"
            >
              <defs>
                <linearGradient
                  id="analyticsAreaGradient"
                  x1="0"
                  x2="0"
                  y1="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor="var(--color-accent)"
                    stopOpacity="0.25"
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--color-accent)"
                    stopOpacity="0"
                  />
                </linearGradient>

                <linearGradient
                  id="analyticsLineGradient"
                  x1="0"
                  x2="1"
                  y1="0"
                  y2="0"
                >
                  <stop
                    offset="0%"
                    stopColor="var(--color-primary)"
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--color-accent)"
                  />
                </linearGradient>

                <filter id="analyticsLineGlow">
                  <feGaussianBlur
                    stdDeviation="5"
                    result="blur"
                  />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {[0, 25, 50, 75, 100].map(
                (value) => {
                  const y =
                    paddingY +
                    ((100 - value) / 100) *
                      chartHeight;

                  return (
                    <g key={value}>
                      <line
                        x1={paddingX}
                        x2={width - paddingX}
                        y1={y}
                        y2={y}
                        className="analytics-grid-line"
                      />

                      <text
                        x={paddingX - 12}
                        y={y + 4}
                        textAnchor="end"
                        className="analytics-axis-label"
                      >
                        {value}
                      </text>
                    </g>
                  );
                }
              )}

              {points.length > 1 && (
                <path
                  d={areaPath}
                  className="analytics-area-path"
                />
              )}

              {points.length > 1 && (
                <path
                  d={linePath}
                  className="analytics-line-glow"
                  filter="url(#analyticsLineGlow)"
                />
              )}

              {points.length > 1 && (
                <path
                  d={linePath}
                  className="analytics-line-path"
                />
              )}

              {points.map((point, index) => (
                <g key={`${point.label}-${index}`}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="18"
                    className="analytics-hit-area"
                    onMouseEnter={() =>
                      setActiveIndex(index)
                    }
                    onMouseLeave={() =>
                      setActiveIndex(null)
                    }
                    onFocus={() =>
                      setActiveIndex(index)
                    }
                    onBlur={() =>
                      setActiveIndex(null)
                    }
                    tabIndex={0}
                    role="button"
                    aria-label={`${point.label}: ${Math.round(
                      point.value
                    )}`}
                  />

                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={
                      activeIndex === index
                        ? 7
                        : 4.5
                    }
                    className={`analytics-point ${
                      activeIndex === index
                        ? "is-active"
                        : ""
                    }`}
                  />
                </g>
              ))}
            </svg>

            <div className="analytics-chart-labels">
              {points.map((point, index) => (
                <span key={`${point.label}-label-${index}`}>
                  {point.label}
                </span>
              ))}
            </div>

            {activePoint && (
              <ChartTooltip
                point={activePoint}
                visible
                x={Math.min(
                  Math.max(
                    (activePoint.x / width) * 100,
                    12
                  ),
                  88
                )}
                y={Math.max(
                  (activePoint.y / height) * 100 - 10,
                  8
                )}
              />
            )}
          </div>
        </>
      ) : (
        <EmptyState
          compact
          iconKey="analytics"
          title="Not enough data yet"
          description="Complete a few study sessions to see your focus trend."
        />
      )}
    </div>
  );
};

const ActivityBreakdown = ({
  activities,
  totalSeconds,
}) => {
  return (
    <div className="analytics-breakdown">
      {activities.map((item, index) => {
        const config =
          ACTIVITY_CONFIG[item.key] ||
          ACTIVITY_CONFIG.focused;

        const Icon = config.icon;

        const percentage =
          totalSeconds > 0
            ? (item.seconds / totalSeconds) * 100
            : 0;

        return (
          <div
            className="analytics-breakdown-item"
            key={item.key}
            style={{
              "--analytics-delay": `${index * 80}ms`,
            }}
          >
            <div className="analytics-breakdown-header">
              <div className="analytics-breakdown-name">
                <span
                  className={`analytics-breakdown-icon analytics-breakdown-icon--${config.className}`}
                >
                  <Icon size={15} />
                </span>

                <span>{config.label}</span>
              </div>

              <strong>
                {formatDuration(item.seconds)}
              </strong>
            </div>

            <div className="analytics-breakdown-track">
              <span
                className={`analytics-breakdown-fill analytics-breakdown-fill--${config.className}`}
                style={{
                  width: `${Math.min(
                    100,
                    percentage
                  )}%`,
                }}
              />
            </div>

            <div className="analytics-breakdown-footer">
              <span>
                {Math.round(percentage)}%
              </span>

              {item.sessions != null && (
                <span>
                  {item.sessions} session
                  {item.sessions === 1 ? "" : "s"}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const PerformanceCard = ({
  label,
  value,
  secondary,
  icon: Icon,
  positive,
}) => {
  return (
    <div className="analytics-performance-item">
      <div className="analytics-performance-icon">
        <Icon size={17} />
      </div>

      <div className="analytics-performance-content">
        <span>{label}</span>
        <strong>{value}</strong>
        {secondary && <small>{secondary}</small>}
      </div>

      {positive != null && (
        <span
          className={`analytics-performance-indicator ${
            positive ? "is-positive" : "is-negative"
          }`}
        >
          {positive ? (
            <TrendingUp size={15} />
          ) : (
            <TrendingDown size={15} />
          )}
        </span>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Main page                                                                  */
/* -------------------------------------------------------------------------- */

const Analytics = () => {
  const [range, setRange] = useState("weekly");
  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] =
    useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const loadSessions = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError("");

      try {
        const storedSessions =
          await Promise.resolve(getSessions());

        setSessions(
          Array.isArray(storedSessions)
            ? storedSessions
            : []
        );
      } catch (loadError) {
        console.error(
          "Unable to load analytics sessions:",
          loadError
        );

        setSessions([]);
        setError(
          "Unable to load your saved study sessions."
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadSessions();
    const handleDataChange = () => {
      loadSessions(true);
      setRefreshKey((value) => value + 1);
    };
    window.addEventListener("storage", handleDataChange);
    window.addEventListener("daily-goal-data-change", handleDataChange);
    return () => {
      window.removeEventListener("storage", handleDataChange);
      window.removeEventListener("daily-goal-data-change", handleDataChange);
    };
  }, [loadSessions]);

  const normalizedSessions = useMemo(() => {
    return sessions
      .map((session) => {
        const date = getSessionDate(session);

        if (!date) {
          return null;
        }

        const duration = getSessionDuration(session);
        const distraction =
          getDistractionSeconds(
            session,
            duration
          );

        return {
          ...session,
          _date: date,
          _duration: duration,
          _focus: getFocusScore(session),
          _focused: getFocusedSeconds(
            session,
            duration,
            distraction
          ),
          _distraction: distraction,
          _phone: getPhoneSeconds(session),
          _break: getBreakSeconds(session),
          _away: getAwaySeconds(session),
          _drowsy: getDrowsySeconds(session),
        };
      })
      .filter(Boolean)
      .sort(
        (a, b) =>
          b._date.getTime() -
          a._date.getTime()
      );
  }, [sessions]);

  const currentRangeSessions = useMemo(() => {
    const now = new Date();
    const start = getRangeStart(range, now);

    return normalizedSessions.filter(
      (session) => session._date >= start
    );
  }, [normalizedSessions, range]);

  const previousRangeSessions = useMemo(() => {
    const now = new Date();
    const start = getPreviousRangeStart(
      range,
      now
    );
    const end = getPreviousRangeEnd(range, now);

    return normalizedSessions.filter(
      (session) =>
        session._date >= start &&
        session._date < end
    );
  }, [normalizedSessions, range]);

  const aggregate = useCallback(
    (items) => {
      const totalSeconds = items.reduce(
        (sum, session) =>
          sum + session._duration,
        0
      );

      const focusedSeconds = items.reduce(
        (sum, session) =>
          sum + session._focused,
        0
      );

      const distractionSeconds =
        items.reduce(
          (sum, session) =>
            sum + session._distraction,
          0
        );

      const phoneSeconds = items.reduce(
        (sum, session) =>
          sum + session._phone,
        0
      );

      const breakSeconds = items.reduce(
        (sum, session) =>
          sum + session._break,
        0
      );

      const awaySeconds = items.reduce(
        (sum, session) =>
          sum + session._away,
        0
      );

      const drowsySeconds = items.reduce(
        (sum, session) =>
          sum + session._drowsy,
        0
      );

      const focusScore = average(
        items.map((session) => session._focus)
      );

      return {
        sessionCount: items.length,
        totalSeconds,
        focusedSeconds,
        distractionSeconds,
        phoneSeconds,
        breakSeconds,
        awaySeconds,
        drowsySeconds,
        focusScore,
      };
    },
    []
  );

  const currentStats = useMemo(
    () => aggregate(currentRangeSessions),
    [aggregate, currentRangeSessions]
  );

  const liveMonitoringMetrics = useMemo(() => {
    try {
      const raw = localStorage.getItem("daily_goal_active_monitoring_metrics");
      const data = raw ? JSON.parse(raw) : {};
      const focused = Math.max(0, Number(data.focusedSeconds) || 0);
      const distracted = Math.max(0, Number(data.distractionSeconds) || 0);
      const phone = Math.max(0, Number(data.phoneSeconds) || 0);
      const total = focused + distracted;
      return { focused, distracted, phone, total, score: total ? Math.round((focused / total) * 100) : 0 };
    } catch {
      return { focused: 0, distracted: 0, phone: 0, total: 0, score: 0 };
    }
  }, [refreshKey]);

  const liveCurrentStats = useMemo(() => {
    if (!liveMonitoringMetrics.total) return currentStats;
    return {
      ...currentStats,
      totalSeconds: Math.max(currentStats.totalSeconds, liveMonitoringMetrics.total),
      focusedSeconds: Math.max(currentStats.focusedSeconds, liveMonitoringMetrics.focused),
      distractionSeconds: Math.max(currentStats.distractionSeconds, liveMonitoringMetrics.distracted),
      phoneSeconds: Math.max(currentStats.phoneSeconds, liveMonitoringMetrics.phone),
      focusScore: Math.max(currentStats.focusScore, liveMonitoringMetrics.score),
    };
  }, [currentStats, liveMonitoringMetrics]);

  const previousStats = useMemo(
    () => aggregate(previousRangeSessions),
    [aggregate, previousRangeSessions]
  );

  const focusTrend = useMemo(
    () =>
      getTrend(
        liveCurrentStats.focusScore,
        previousStats.focusScore
      ),
    [liveCurrentStats.focusScore, previousStats.focusScore]
  );

  const studyTimeTrend = useMemo(
    () =>
      getTrend(
        currentStats.totalSeconds,
        previousStats.totalSeconds
      ),
    [
      currentStats.totalSeconds,
      previousStats.totalSeconds,
    ]
  );

  const distractionTrend = useMemo(
    () =>
      getTrend(
        currentStats.distractionSeconds,
        previousStats.distractionSeconds
      ),
    [
      currentStats.distractionSeconds,
      previousStats.distractionSeconds,
    ]
  );

  const phoneTrend = useMemo(
    () =>
      getTrend(
        currentStats.phoneSeconds,
        previousStats.phoneSeconds
      ),
    [
      currentStats.phoneSeconds,
      previousStats.phoneSeconds,
    ]
  );

  /* ---------------------------------------------------------------------- */
  /* Focus chart                                                             */
  /* ---------------------------------------------------------------------- */

  const focusChartData = useMemo(() => {
    const now = new Date();

    if (range === "daily") {
      const todaySessions =
        currentRangeSessions;

      const hourly = Array.from(
        { length: 24 },
        (_, hour) => ({
          hour,
          sessions: [],
        })
      );

      todaySessions.forEach((session) => {
        const hour = session._date.getHours();

        if (hourly[hour]) {
          hourly[hour].sessions.push(session);
        }
      });

      const points = hourly
        .filter((item) => item.sessions.length > 0)
        .map((item) => ({
          label: getHourLabel(item.hour),
          value: average(item.sessions.map((session) => session._focus)),
        }));
      if (liveMonitoringMetrics.score > 0) points.push({ label: "Now", value: liveMonitoringMetrics.score });
      return points;
    }

    if (range === "weekly") {
      const start = getRangeStart("weekly", now);

      return Array.from(
        { length: 7 },
        (_, index) => {
          const day = new Date(start);
          day.setDate(
            start.getDate() + index
          );

          const nextDay = new Date(day);
          nextDay.setDate(
            day.getDate() + 1
          );

          const items =
            currentRangeSessions.filter(
              (session) =>
                session._date >= day &&
                session._date < nextDay
            );

          return {
            label: formatDay(day),
            value: average(
              items.map(
                (session) => session._focus
              )
            ),
          };
        }
      );
    }

    const start = getRangeStart(
      "monthly",
      now
    );

    const numberOfDays = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0
    ).getDate();

    const bucketCount = Math.ceil(
      numberOfDays / 7
    );

    return Array.from(
      { length: bucketCount },
      (_, index) => {
        const bucketStart = new Date(start);
        bucketStart.setDate(
          1 + index * 7
        );

        const bucketEnd = new Date(
          bucketStart
        );
        bucketEnd.setDate(
          bucketStart.getDate() + 7
        );

        const items =
          currentRangeSessions.filter(
            (session) =>
              session._date >= bucketStart &&
              session._date < bucketEnd
          );

        return {
          label: `Week ${index + 1}`,
          value: average(
            items.map(
              (session) => session._focus
            )
          ),
        };
      }
    );
  }, [
    currentRangeSessions,
    range,
  ]);

  /* ---------------------------------------------------------------------- */
  /* Activity breakdown                                                      */
  /* ---------------------------------------------------------------------- */

  const activityData = useMemo(() => {
    const data = [
      {
        key: "focused",
        seconds: currentStats.focusedSeconds,
      },
      {
        key: "distracted",
        seconds:
          currentStats.distractionSeconds,
      },
      {
        key: "break",
        seconds: currentStats.breakSeconds,
      },
      {
        key: "phone",
        seconds: currentStats.phoneSeconds,
      },
      {
        key: "away",
        seconds: currentStats.awaySeconds,
      },
      {
        key: "drowsy",
        seconds: currentStats.drowsySeconds,
      },
    ];

    return data.filter(
      (item) => item.seconds > 0
    );
  }, [currentStats]);

  const activityTotal = useMemo(
    () =>
      activityData.reduce(
        (sum, item) =>
          sum + item.seconds,
        0
      ),
    [activityData]
  );

  /* ---------------------------------------------------------------------- */
  /* Performance                                                             */
  /* ---------------------------------------------------------------------- */

  const bestSession = useMemo(() => {
    if (!currentRangeSessions.length) {
      return null;
    }

    return [...currentRangeSessions].sort(
      (a, b) => b._focus - a._focus
    )[0];
  }, [currentRangeSessions]);

  const longestSession = useMemo(() => {
    if (!currentRangeSessions.length) {
      return null;
    }

    return [...currentRangeSessions].sort(
      (a, b) =>
        b._duration - a._duration
    )[0];
  }, [currentRangeSessions]);

  const bestStudyPeriod = useMemo(() => {
    if (!currentRangeSessions.length) {
      return null;
    }

    const periods = new Map();

    currentRangeSessions.forEach(
      (session) => {
        const hour = session._date.getHours();

        const current =
          periods.get(hour) || {
            total: 0,
            count: 0,
          };

        current.total += session._focus;
        current.count += 1;

        periods.set(hour, current);
      }
    );

    let best = null;

    periods.forEach((value, hour) => {
      const score =
        value.total / value.count;

      if (!best || score > best.score) {
        best = {
          hour,
          score,
        };
      }
    });

    return best;
  }, [currentRangeSessions]);

  const insightList = useMemo(() => {
    if (!currentRangeSessions.length) {
      return [];
    }

    const insights = [];

    if (currentStats.focusScore >= 85) {
      insights.push({
        icon: CheckCircle2,
        tone: "success",
        title: "Strong focus pattern",
        message:
          "Your recent sessions show consistently strong attention.",
      });
    } else if (currentStats.focusScore >= 70) {
      insights.push({
        icon: Target,
        tone: "info",
        title: "Good progress",
        message:
          "Your focus is moving in a healthy direction. Small improvements can make your sessions even stronger.",
      });
    } else {
      insights.push({
        icon: Lightbulb,
        tone: "warning",
        title: "Focus needs attention",
        message:
          "Try shorter focused blocks and planned breaks to reduce attention drops.",
      });
    }

    if (
      currentStats.distractionSeconds >
      currentStats.focusedSeconds * 0.35
    ) {
      insights.push({
        icon: Activity,
        tone: "warning",
        title: "Distraction is taking time",
        message:
          "A noticeable part of your study time is being lost to distractions.",
      });
    }

    if (
      currentStats.phoneSeconds >
      currentStats.totalSeconds * 0.1
    ) {
      insights.push({
        icon: Smartphone,
        tone: "danger",
        title: "Phone usage detected",
        message:
          "Keeping your phone farther away during focused blocks may improve concentration.",
      });
    }

    if (bestStudyPeriod) {
      insights.push({
        icon: Flame,
        tone: "accent",
        title: "Your strongest study period",
        message: `Your highest average focus appears around ${getHourLabel(
          bestStudyPeriod.hour
        )}.`,
      });
    }

    if (
      currentStats.totalSeconds >
        previousStats.totalSeconds &&
      previousStats.totalSeconds > 0
    ) {
      insights.push({
        icon: TrendingUp,
        tone: "success",
        title: "Study consistency improved",
        message:
          "You have spent more time studying in this period than the previous one.",
      });
    }

    return insights.slice(0, 4);
  }, [
    currentRangeSessions.length,
    currentStats,
    bestStudyPeriod,
    previousStats.totalSeconds,
  ]);

  const hasData =
    currentRangeSessions.length > 0;

  const pageTitle = useMemo(() => {
    if (range === "daily") {
      return "Today's Analytics";
    }

    if (range === "monthly") {
      return "Monthly Analytics";
    }

    return "Weekly Analytics";
  }, [range]);

  if (isLoading) {
    return (
      <PageTransition>
        <div className="analytics-page analytics-page--loading">
          <div className="analytics-loading-orb">
            <div className="analytics-loading-ring" />
            <Brain size={30} />
          </div>

          <h2>Preparing your analytics</h2>
          <p>
            Reading your saved study sessions...
          </p>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <main className="analytics-page">
        <div className="analytics-background">
          <span className="analytics-orb analytics-orb--one" />
          <span className="analytics-orb analytics-orb--two" />
          <span className="analytics-orb analytics-orb--three" />
          <span className="analytics-grid" />
        </div>

        <div className="analytics-container">
          {/* -------------------------------------------------------------- */}
          {/* Header                                                         */}
          {/* -------------------------------------------------------------- */}

          <header className="analytics-header">
            <div className="analytics-heading">
              <div className="analytics-heading-icon">
                <BarChart3 size={23} />
              </div>

              <div>
                <div className="analytics-eyebrow">
                  <span className="analytics-eyebrow-dot" />
                  Focus Intelligence
                </div>

                <h1>{pageTitle}</h1>

                <p>
                  Understand your study patterns,
                  focus quality and time usage.
                </p>
              </div>
            </div>

            <div className="analytics-header-actions">
              <Badge
                variant="ai"
                icon={<Brain size={14} />}
                showIcon
              >
                AI Insights
              </Badge>

              <button
                type="button"
                className="analytics-refresh-button"
                onClick={() =>
                  loadSessions(true)
                }
                disabled={isRefreshing}
                aria-label="Refresh analytics"
                title="Refresh analytics"
              >
                <RefreshCw
                  size={17}
                  className={
                    isRefreshing
                      ? "is-spinning"
                      : ""
                  }
                />
              </button>
            </div>
          </header>

          {/* -------------------------------------------------------------- */}
          {/* Range selector                                                  */}
          {/* -------------------------------------------------------------- */}

          <section className="analytics-toolbar">
            <div className="analytics-range">
              <CalendarDays size={17} />

              <span>View period</span>

              <div className="analytics-range-buttons">
                {RANGE_OPTIONS.map(
                  (option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={
                        range === option.value
                          ? "is-active"
                          : ""
                      }
                      onClick={() =>
                        setRange(option.value)
                      }
                    >
                      <span className="analytics-range-full">
                        {option.label}
                      </span>

                      <span className="analytics-range-short">
                        {option.shortLabel}
                      </span>
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="analytics-period-info">
              <span>
                {formatDate(
                  getRangeStart(range)
                )}
              </span>
              <ChevronDown size={14} />
              <span>
                {range === "daily"
                  ? formatDate(new Date())
                  : "Current period"}
              </span>
            </div>
          </section>

          {error && (
            <div className="analytics-error">
              <Info size={17} />
              <span>{error}</span>

              <button
                type="button"
                onClick={() =>
                  loadSessions(true)
                }
              >
                Try again
              </button>
            </div>
          )}

          {!hasData ? (
            <section className="analytics-empty">
              <EmptyState
                iconKey="analytics"
                variant="info"
                title="Your analytics are waiting"
                description="Complete your first study session and DAILY GOAL will start building your focus analytics automatically."
              />
            </section>
          ) : (
            <>
              {/* ---------------------------------------------------------- */}
              {/* KPI cards                                                   */}
              {/* ---------------------------------------------------------- */}

              <section className="analytics-metrics">
                <MetricCard
                  icon={Target}
                  label="Focus Score"
                  value={Math.round(
                    currentStats.focusScore
                  )}
                  unit="/100"
                  trend={focusTrend}
                  description={getStatusLabel(
                    currentStats.focusScore
                  )}
                  index={0}
                />

                <MetricCard
                  icon={Clock3}
                  label="Study Time"
                  value={formatDuration(
                    currentStats.totalSeconds
                  )}
                  trend={studyTimeTrend}
                  description={`${currentStats.sessionCount} completed session${
                    currentStats.sessionCount ===
                    1
                      ? ""
                      : "s"
                  }`}
                  index={1}
                />

                <MetricCard
                  icon={Brain}
                  label="Focused Time"
                  value={formatDuration(
                    currentStats.focusedSeconds
                  )}
                  trend={getTrend(
                    currentStats.focusedSeconds,
                    previousStats.focusedSeconds
                  )}
                  description={
                    currentStats.totalSeconds
                      ? `${Math.round(
                          (currentStats.focusedSeconds /
                            currentStats.totalSeconds) *
                            100
                        )}% of study time`
                      : "No focus time yet"
                  }
                  index={2}
                />

                <MetricCard
                  icon={Smartphone}
                  label="Phone Time"
                  value={formatDuration(
                    currentStats.phoneSeconds
                  )}
                  trend={phoneTrend}
                  description="Detected during sessions"
                  index={3}
                />
              </section>

              {/* ---------------------------------------------------------- */}
              {/* Main analytics grid                                         */}
              {/* ---------------------------------------------------------- */}

              <section className="analytics-main-grid">
                <article className="analytics-panel analytics-focus-panel">
                  <div className="analytics-panel-header">
                    <div>
                      <span className="analytics-panel-kicker">
                        Performance trend
                      </span>

                      <h2>Focus Score</h2>

                      <p>
                        How your concentration changed
                        throughout this period.
                      </p>
                    </div>

                    <div className="analytics-panel-score">
                      <ProgressRing
                        value={
                          currentStats.focusScore
                        }
                        max={100}
                        variant={
                          getStatus(
                            currentStats.focusScore
                          ) === "excellent"
                            ? "success"
                            : getStatus(
                                currentStats.focusScore
                              ) === "good"
                            ? "accent"
                            : getStatus(
                                currentStats.focusScore
                              ) ===
                              "needs_attention"
                            ? "warning"
                            : "danger"
                        }
                        size="sm"
                        showPercentage
                        glow
                        animated
                        label="Focus"
                      />
                    </div>
                  </div>

                  <FocusChart
                    data={focusChartData}
                  />
                </article>

                <article className="analytics-panel analytics-breakdown-panel">
                  <div className="analytics-panel-header">
                    <div>
                      <span className="analytics-panel-kicker">
                        Time allocation
                      </span>

                      <h2>Activity Breakdown</h2>

                      <p>
                        Where your monitored time was
                        spent.
                      </p>
                    </div>

                    <div className="analytics-panel-header-icon">
                      <Activity size={19} />
                    </div>
                  </div>

                  <ActivityBreakdown
                    activities={
                      activityData
                    }
                    totalSeconds={
                      activityTotal ||
                      currentStats.totalSeconds
                    }
                  />
                </article>
              </section>

              {/* ---------------------------------------------------------- */}
              {/* Performance + insights                                      */}
              {/* ---------------------------------------------------------- */}

              <section className="analytics-secondary-grid">
                <article className="analytics-panel analytics-performance-panel">
                  <div className="analytics-panel-header">
                    <div>
                      <span className="analytics-panel-kicker">
                        Session quality
                      </span>

                      <h2>Performance Highlights</h2>

                      <p>
                        Your strongest moments from
                        this period.
                      </p>
                    </div>

                    <div className="analytics-panel-header-icon">
                      <Flame size={19} />
                    </div>
                  </div>

                  <div className="analytics-performance-list">
                    <PerformanceCard
                      icon={Target}
                      label="Best Focus Score"
                      value={
                        bestSession
                          ? `${Math.round(
                              bestSession._focus
                            )}/100`
                          : "—"
                      }
                      secondary={
                        bestSession
                          ? formatDate(
                              bestSession._date
                            )
                          : null
                      }
                      positive={
                        bestSession
                          ? bestSession._focus >=
                            currentStats.focusScore
                          : null
                      }
                    />

                    <PerformanceCard
                      icon={Clock3}
                      label="Longest Session"
                      value={
                        longestSession
                          ? formatDuration(
                              longestSession._duration
                            )
                          : "—"
                      }
                      secondary={
                        longestSession
                          ? formatDate(
                              longestSession._date
                            )
                          : null
                      }
                    />

                    <PerformanceCard
                      icon={Brain}
                      label="Average Focus"
                      value={`${Math.round(
                        currentStats.focusScore
                      )}/100`}
                      secondary={getStatusLabel(
                        currentStats.focusScore
                      )}
                      positive={
                        currentStats.focusScore >=
                        previousStats.focusScore
                      }
                    />

                    <PerformanceCard
                      icon={CalendarDays}
                      label="Sessions Completed"
                      value={
                        currentStats.sessionCount
                      }
                      secondary={`${formatDuration(
                        currentStats.totalSeconds
                      )} total`}
                    />
                  </div>
                </article>

                <article className="analytics-panel analytics-insights-panel">
                  <div className="analytics-panel-header">
                    <div>
                      <span className="analytics-panel-kicker">
                        Smart analysis
                      </span>

                      <h2>AI Insights</h2>

                      <p>
                        Personal observations based
                        on your saved activity.
                      </p>
                    </div>

                    <Badge
                      variant="ai"
                      size="sm"
                      icon={
                        <Brain size={13} />
                      }
                      showIcon
                    >
                      Local AI
                    </Badge>
                  </div>

                  <div className="analytics-insights-list">
                    {insightList.length ? (
                      insightList.map(
                        (insight, index) => {
                          const Icon =
                            insight.icon;

                          return (
                            <div
                              className={`analytics-insight analytics-insight--${insight.tone}`}
                              key={`${insight.title}-${index}`}
                              style={{
                                "--analytics-delay": `${
                                  index * 90
                                }ms`,
                              }}
                            >
                              <div className="analytics-insight-icon">
                                <Icon size={17} />
                              </div>

                              <div>
                                <strong>
                                  {insight.title}
                                </strong>
                                <p>
                                  {insight.message}
                                </p>
                              </div>
                            </div>
                          );
                        }
                      )
                    ) : (
                      <EmptyState
                        compact
                        iconKey="sparkles"
                        title="Insights will appear here"
                        description="Keep studying to give DAILY GOAL enough activity to identify useful patterns."
                      />
                    )}
                  </div>
                </article>
              </section>

              {/* ---------------------------------------------------------- */}
              {/* Bottom summary                                               */}
              {/* ---------------------------------------------------------- */}

              <section className="analytics-summary">
                <div className="analytics-summary-icon">
                  <Zap size={21} />
                </div>

                <div className="analytics-summary-content">
                  <span>Your current performance</span>

                  <strong>
                    {getStatusLabel(
                      currentStats.focusScore
                    )}
                  </strong>

                  <p>
                    You averaged{" "}
                    <b>
                      {Math.round(
                        currentStats.focusScore
                      )}/100
                    </b>{" "}
                    focus across{" "}
                    <b>
                      {currentStats.sessionCount}
                    </b>{" "}
                    session
                    {currentStats.sessionCount ===
                    1
                      ? ""
                      : "s"}
                    .
                    {bestStudyPeriod && (
                      <>
                        {" "}
                        Your strongest period was
                        around{" "}
                        <b>
                          {getHourLabel(
                            bestStudyPeriod.hour
                          )}
                        </b>
                        .
                      </>
                    )}
                  </p>
                </div>

                <div className="analytics-summary-progress">
                  <div className="analytics-summary-progress-track">
                    <span
                      style={{
                        width: `${clamp(
                          currentStats.focusScore
                        )}%`,
                      }}
                    />
                  </div>

                  <span>
                    {Math.round(
                      currentStats.focusScore
                    )}
                  </span>
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </PageTransition>
  );
};

export default Analytics;