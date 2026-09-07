import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Activity,
  BarChart3,
  CalendarDays,
  ChevronDown,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import "./FocusChart.css";

const EMPTY_DATA = [];

const DEFAULT_CONFIG = {
  width: 900,
  height: 320,
  padding: {
    top: 28,
    right: 28,
    bottom: 48,
    left: 48,
  },
  minScore: 0,
  maxScore: 100,
};

const PERIOD_OPTIONS = [
  { value: "hourly", label: "Hourly" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const clamp = (value, min, max) =>
  Math.min(max, Math.max(min, value));

const safeNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const formatValue = (value) => {
  const number = safeNumber(value);
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
};

const getLabel = (item, index) =>
  item?.label ??
  item?.name ??
  item?.time ??
  item?.date ??
  `Point ${index + 1}`;

const getScore = (item) =>
  clamp(
    safeNumber(
      item?.score ??
        item?.value ??
        item?.focusScore ??
        item?.focus ??
        0
    ),
    DEFAULT_CONFIG.minScore,
    DEFAULT_CONFIG.maxScore
  );

const getStatus = (score) => {
  if (score >= 90) return "excellent";
  if (score >= 75) return "good";
  if (score >= 60) return "needs-attention";
  return "low";
};

const getStatusLabel = (status) => {
  const labels = {
    excellent: "Excellent",
    good: "Good",
    "needs-attention": "Needs Attention",
    low: "Low Focus",
  };

  return labels[status] ?? "Focus";
};

const buildSmoothPath = (points) => {
  if (!points.length) return "";

  if (points.length === 1) {
    const point = points[0];

    return `M ${point.x} ${point.y}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];

    const controlPointX = (current.x + next.x) / 2;

    path += `
      C
      ${controlPointX} ${current.y},
      ${controlPointX} ${next.y},
      ${next.x} ${next.y}
    `;
  }

  return path;
};

const buildAreaPath = (linePath, points, baselineY) => {
  if (!linePath || !points.length) return "";

  const first = points[0];
  const last = points[points.length - 1];

  return `
    ${linePath}
    L ${last.x} ${baselineY}
    L ${first.x} ${baselineY}
    Z
  `;
};

const AnimatedCounter = ({ value, duration = 700 }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const animationRef = useRef(null);

  useEffect(() => {
    const target = safeNumber(value);

    cancelAnimationFrame(animationRef.current);

    const startTime = performance.now();

    const animate = (currentTime) => {
      const progress = clamp(
        (currentTime - startTime) / duration,
        0,
        1
      );

      const eased =
        1 - Math.pow(1 - progress, 3);

      setDisplayValue(target * eased);

      if (progress < 1) {
        animationRef.current =
          requestAnimationFrame(animate);
      }
    };

    animationRef.current =
      requestAnimationFrame(animate);

    return () =>
      cancelAnimationFrame(animationRef.current);
  }, [value, duration]);

  return <>{formatValue(displayValue)}</>;
};

const FocusChart = ({
  data = EMPTY_DATA,
  chartData,
  period = "daily",
  onPeriodChange,
  title = "Focus Performance",
  subtitle = "Track how your focus changes over time.",
  height = DEFAULT_CONFIG.height,
  showHeader = true,
  showLegend = true,
  showAverage = true,
  showGrid = true,
  showPoints = true,
  showTooltip = true,
  showPeriodSelector = true,
  animated = true,
  emptyMessage = "Start a study session to see your focus trend.",
  className = "",
  score = 0,
}) => {
  const svgRef = useRef(null);

  const [selectedPeriod, setSelectedPeriod] =
    useState(period);

  const [activeIndex, setActiveIndex] =
    useState(null);

  const [isVisible, setIsVisible] =
    useState(false);

  const [isMounted, setIsMounted] =
    useState(false);

  const sourceData = chartData ?? data;
  const liveScore = safeNumber(score);

  useEffect(() => {
    setSelectedPeriod(period);
  }, [period]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsMounted(true);
    }, 40);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const element = svgRef.current;

    if (!element || typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.15,
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const normalizedData = useMemo(() => {
    if (!Array.isArray(sourceData)) {
      return [];
    }

    return sourceData
      .map((item, index) => ({
        ...item,
        label: getLabel(item, index),
        score: getScore(item),
        originalIndex: index,
      }))
      .filter(Boolean);
  }, [sourceData]);

  const averageScore = useMemo(() => {
    if (!normalizedData.length) return 0;

    const total = normalizedData.reduce(
      (sum, item) => sum + item.score,
      0
    );

    return total / normalizedData.length;
  }, [normalizedData]);

  const highestScore = useMemo(() => {
    if (!normalizedData.length) return 0;

    return Math.max(
      ...normalizedData.map((item) => item.score)
    );
  }, [normalizedData]);

  const lowestScore = useMemo(() => {
    if (!normalizedData.length) return 0;

    return Math.min(
      ...normalizedData.map((item) => item.score)
    );
  }, [normalizedData]);

  const trend = useMemo(() => {
    if (normalizedData.length < 2) {
      return {
        value: 0,
        direction: "neutral",
      };
    }

    const midpoint = Math.floor(
      normalizedData.length / 2
    );

    const firstHalf = normalizedData.slice(0, midpoint);
    const secondHalf = normalizedData.slice(midpoint);

    if (!firstHalf.length || !secondHalf.length) {
      return {
        value: 0,
        direction: "neutral",
      };
    }

    const firstAverage =
      firstHalf.reduce(
        (sum, item) => sum + item.score,
        0
      ) / firstHalf.length;

    const secondAverage =
      secondHalf.reduce(
        (sum, item) => sum + item.score,
        0
      ) / secondHalf.length;

    const difference =
      secondAverage - firstAverage;

    return {
      value: difference,
      direction:
        difference > 0.5
          ? "up"
          : difference < -0.5
            ? "down"
            : "neutral",
    };
  }, [normalizedData]);

  const config = useMemo(() => {
    const width = DEFAULT_CONFIG.width;
    const chartHeight = height;

    const padding = DEFAULT_CONFIG.padding;

    const innerWidth =
      width - padding.left - padding.right;

    const innerHeight =
      chartHeight -
      padding.top -
      padding.bottom;

    return {
      width,
      height: chartHeight,
      padding,
      innerWidth,
      innerHeight,
      baselineY:
        padding.top + innerHeight,
    };
  }, [height]);

  const points = useMemo(() => {
    if (!normalizedData.length) return [];

    const {
      padding,
      innerWidth,
      innerHeight,
    } = config;

    const denominator =
      Math.max(normalizedData.length - 1, 1);

    return normalizedData.map((item, index) => {
      const x =
        normalizedData.length === 1
          ? padding.left + innerWidth / 2
          : padding.left +
            (index / denominator) * innerWidth;

      const scoreRatio =
        (item.score - DEFAULT_CONFIG.minScore) /
        (DEFAULT_CONFIG.maxScore -
          DEFAULT_CONFIG.minScore);

      const y =
        padding.top +
        innerHeight -
        scoreRatio * innerHeight;

      return {
        ...item,
        x,
        y,
      };
    });
  }, [normalizedData, config]);

  const linePath = useMemo(
    () => buildSmoothPath(points),
    [points]
  );

  const areaPath = useMemo(
    () =>
      buildAreaPath(
        linePath,
        points,
        config.baselineY
      ),
    [linePath, points, config.baselineY]
  );

  const averageY = useMemo(() => {
    const ratio =
      (averageScore - DEFAULT_CONFIG.minScore) /
      (DEFAULT_CONFIG.maxScore -
        DEFAULT_CONFIG.minScore);

    return (
      config.padding.top +
      config.innerHeight -
      ratio * config.innerHeight
    );
  }, [
    averageScore,
    config.padding.top,
    config.innerHeight,
  ]);

  const handlePeriodChange = useCallback(
    (event) => {
      const nextPeriod = event.target.value;

      setSelectedPeriod(nextPeriod);

      if (typeof onPeriodChange === "function") {
        onPeriodChange(nextPeriod);
      }
    },
    [onPeriodChange]
  );

  const handlePointEnter = useCallback(
    (index) => {
      if (showTooltip) {
        setActiveIndex(index);
      }
    },
    [showTooltip]
  );

  const handlePointLeave = useCallback(() => {
    setActiveIndex(null);
  }, []);

  const handleKeyDown = useCallback(
    (event, index) => {
      if (
        event.key === "Enter" ||
        event.key === " "
      ) {
        event.preventDefault();
        setActiveIndex(index);
      }

      if (event.key === "Escape") {
        setActiveIndex(null);
      }
    },
    []
  );

  const activePoint =
    activeIndex !== null
      ? points[activeIndex]
      : null;

  const selectedStatus = activePoint
    ? getStatus(activePoint.score)
    : null;

  const containerClasses = [
    "focus-chart",
    isMounted ? "focus-chart--mounted" : "",
    isVisible ? "focus-chart--visible" : "",
    animated ? "focus-chart--animated" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (!normalizedData.length) {
    return (
      <section className={containerClasses}>
        {showHeader && (
          <header className="focus-chart__header">
            <div className="focus-chart__heading">
              <div className="focus-chart__icon">
                <BarChart3 size={19} />
              </div>

              <div>
                <h2>{title}</h2>
                <p>{subtitle}</p>
              </div>
            </div>

            {showPeriodSelector && (
              <label className="focus-chart__period">
                <CalendarDays size={15} />

                <select
                  value={selectedPeriod}
                  onChange={handlePeriodChange}
                  aria-label="Focus chart period"
                >
                  {PERIOD_OPTIONS.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>

                <ChevronDown size={15} />
              </label>
            )}
          </header>
        )}

        <div className="focus-chart__empty">
          <div className="focus-chart__empty-orbit">
            <div className="focus-chart__empty-icon">
              <Activity size={27} />
            </div>
          </div>

          <div className="focus-chart__empty-copy">
            <span className="focus-chart__empty-kicker">FOCUS INTELLIGENCE</span>
            <h3>No focus data yet</h3>
            <p>{emptyMessage}</p>
            <div className="focus-chart__empty-steps">
              <span><b>01</b> Start a study session</span>
              <span><b>02</b> Let AI observe your focus</span>
              <span><b>03</b> Return here for your trend</span>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={containerClasses}>
      {showHeader && (
        <header className="focus-chart__header">
          <div className="focus-chart__heading">
            <div className="focus-chart__icon">
              <BarChart3 size={19} />
            </div>

            <div>
              <div className="focus-chart__title-row">
                <h2>{title}</h2>

                <span className="focus-chart__live-dot">
                  <span />
                  LIVE DATA
                </span>
              </div>

              <p>{subtitle}</p>
            </div>
          </div>

          <div className="focus-chart__header-actions">
            <div className="focus-chart__trend">
              <span className="focus-chart__trend-icon">
                <TrendingUp size={14} />
              </span>

              <span>
                {trend.direction === "up"
                  ? "+"
                  : ""}
                {formatValue(trend.value)}%
              </span>
            </div>

            {showPeriodSelector && (
              <label className="focus-chart__period">
                <CalendarDays size={15} />

                <select
                  value={selectedPeriod}
                  onChange={handlePeriodChange}
                  aria-label="Focus chart period"
                >
                  {PERIOD_OPTIONS.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>

                <ChevronDown size={15} />
              </label>
            )}
          </div>
        </header>
      )}

      <div className="focus-chart__summary">
        <div className="focus-chart__summary-main">
          <span className="focus-chart__summary-label">
            Average Focus
          </span>

          <strong>
            <AnimatedCounter value={averageScore} />
            <small>/100</small>
          </strong>
        </div>

        <div className="focus-chart__summary-items">
          <div className="focus-chart__summary-item">
            <span>Peak</span>
            <strong>
              <AnimatedCounter value={highestScore} />
            </strong>
          </div>

          <div className="focus-chart__summary-divider" />

          <div className="focus-chart__summary-item">
            <span>Lowest</span>
            <strong>
              <AnimatedCounter value={lowestScore} />
            </strong>
          </div>

          <div className="focus-chart__summary-divider" />

          <div className="focus-chart__summary-item">
            <span>Data Points</span>
            <strong>{normalizedData.length}</strong>
          </div>
        </div>
      </div>

      <div className="focus-chart__visual">
        <div className="focus-chart__y-labels">
          {[100, 75, 50, 25, 0].map(
            (value) => (
              <span key={value}>
                {value}
              </span>
            )
          )}
        </div>

        <div className="focus-chart__svg-wrap">
          <svg
            ref={svgRef}
            className="focus-chart__svg"
            viewBox={`0 0 ${config.width} ${config.height}`}
            preserveAspectRatio="none"
            role="img"
            aria-label="Focus score trend chart"
          >
            <defs>
              <linearGradient
                id="focusChartAreaGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  className="focus-chart__gradient-start"
                />

                <stop
                  offset="100%"
                  className="focus-chart__gradient-end"
                />
              </linearGradient>

              <linearGradient
                id="focusChartLineGradient"
                x1="0"
                y1="0"
                x2="1"
                y2="0"
              >
                <stop
                  offset="0%"
                  className="focus-chart__line-start"
                />

                <stop
                  offset="100%"
                  className="focus-chart__line-end"
                />
              </linearGradient>

              <filter
                id="focusChartGlow"
                x="-50%"
                y="-50%"
                width="200%"
                height="200%"
              >
                <feGaussianBlur
                  stdDeviation="4"
                  result="blur"
                />

                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <clipPath id="focusChartClip">
                <rect
                  x={config.padding.left}
                  y={config.padding.top}
                  width={config.innerWidth}
                  height={config.innerHeight}
                  rx="12"
                />
              </clipPath>
            </defs>

            {showGrid && (
              <g className="focus-chart__grid">
                {[0, 25, 50, 75, 100].map(
                  (value) => {
                    const ratio =
                      (value -
                        DEFAULT_CONFIG.minScore) /
                      (DEFAULT_CONFIG.maxScore -
                        DEFAULT_CONFIG.minScore);

                    const y =
                      config.padding.top +
                      config.innerHeight -
                      ratio *
                        config.innerHeight;

                    return (
                      <line
                        key={value}
                        x1={config.padding.left}
                        y1={y}
                        x2={
                          config.width -
                          config.padding.right
                        }
                        y2={y}
                      />
                    );
                  }
                )}

                {points.map((point, index) => (
                  <line
                    key={`vertical-${index}`}
                    x1={point.x}
                    y1={config.padding.top}
                    x2={point.x}
                    y2={config.baselineY}
                    className="focus-chart__vertical-grid"
                  />
                ))}
              </g>
            )}

            {showAverage && (
              <g
                className="focus-chart__average"
                style={{
                  opacity: isVisible ? 1 : 0,
                }}
              >
                <line
                  x1={config.padding.left}
                  y1={averageY}
                  x2={
                    config.width -
                    config.padding.right
                  }
                  y2={averageY}
                />

                <text
                  x={
                    config.width -
                    config.padding.right -
                    4
                  }
                  y={averageY - 8}
                  textAnchor="end"
                >
                  AVG {formatValue(averageScore)}
                </text>
              </g>
            )}

            <g clipPath="url(#focusChartClip)">
              {areaPath && (
                <path
                  className="focus-chart__area"
                  d={areaPath}
                />
              )}

              {linePath && (
                <>
                  <path
                    className="focus-chart__line-glow"
                    d={linePath}
                    filter="url(#focusChartGlow)"
                  />

                  <path
                    className="focus-chart__line"
                    d={linePath}
                  />
                </>
              )}
            </g>

            {showPoints &&
              points.map((point, index) => {
                const isActive =
                  activeIndex === index;

                return (
                  <g
                    key={`${point.label}-${index}`}
                    className={`focus-chart__point-group ${
                      isActive
                        ? "is-active"
                        : ""
                    }`}
                    tabIndex={0}
                    role="button"
                    aria-label={`${point.label}: ${formatValue(
                      point.score
                    )} focus score`}
                    onMouseEnter={() =>
                      handlePointEnter(index)
                    }
                    onMouseLeave={
                      handlePointLeave
                    }
                    onFocus={() =>
                      handlePointEnter(index)
                    }
                    onBlur={
                      handlePointLeave
                    }
                    onKeyDown={(event) =>
                      handleKeyDown(
                        event,
                        index
                      )
                    }
                  >
                    <circle
                      className="focus-chart__point-hit"
                      cx={point.x}
                      cy={point.y}
                      r="20"
                    />

                    <circle
                      className="focus-chart__point-pulse"
                      cx={point.x}
                      cy={point.y}
                      r={
                        isActive ? "11" : "7"
                      }
                    />

                    <circle
                      className="focus-chart__point"
                      cx={point.x}
                      cy={point.y}
                      r={
                        isActive ? "5.5" : "4"
                      }
                    />
                  </g>
                );
              })}

            {activePoint && showTooltip && (
              <g className="focus-chart__tooltip">
                <line
                  x1={activePoint.x}
                  y1={config.padding.top}
                  x2={activePoint.x}
                  y2={config.baselineY}
                  className="focus-chart__tooltip-line"
                />

                <g
                  transform={`translate(
                    ${clamp(
                      activePoint.x - 66,
                      config.padding.left,
                      config.width -
                        config.padding.right -
                        132
                    )}
                    ${Math.max(
                      8,
                      activePoint.y - 78
                    )}
                  )`}
                >
                  <rect
                    width="132"
                    height="62"
                    rx="12"
                    className="focus-chart__tooltip-box"
                  />

                  <text
                    x="12"
                    y="20"
                    className="focus-chart__tooltip-label"
                  >
                    {activePoint.label}
                  </text>

                  <text
                    x="12"
                    y="44"
                    className="focus-chart__tooltip-value"
                  >
                    {formatValue(
                      activePoint.score
                    )}
                    <tspan className="focus-chart__tooltip-unit">
                      {" "}
                      / 100
                    </tspan>
                  </text>
                </g>
              </g>
            )}
          </svg>

          <div className="focus-chart__x-labels">
            {points.map((point, index) => (
              <button
                type="button"
                key={`label-${index}`}
                className={
                  activeIndex === index
                    ? "is-active"
                    : ""
                }
                onMouseEnter={() =>
                  handlePointEnter(index)
                }
                onMouseLeave={
                  handlePointLeave
                }
                onFocus={() =>
                  handlePointEnter(index)
                }
                onBlur={
                  handlePointLeave
                }
                title={`${point.label}: ${formatValue(
                  point.score
                )}`}
              >
                {point.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showLegend && (
        <footer className="focus-chart__footer">
          <div className="focus-chart__legend">
            <span className="focus-chart__legend-line" />
            <span>Focus Score</span>

            {showAverage && (
              <>
                <span className="focus-chart__legend-average" />
                <span>Average</span>
              </>
            )}
          </div>

          <div className="focus-chart__insight">
            <Sparkles size={14} />

            <span>
              {trend.direction === "up"
                ? "Your focus is trending upward."
                : trend.direction === "down"
                  ? "Your focus has room to improve."
                  : "Your focus is staying consistent."}
            </span>

            {activePoint && (
              <strong>
                {getStatusLabel(
                  selectedStatus
                )}
              </strong>
            )}
          </div>
        </footer>
      )}
    </section>
  );
};

export default FocusChart;