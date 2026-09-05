import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  AlertTriangle,
  Award,
  BarChart3,
  Brain,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileText,
  Lightbulb,
  Phone,
  RefreshCw,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";

import PageTransition from "../../components/Common/PageTransition";
import Badge from "../../components/Common/Badge";
import Button from "../../components/Common/Button";
import EmptyState from "../../components/Common/EmptyState";
import ProgressRing from "../../components/Common/ProgressRing";

import {
  getSessions,
  getAlerts,
  getDailyGoal,
} from "../../services/storageService";

import "./SmartReport.css";

/* =========================================================
   HELPERS
========================================================= */

const clamp = (value, min = 0, max = 100) =>
  Math.min(max, Math.max(min, Number(value) || 0));

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const getTimestamp = (item) =>
  item?.startTime ||
  item?.startedAt ||
  item?.createdAt ||
  item?.timestamp ||
  item?.date ||
  null;

const getDuration = (session) => {
  const direct =
    session?.durationSeconds ??
    session?.duration ??
    session?.elapsedSeconds;

  const number = toNumber(direct, NaN);

  if (Number.isFinite(number)) {
    /*
     * Session storage is expected to use seconds.
     * If a very small value is supplied as minutes,
     * the existing numeric value is still respected.
     */
    return Math.max(0, number);
  }

  const start =
    session?.startTime ||
    session?.startedAt;

  const end =
    session?.endTime ||
    session?.endedAt ||
    session?.completedAt;

  if (start && end) {
    const diff =
      new Date(end).getTime() -
      new Date(start).getTime();

    return Math.max(0, Math.floor(diff / 1000));
  }

  return 0;
};

const getFocusedSeconds = (session) => {
  const value =
    session?.focusedSeconds ??
    session?.focusTimeSeconds ??
    session?.focusedTime ??
    session?.focusTime ??
    session?.focusDurationSeconds;

  return Math.max(0, toNumber(value));
};

const getDistractionSeconds = (session) => {
  const value =
    session?.distractionSeconds ??
    session?.distractedSeconds ??
    session?.distractionTime ??
    session?.distractionDurationSeconds;

  return Math.max(0, toNumber(value));
};

const getPhoneSeconds = (session) => {
  const value =
    session?.phoneSeconds ??
    session?.phoneUsageSeconds ??
    session?.phoneTime ??
    session?.phoneDurationSeconds;

  return Math.max(0, toNumber(value));
};

const getBreakSeconds = (session) => {
  const value =
    session?.breakSeconds ??
    session?.breakTime ??
    session?.breakDurationSeconds;

  return Math.max(0, toNumber(value));
};

const getFocusScore = (session) => {
  const score =
    session?.focusScore ??
    session?.score ??
    session?.focus ??
    0;

  return clamp(score);
};

const normalizeStatus = (status) =>
  String(status || "")
    .trim()
    .toUpperCase();

const isCompletedSession = (session) =>
  normalizeStatus(session?.status) ===
  "COMPLETED";

const formatDuration = (seconds) => {
  const safe = Math.max(
    0,
    Math.round(toNumber(seconds))
  );

  const hours = Math.floor(
    safe / 3600
  );

  const minutes = Math.floor(
    (safe % 3600) / 60
  );

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
};

const formatLongDuration = (seconds) => {
  const safe = Math.max(
    0,
    Math.round(toNumber(seconds))
  );

  const hours = Math.floor(
    safe / 3600
  );

  const minutes = Math.floor(
    (safe % 3600) / 60
  );

  const remainingSeconds =
    safe % 60;

  const parts = [];

  if (hours > 0) {
    parts.push(`${hours}h`);
  }

  if (
    minutes > 0 ||
    hours > 0
  ) {
    parts.push(`${minutes}m`);
  }

  if (
    remainingSeconds > 0 ||
    parts.length === 0
  ) {
    parts.push(
      `${remainingSeconds}s`
    );
  }

  return parts.join(" ");
};

const formatDate = (value) => {
  if (!value) return "Unknown";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(date);
};

const formatReportDate = () =>
  new Intl.DateTimeFormat(
    undefined,
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  ).format(new Date());

const getScoreStatus = (score) => {
  if (score >= 90) {
    return {
      label: "Excellent",
      tone: "success",
    };
  }

  if (score >= 75) {
    return {
      label: "Good",
      tone: "primary",
    };
  }

  if (score >= 60) {
    return {
      label: "Needs Attention",
      tone: "warning",
    };
  }

  return {
    label: "Low Focus",
    tone: "danger",
  };
};

/* =========================================================
   REPORT CARD
========================================================= */

const ReportMetric = ({
  icon: Icon,
  label,
  value,
  detail,
  tone = "primary",
  index = 0,
}) => (
  <article
    className={`smart-report__metric smart-report__metric--${tone}`}
    style={{
      "--report-index": index,
    }}
  >
    <div className="smart-report__metric-icon">
      <Icon size={20} />
    </div>

    <div className="smart-report__metric-content">
      <span>{label}</span>
      <strong>{value}</strong>

      {detail && (
        <small>{detail}</small>
      )}
    </div>
  </article>
);

/* =========================================================
   INSIGHT
========================================================= */

const InsightCard = ({
  icon: Icon,
  title,
  description,
  tone = "info",
  tag,
  index = 0,
}) => (
  <article
    className={`smart-report__insight smart-report__insight--${tone}`}
    style={{
      "--report-index": index,
    }}
  >
    <div className="smart-report__insight-icon">
      <Icon size={19} />
    </div>

    <div className="smart-report__insight-content">
      <div className="smart-report__insight-heading">
        <h3>{title}</h3>

        {tag && (
          <Badge
            variant={
              tone === "danger"
                ? "danger"
                : tone === "warning"
                  ? "warning"
                  : tone === "success"
                    ? "success"
                    : "info"
            }
            size="sm"
            soft
          >
            {tag}
          </Badge>
        )}
      </div>

      <p>{description}</p>
    </div>
  </article>
);

/* =========================================================
   ACTIVITY BAR
========================================================= */

const ActivityBar = ({
  label,
  seconds,
  total,
  icon: Icon,
  tone = "primary",
}) => {
  const percentage =
    total > 0
      ? clamp(
          (seconds / total) * 100
        )
      : 0;

  return (
    <div className="smart-report__activity">
      <div className="smart-report__activity-top">
        <span>
          <Icon size={15} />
          {label}
        </span>

        <strong>
          {formatDuration(seconds)}
        </strong>
      </div>

      <div className="smart-report__activity-track">
        <span
          className={`smart-report__activity-fill smart-report__activity-fill--${tone}`}
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>

      <span className="smart-report__activity-percent">
        {Math.round(percentage)}%
      </span>
    </div>
  );
};

/* =========================================================
   PAGE
========================================================= */

const SmartReport = () => {
  const [sessions, setSessions] =
    useState([]);

  const [alerts, setAlerts] =
    useState([]);

  const [dailyGoal, setDailyGoal] =
    useState(0);

  const [period, setPeriod] =
    useState("all");

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [generatedAt, setGeneratedAt] =
    useState(new Date());

  /* =======================================================
     LOAD DATA
  ======================================================= */

  const loadReportData =
    useCallback(() => {
      try {
        const storedSessions =
          getSessions();

        const storedAlerts =
          getAlerts();

        const storedGoal =
          getDailyGoal();

        setSessions(
          Array.isArray(
            storedSessions
          )
            ? storedSessions
            : []
        );

        setAlerts(
          Array.isArray(
            storedAlerts
          )
            ? storedAlerts
            : []
        );

        setDailyGoal(
          Math.max(
            0,
            toNumber(
              storedGoal,
              0
            )
          )
        );

        setGeneratedAt(
          new Date()
        );
      } catch (error) {
        console.error(
          "Unable to generate Smart Report:",
          error
        );

        setSessions([]);
        setAlerts([]);
      }
    }, []);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  /* =======================================================
     PERIOD FILTER
  ======================================================= */

  const filteredSessions =
    useMemo(() => {
      if (period === "all") {
        return sessions;
      }

      const now = new Date();

      const start = new Date(now);

      if (period === "today") {
        start.setHours(
          0,
          0,
          0,
          0
        );
      }

      if (period === "week") {
        start.setDate(
          now.getDate() - 7
        );
      }

      if (period === "month") {
        start.setDate(
          now.getDate() - 30
        );
      }

      return sessions.filter(
        (session) => {
          const timestamp =
            getTimestamp(session);

          if (!timestamp) {
            return false;
          }

          const date =
            new Date(timestamp);

          return (
            !Number.isNaN(
              date.getTime()
            ) &&
            date >= start
          );
        }
      );
    }, [sessions, period]);

  /* =======================================================
     REPORT CALCULATIONS
  ======================================================= */

  const report = useMemo(() => {
    const completed =
      filteredSessions.filter(
        isCompletedSession
      );

    const source =
      completed.length > 0
        ? completed
        : filteredSessions;

    const studySeconds =
      source.reduce(
        (total, session) =>
          total +
          getDuration(session),
        0
      );

    const focusedSeconds =
      source.reduce(
        (total, session) =>
          total +
          getFocusedSeconds(
            session
          ),
        0
      );

    const distractionSeconds =
      source.reduce(
        (total, session) =>
          total +
          getDistractionSeconds(
            session
          ),
        0
      );

    const phoneSeconds =
      source.reduce(
        (total, session) =>
          total +
          getPhoneSeconds(
            session
          ),
        0
      );

    const breakSeconds =
      source.reduce(
        (total, session) =>
          total +
          getBreakSeconds(
            session
          ),
        0
      );

    const scores = source
      .map(getFocusScore)
      .filter(
        (score) =>
          Number.isFinite(score) &&
          score > 0
      );

    const averageFocus =
      scores.length > 0
        ? Math.round(
            scores.reduce(
              (sum, score) =>
                sum + score,
              0
            ) / scores.length
          )
        : 0;

    const focusRatio =
      studySeconds > 0
        ? clamp(
            (focusedSeconds /
              studySeconds) *
              100
          )
        : 0;

    const distractionRatio =
      studySeconds > 0
        ? clamp(
            (distractionSeconds /
              studySeconds) *
              100
          )
        : 0;

    const phoneRatio =
      studySeconds > 0
        ? clamp(
            (phoneSeconds /
              studySeconds) *
              100
          )
        : 0;

    const averageSession =
      source.length > 0
        ? Math.round(
            studySeconds /
              source.length
          )
        : 0;

    const scoreSpread =
      scores.length > 1
        ? Math.max(...scores) - Math.min(...scores)
        : 0;

    const focusStability =
      scores.length > 0
        ? clamp(100 - scoreSpread * 1.35)
        : 0;

    const recoveryValues = source
      .map((session) =>
        session?.recoverySeconds ??
        session?.distractionRecoverySeconds
      )
      .map(Number)
      .filter(Number.isFinite)
      .filter((value) => value >= 0);

    const distractionCount = source.reduce(
      (total, session) =>
        total +
        toNumber(
          session?.distractions ??
          session?.distractionCount,
          0
        ),
      0
    );

    const recoverySeconds =
      recoveryValues.length > 0
        ? Math.round(
            recoveryValues.reduce((a, b) => a + b, 0) /
              recoveryValues.length
          )
        : null;

    const bestSession = [...source]
      .filter((session) => getFocusScore(session) > 0)
      .sort((a, b) => getFocusScore(b) - getFocusScore(a))[0];

    const bestTimestamp = bestSession
      ? getTimestamp(bestSession)
      : null;

    const bestHour = bestTimestamp
      ? new Date(bestTimestamp).getHours()
      : null;

    const formatHour = (hour) => {
      if (hour === null || !Number.isFinite(hour)) return null;
      const start = new Date();
      start.setHours(hour, 0, 0, 0);
      const end = new Date(start);
      end.setHours(hour + 2, 0, 0, 0);
      return `${start.toLocaleTimeString(undefined, { hour: "numeric" })} – ${end.toLocaleTimeString(undefined, { hour: "numeric" })}`;
    };

    return {
      completedCount:
        completed.length,

      sessionCount:
        filteredSessions.length,

      studySeconds,

      focusedSeconds,

      distractionSeconds,

      phoneSeconds,

      breakSeconds,

      averageFocus,

      focusRatio,

      distractionRatio,

      phoneRatio,

      averageSession,
      focusStability: Math.round(focusStability),
      distractionCount,
      recoverySeconds,
      bestFocusWindow: formatHour(bestHour),
    };
  }, [filteredSessions]);

  /* =======================================================
     ALERT CALCULATIONS
  ======================================================= */

  const reportAlerts = useMemo(() => {
    const relevantSessions =
      filteredSessions;

    const timestamps =
      relevantSessions
        .map(getTimestamp)
        .filter(Boolean)
        .map(
          (value) =>
            new Date(value).getTime()
        )
        .filter(Number.isFinite);

    if (
      period === "all" ||
      timestamps.length === 0
    ) {
      return alerts;
    }

    const minimum =
      Math.min(...timestamps);

    return alerts.filter(
      (alert) => {
        const timestamp =
          alert?.timestamp ||
          alert?.createdAt;

        if (!timestamp) {
          return false;
        }

        const time =
          new Date(
            timestamp
          ).getTime();

        return (
          Number.isFinite(time) &&
          time >= minimum
        );
      }
    );
  }, [
    alerts,
    filteredSessions,
    period,
  ]);

  /* =======================================================
     ALERT BREAKDOWN
  ======================================================= */

  const alertBreakdown =
    useMemo(() => {
      const counts = {};

      reportAlerts.forEach(
        (alert) => {
          const type =
            String(
              alert?.type || "OTHER"
            ).toUpperCase();

          counts[type] =
            (counts[type] || 0) + 1;
        }
      );

      return counts;
    }, [reportAlerts]);

  /* =======================================================
     TOP DISTRACTION
  ======================================================= */

  const topDistraction =
    useMemo(() => {
      const entries =
        Object.entries(
          alertBreakdown
        );

      if (!entries.length) {
        return null;
      }

      entries.sort(
        (a, b) => b[1] - a[1]
      );

      return entries[0];
    }, [alertBreakdown]);

  /* =======================================================
     INSIGHTS
  ======================================================= */

  const insights = useMemo(() => {
    const result = [];

    if (
      report.sessionCount === 0
    ) {
      return result;
    }

    if (
      report.averageFocus >= 90
    ) {
      result.push({
        icon: Award,
        title:
          "Excellent focus consistency",
        description:
          "Your recorded sessions show a strong ability to maintain attention. Keep the same study rhythm and protect the habits that are working.",
        tone: "success",
        tag: "Strong",
      });
    } else if (
      report.averageFocus >= 75
    ) {
      result.push({
        icon: TrendingUp,
        title:
          "Good focus performance",
        description:
          "Your focus level is healthy. Small improvements in distraction control can help move your sessions toward excellent consistency.",
        tone: "info",
        tag: "Good",
      });
    } else if (
      report.averageFocus >= 60
    ) {
      result.push({
        icon: Target,
        title:
          "Focus has room to improve",
        description:
          "Your sessions show some attention loss. Try shorter focused blocks and intentional breaks to rebuild concentration.",
        tone: "warning",
        tag: "Improve",
      });
    } else {
      result.push({
        icon: AlertTriangle,
        title:
          "Focus needs attention",
        description:
          "Your recorded focus score is low. Consider reducing distractions, preparing your study space, and using shorter sessions.",
        tone: "danger",
        tag: "Priority",
      });
    }

    if (
      report.phoneSeconds > 0
    ) {
      const phoneShare =
        report.phoneRatio;

      if (phoneShare >= 15) {
        result.push({
          icon: Phone,
          title:
            "Phone usage is affecting study time",
          description:
            "A noticeable portion of your recorded study time includes phone-related activity. Keeping your phone away from the desk may improve focus.",
          tone: "warning",
          tag: "Phone",
        });
      } else {
        result.push({
          icon: CheckCircle2,
          title:
            "Phone distraction is controlled",
          description:
            "Phone-related activity represents a relatively small part of your recorded study time.",
          tone: "success",
          tag: "Controlled",
        });
      }
    }

    if (
      report.distractionSeconds >
      0
    ) {
      result.push({
        icon: Zap,
        title:
          "Distraction pattern detected",
        description:
          `Your sessions contain ${formatDuration(
            report.distractionSeconds
          )} of recorded distraction time. Use a distraction-free environment for your next session.`,
        tone: "warning",
        tag: "Attention",
      });
    }

    if (
      report.breakSeconds > 0
    ) {
      result.push({
        icon: Clock3,
        title:
          "Breaks are part of the rhythm",
        description:
          `You recorded ${formatDuration(
            report.breakSeconds
          )} of break time. Intentional breaks can help maintain sustainable concentration.`,
        tone: "info",
        tag: "Balance",
      });
    }

    if (
      topDistraction &&
      topDistraction[1] > 0
    ) {
      result.push({
        icon: Brain,
        title:
          "Your most frequent alert",
        description:
          `${topDistraction[0].replaceAll(
            "_",
            " "
          )} appeared ${topDistraction[1]} time${
            topDistraction[1] === 1
              ? ""
              : "s"
          } in the selected report period.`,
        tone: "info",
        tag: "Pattern",
      });
    }

    return result.slice(0, 5);
  }, [
    report,
    topDistraction,
  ]);

  /* =======================================================
     GOAL
  ======================================================= */

  const goalProgress =
    useMemo(() => {
      if (
        !dailyGoal ||
        dailyGoal <= 0
      ) {
        return 0;
      }

      return clamp(
        (report.studySeconds /
          dailyGoal) *
          100
      );
    }, [
      dailyGoal,
      report.studySeconds,
    ]);

  const scoreStatus =
    getScoreStatus(
      report.averageFocus
    );

  /* =======================================================
     REFRESH
  ======================================================= */

  const handleRefresh = () => {
    setIsRefreshing(true);

    window.setTimeout(() => {
      loadReportData();
      setIsRefreshing(false);
    }, 450);
  };

  /* =======================================================
     EXPORT REPORT
  ======================================================= */

  const handleExport = () => {
    const payload = {
      generatedAt:
        generatedAt.toISOString(),

      period,

      summary: {
        sessions:
          report.sessionCount,

        completedSessions:
          report.completedCount,

        studyTimeSeconds:
          report.studySeconds,

        focusedTimeSeconds:
          report.focusedSeconds,

        distractionTimeSeconds:
          report.distractionSeconds,

        phoneTimeSeconds:
          report.phoneSeconds,

        breakTimeSeconds:
          report.breakSeconds,

        averageFocus:
          report.averageFocus,

        dailyGoalSeconds:
          dailyGoal,

        dailyGoalProgress:
          goalProgress,
      },

      alerts: reportAlerts.map(
        (alert) => ({
          type: alert?.type,
          level: alert?.level,
          title: alert?.title,
          message: alert?.message,
          timestamp:
            alert?.timestamp ||
            alert?.createdAt,
        })
      ),

      insights,
    };

    const blob =
      new Blob(
        [
          JSON.stringify(
            payload,
            null,
            2
          ),
        ],
        {
          type: "application/json",
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const anchor =
      document.createElement(
        "a"
      );

    anchor.href = url;

    anchor.download =
      `daily-goal-smart-report-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;

    document.body.appendChild(
      anchor
    );

    anchor.click();

    anchor.remove();

    URL.revokeObjectURL(url);
  };

  /* =======================================================
     EMPTY
  ======================================================= */

  if (
    sessions.length === 0
  ) {
    return (
      <PageTransition>
        <main className="smart-report">
          <div className="smart-report__ambient smart-report__ambient--one" />
          <div className="smart-report__ambient smart-report__ambient--two" />
          <div className="smart-report__grid" />

          <section className="smart-report__header">
            <div>
              <div className="smart-report__eyebrow">
                <span>
                  <Sparkles size={15} />
                </span>
                AI-Powered Study Report
              </div>

              <h1>Smart Report</h1>

              <p>
                Turn your study activity into
                useful insights and actionable
                recommendations.
              </p>
            </div>

            <Button
              variant="secondary"
              icon={
                <RefreshCw
                  size={17}
                />
              }
              onClick={
                handleRefresh
              }
            >
              Refresh
            </Button>
          </section>

          <section className="smart-report__empty">
            <EmptyState
              icon="analytics"
              title="Your Smart Report is waiting"
              description="Complete at least one study session and your report will automatically generate focus metrics, activity patterns, and AI-style insights."
              variant="info"
              size="lg"
              animated
              showDecoration
            />
          </section>
        </main>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <main className="smart-report">
        <div className="smart-report__ambient smart-report__ambient--one" />
        <div className="smart-report__ambient smart-report__ambient--two" />
        <div className="smart-report__grid" />

        {/* =================================================
            HEADER
        ================================================= */}

        <section className="smart-report__header">
          <div className="smart-report__header-copy">
            <div className="smart-report__eyebrow">
              <span>
                <Sparkles size={15} />
              </span>

              AI-Powered Study Report

              <Badge
                variant="ai"
                size="sm"
                soft
                glow
              >
                Smart Analysis
              </Badge>
            </div>

            <h1>Smart Report</h1>

            <p>
              A clear picture of your study
              performance, focus patterns,
              distractions, and next steps.
            </p>
          </div>

          <div className="smart-report__header-actions">
            <div className="smart-report__period">
              <CalendarDays
                size={16}
              />

              <select
                value={period}
                onChange={(event) =>
                  setPeriod(
                    event.target.value
                  )
                }
                aria-label="Report period"
              >
                <option value="today">
                  Today
                </option>

                <option value="week">
                  Last 7 Days
                </option>

                <option value="month">
                  Last 30 Days
                </option>

                <option value="all">
                  All Sessions
                </option>
              </select>
            </div>

            <Button
              variant="secondary"
              icon={
                <RefreshCw
                  size={17}
                  className={
                    isRefreshing
                      ? "smart-report__refreshing"
                      : ""
                  }
                />
              }
              onClick={
                handleRefresh
              }
              disabled={
                isRefreshing
              }
            >
              Refresh
            </Button>

            <Button
              variant="primary"
              icon={
                <Download
                  size={17}
                />
              }
              onClick={
                handleExport
              }
            >
              Export Report
            </Button>
          </div>
        </section>

        {/* =================================================
            REPORT META
        ================================================= */}

        <section className="smart-report__meta">
          <div>
            <FileText size={16} />
            <span>
              Report generated{" "}
              {formatReportDate()}
            </span>
          </div>

          <div>
            <Activity size={16} />
            <span>
              Based on{" "}
              {report.sessionCount} session
              {report.sessionCount === 1
                ? ""
                : "s"}
            </span>
          </div>

          <Badge
            variant="success"
            size="sm"
            soft
            dot
          >
            Local Data
          </Badge>
        </section>

        {/* =================================================
            HERO
        ================================================= */}

        <section className="smart-report__hero">
          <div className="smart-report__hero-copy">
            <div className="smart-report__hero-label">
              <Brain size={16} />
              Overall Focus Performance
            </div>

            <div className="smart-report__hero-score">
              <strong>
                {report.averageFocus}
              </strong>

              <span>/100</span>
            </div>

            <div className="smart-report__hero-status">
              <Badge
                variant={
                  scoreStatus.tone
                }
                size="md"
                soft
                dot
              >
                {scoreStatus.label}
              </Badge>

              <span>
                {report.averageFocus >=
                75
                  ? "Your study rhythm is moving in a positive direction."
                  : "There is an opportunity to improve your study consistency."}
              </span>
            </div>
          </div>

          <div className="smart-report__hero-ring">
            <ProgressRing
              value={
                report.averageFocus
              }
              max={100}
              size={190}
              thickness={12}
              variant={
                scoreStatus.tone ===
                "success"
                  ? "success"
                  : scoreStatus.tone ===
                      "warning"
                    ? "warning"
                    : scoreStatus.tone ===
                        "danger"
                      ? "danger"
                      : "primary"
              }
              glow
              animated
              showPercentage
              showLabel
              label="Focus"
            />
          </div>

          <div className="smart-report__hero-decoration">
            <span />
            <span />
            <span />
          </div>
        </section>

        {/* =================================================
            METRICS
        ================================================= */}

        <section className="smart-report__metrics">
          <ReportMetric
            icon={Clock3}
            label="Study Time"
            value={formatDuration(
              report.studySeconds
            )}
            detail={`${report.sessionCount} recorded sessions`}
            tone="primary"
            index={0}
          />

          <ReportMetric
            icon={Target}
            label="Focused Time"
            value={formatDuration(
              report.focusedSeconds
            )}
            detail={`${Math.round(
              report.focusRatio
            )}% of study time`}
            tone="success"
            index={1}
          />

          <ReportMetric
            icon={TrendingDown}
            label="Distraction Time"
            value={formatDuration(
              report.distractionSeconds
            )}
            detail={`${Math.round(
              report.distractionRatio
            )}% of study time`}
            tone="warning"
            index={2}
          />

          <ReportMetric
            icon={Phone}
            label="Phone Time"
            value={formatDuration(
              report.phoneSeconds
            )}
            detail={`${Math.round(
              report.phoneRatio
            )}% of study time`}
            tone="danger"
            index={3}
          />

          <ReportMetric
            icon={Clock3}
            label="Break Time"
            value={formatDuration(
              report.breakSeconds
            )}
            detail="Intentional recovery"
            tone="info"
            index={4}
          />

          <ReportMetric
            icon={BarChart3}
            label="Average Session"
            value={formatDuration(
              report.averageSession
            )}
            detail="Across selected sessions"
            tone="primary"
            index={5}
          />

          <ReportMetric
            icon={TrendingUp}
            label="Focus Stability"
            value={`${report.focusStability}%`}
            detail="Consistency across sessions"
            tone="success"
            index={6}
          />

          <ReportMetric
            icon={Zap}
            label="Distractions"
            value={report.distractionCount}
            detail="Recorded interruption events"
            tone="warning"
            index={7}
          />

          <ReportMetric
            icon={Brain}
            label="Recovery Time"
            value={report.recoverySeconds === null ? "—" : formatLongDuration(report.recoverySeconds)}
            detail={report.recoverySeconds === null ? "Not enough recovery data" : "Average return to focus"}
            tone="info"
            index={8}
          />

          <ReportMetric
            icon={Clock3}
            label="Best Focus Window"
            value={report.bestFocusWindow || "—"}
            detail="Based on your strongest session"
            tone="primary"
            index={9}
          />
        </section>

        {/* =================================================
            GOAL + ACTIVITY
        ================================================= */}

        <section className="smart-report__two-column">
          <article className="smart-report__panel smart-report__goal-panel">
            <div className="smart-report__panel-header">
              <div>
                <span className="smart-report__panel-kicker">
                  DAILY GOAL
                </span>

                <h2>Goal Progress</h2>

                <p>
                  Your study time compared
                  with the configured Daily Goal.
                </p>
              </div>

              <Target
                size={21}
              />
            </div>

            <div className="smart-report__goal-content">
              <ProgressRing
                value={
                  goalProgress
                }
                max={100}
                size={145}
                thickness={10}
                variant="primary"
                glow
                animated
                showPercentage
              />

              <div className="smart-report__goal-details">
                <strong>
                  {formatDuration(
                    report.studySeconds
                  )}
                </strong>

                <span>
                  studied
                </span>

                {dailyGoal > 0 ? (
                  <p>
                    Goal:{" "}
                    {formatDuration(
                      dailyGoal
                    )}
                  </p>
                ) : (
                  <p>
                    No Daily Goal configured.
                  </p>
                )}

                {goalProgress >=
                  100 && (
                  <Badge
                    variant="success"
                    soft
                    dot
                  >
                    Goal Completed
                  </Badge>
                )}
              </div>
            </div>
          </article>

          <article className="smart-report__panel">
            <div className="smart-report__panel-header">
              <div>
                <span className="smart-report__panel-kicker">
                  ACTIVITY BREAKDOWN
                </span>

                <h2>Where Your Time Went</h2>

                <p>
                  Distribution of your
                  recorded study activity.
                </p>
              </div>

              <Activity size={21} />
            </div>

            <div className="smart-report__activity-list">
              <ActivityBar
                label="Focused"
                seconds={
                  report.focusedSeconds
                }
                total={
                  report.studySeconds
                }
                icon={
                  CheckCircle2
                }
                tone="success"
              />

              <ActivityBar
                label="Distraction"
                seconds={
                  report.distractionSeconds
                }
                total={
                  report.studySeconds
                }
                icon={
                  TrendingDown
                }
                tone="warning"
              />

              <ActivityBar
                label="Phone"
                seconds={
                  report.phoneSeconds
                }
                total={
                  report.studySeconds
                }
                icon={Phone}
                tone="danger"
              />

              <ActivityBar
                label="Break"
                seconds={
                  report.breakSeconds
                }
                total={
                  report.studySeconds
                }
                icon={Clock3}
                tone="info"
              />
            </div>
          </article>
        </section>

        {/* =================================================
            INSIGHTS
        ================================================= */}

        <section className="smart-report__insights-panel">
          <div className="smart-report__panel-header">
            <div>
              <span className="smart-report__panel-kicker">
                SMART INSIGHTS
              </span>

              <h2>
                What Your Activity Tells You
              </h2>

              <p>
                Recommendations generated
                from your locally stored
                sessions and alerts.
              </p>
            </div>

            <div className="smart-report__ai-orb">
              <Sparkles size={19} />
            </div>
          </div>

          {insights.length > 0 ? (
            <div className="smart-report__insights">
              {insights.map(
                (
                  insight,
                  index
                ) => (
                  <InsightCard
                    key={`${insight.title}-${index}`}
                    {...insight}
                    index={index}
                  />
                )
              )}
            </div>
          ) : (
            <EmptyState
              icon="sparkles"
              title="Not enough activity yet"
              description="Complete more study activity to unlock deeper insights."
              compact
              animated
            />
          )}
        </section>

        {/* =================================================
            ALERT PATTERNS
        ================================================= */}

        <section className="smart-report__two-column smart-report__bottom-grid">
          <article className="smart-report__panel">
            <div className="smart-report__panel-header">
              <div>
                <span className="smart-report__panel-kicker">
                  ALERT PATTERNS
                </span>

                <h2>
                  Monitoring Activity
                </h2>

                <p>
                  Alerts captured during
                  the selected report period.
                </p>
              </div>

              <AlertTriangle
                size={21}
              />
            </div>

            <div className="smart-report__alert-summary">
              <div>
                <strong>
                  {reportAlerts.length}
                </strong>

                <span>
                  Total alerts
                </span>
              </div>

              <div>
                <strong>
                  {
                    reportAlerts.filter(
                      (alert) =>
                        String(
                          alert?.level
                        ).toUpperCase() ===
                        "CRITICAL"
                    ).length
                  }
                </strong>

                <span>
                  Critical
                </span>
              </div>

              <div>
                <strong>
                  {
                    reportAlerts.filter(
                      (alert) =>
                        String(
                          alert?.level
                        ).toUpperCase() ===
                        "WARNING"
                    ).length
                  }
                </strong>

                <span>
                  Warnings
                </span>
              </div>
            </div>

            {topDistraction && (
              <div className="smart-report__top-alert">
                <div>
                  <Zap size={17} />
                </div>

                <p>
                  Most frequent alert:
                  <strong>
                    {topDistraction[0].replaceAll(
                      "_",
                      " "
                    )}
                  </strong>
                </p>
              </div>
            )}
          </article>

          <article className="smart-report__panel smart-report__recommendation">
            <div className="smart-report__recommendation-icon">
              <Lightbulb
                size={23}
              />
            </div>

            <div>
              <span>
                NEXT SESSION
              </span>

              <h2>
                Your next best move
              </h2>

              <p>
                {report.averageFocus >=
                85
                  ? "Protect your current routine. Start your next session with the same distraction-free setup."
                  : report.phoneRatio >=
                      15
                    ? "Keep your phone outside your immediate study area before starting the next session."
                    : report.distractionRatio >=
                        15
                      ? "Try a shorter focused block with a clear task target before your next session."
                      : "Set a clear study target before starting your next session and use intentional breaks."}
              </p>

              <Badge
                variant="ai"
                soft
                icon={
                  <Sparkles size={13} />
                }
              >
                AI Recommendation
              </Badge>
            </div>
          </article>
        </section>

        {/* =================================================
            FOOTER
        ================================================= */}

        <footer className="smart-report__footer">
          <div>
            <Sparkles size={15} />

            <span>
              Smart insights are generated
              locally from your Daily Goal
              activity.
            </span>
          </div>

          <span>
            Updated{" "}
            {generatedAt.toLocaleTimeString(
              undefined,
              {
                hour: "2-digit",
                minute: "2-digit",
              }
            )}
          </span>
        </footer>
      </main>
    </PageTransition>
  );
};

export default SmartReport;