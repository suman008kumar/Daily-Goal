import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  ArrowRight,
  Brain,
  Camera,
  Clock3,
  Play,
  Sparkles,
  Target,
  TimerReset,
  TrendingUp,
} from "lucide-react";

import FocusScore from "../../components/Dashboard/FocusScore";
import DailyGoal from "../../components/Dashboard/DailyGoal";
import QuickStats from "../../components/Dashboard/QuickStats";
import RecentAlerts from "../../components/Dashboard/RecentAlerts";
import RecentSessions from "../../components/Dashboard/RecentSessions";

import StatCard from "../../components/Common/StatCard";
import Badge from "../../components/Common/Badge";
import Button from "../../components/Common/Button";
import PageTransition from "../../components/Common/PageTransition";

import useSession from "../../hooks/useSession";
import useAI from "../../hooks/useAI";
import useMonitoring from "../../hooks/useMonitoring";
import useAlerts from "../../hooks/useAlerts";

import {
  getDailyGoal,
  getStatistics,
  getPreferences,
  savePreferences,
} from "../../services/storageService";

import "./Dashboard.css";

const EMPTY_ANALYSIS = {
  face: {},
  eyes: {},
  objects: {},
  posture: {},
  attention: {},
  drowsiness: {},
};

const EMPTY_BREAKDOWN = {};

const getTodayKey = () => {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
};

const formatDate = (date = new Date()) => {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const formatDuration = (seconds = 0) => {
  const safeSeconds = Math.max(
    0,
    Math.floor(Number(seconds) || 0)
  );

  const hours = Math.floor(
    safeSeconds / 3600
  );

  const minutes = Math.floor(
    (safeSeconds % 3600) / 60
  );

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
};

const formatMinutes = (seconds = 0) => {
  return Math.max(
    0,
    Math.round(
      (Number(seconds) || 0) / 60
    )
  );
};

const getSessionDuration = (session) => {
  if (!session) return 0;

  if (
    Number.isFinite(
      Number(session.durationSeconds)
    )
  ) {
    return Number(
      session.durationSeconds
    );
  }

  if (
    Number.isFinite(
      Number(session.duration)
    )
  ) {
    return Number(session.duration);
  }

  if (
    session.startTime &&
    session.endTime
  ) {
    const start = new Date(
      session.startTime
    ).getTime();

    const end = new Date(
      session.endTime
    ).getTime();

    if (
      Number.isFinite(start) &&
      Number.isFinite(end)
    ) {
      return Math.max(
        0,
        Math.floor(
          (end - start) / 1000
        )
      );
    }
  }

  return 0;
};

const getSessionDate = (session) => {
  return (
    session?.date ||
    session?.createdAt ||
    session?.startTime ||
    session?.startedAt ||
    null
  );
};

const isToday = (session) => {
  const value =
    getSessionDate(session);

  if (!value) return false;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return (
    date.toISOString().slice(0, 10) ===
    getTodayKey()
  );
};

const getFocusScore = (session) => {
  const value =
    session?.focusScore ??
    session?.score ??
    session?.focus ??
    0;

  const numeric = Number(value);

  return Number.isFinite(numeric)
    ? Math.min(100, Math.max(0, numeric))
    : 0;
};

const getDistractionSeconds = (
  session
) => {
  const value =
    session?.distractionSeconds ??
    session?.distractedSeconds ??
    session?.distractionTime ??
    0;

  return Math.max(
    0,
    Number(value) || 0
  );
};

const getPhoneSeconds = (
  session
) => {
  const value =
    session?.phoneSeconds ??
    session?.phoneUsageSeconds ??
    session?.phoneTime ??
    0;

  return Math.max(
    0,
    Number(value) || 0
  );
};

const getBreakSeconds = (
  session
) => {
  const value =
    session?.breakSeconds ??
    session?.breakTime ??
    0;

  return Math.max(
    0,
    Number(value) || 0
  );
};

/* =========================================================
   TIME BASED GREETING
   ========================================================= */

const getGreetingData = () => {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    return {
      text: "Good Morning",
      video: "/greeting-videos/G-ME.webm",
    };
  }

  if (hour >= 12 && hour < 17) {
    return {
      text: "Good Afternoon",
      video: "/greeting-videos/G-AE.webm",
    };
  }

  if (hour >= 17 && hour < 21) {
    return {
      text: "Good Evening",
      video: "/greeting-videos/G-ME.mp4",
    };
  }

  return {
    text: "Good Night",
    video: "/greeting-videos/G-NE.webm",
  };
};

const Dashboard = () => {
  const [dailyGoal, setDailyGoal] =
    useState(null);

  const [statistics, setStatistics] =
    useState({});

  const [preferences, setPreferences] =
    useState({});

  const [isInitialLoading, setIsInitialLoading] =
    useState(true);

  const [refreshKey, setRefreshKey] =
    useState(0);

  const [thought, setThought] = useState({ quote: "", author: "", loading: true, error: false });

  const [isFirstEntrance, setIsFirstEntrance] =
    useState(true);


  useEffect(() => {
    let cancelled = false;
    const loadThought = async () => {
      setThought((current) => ({ ...current, loading: true, error: false }));
      try {
        const response = await fetch("https://quoteslate.vercel.app/api/quotes/random?tags=motivation", { cache: "no-store" });
        if (!response.ok) throw new Error("Quote service unavailable");
        const data = await response.json();
        const quote = data?.quote || data?.text || data?.content || "";
        const author = data?.author || data?.by || "Daily Goal AI";
        if (!quote) throw new Error("No quote returned");
        if (!cancelled) setThought({ quote: String(quote), author: String(author), loading: false, error: false });
      } catch {
        if (!cancelled) setThought({ quote: "Small progress every day becomes remarkable progress over time.", author: "Daily Goal AI", loading: false, error: true });
      }
    };
    loadThought();
    return () => { cancelled = true; };
  }, []);

  const displayName = String(preferences?.displayName || preferences?.name || "Student").trim() || "Student";
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState(displayName);

  useEffect(() => { setDraftName(displayName); }, [displayName]);

  const saveDisplayName = useCallback(() => {
    const nextName = draftName.trim().slice(0, 40) || "Student";
    const next = { ...preferences, displayName: nextName };
    savePreferences(next);
    setPreferences(next);
    setIsEditingName(false);
  }, [draftName, preferences]);

  /*
   * ---------------------------------------------------------
   * GREETING
   * ---------------------------------------------------------
   */

  const [greetingData, setGreetingData] =
    useState(() => getGreetingData());

  useEffect(() => {
    const updateGreeting = () => {
      setGreetingData(getGreetingData());
    };

    updateGreeting();

    const greetingTimer =
      window.setInterval(
        updateGreeting,
        30 * 1000
      );

    return () =>
      window.clearInterval(
        greetingTimer
      );
  }, []);

  /*
   * ---------------------------------------------------------
   * SESSION
   * ---------------------------------------------------------
   */

  const sessionHook = useSession();

  const {
    sessions = [],
    activeSession,
    status: sessionStatus,
    isRunning: sessionIsRunning,
    isPaused: sessionIsPaused,
    elapsedSeconds = 0,
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
  } = sessionHook || {};

  /*
   * ---------------------------------------------------------
   * AI
   * ---------------------------------------------------------
   */

  const aiHook = useAI({ enabled: false });

  const {
    analysis = EMPTY_ANALYSIS,
    focusScore = 0,
    focusStatus,
    breakdown = EMPTY_BREAKDOWN,
    isDemoMode = false,
    isLiveMode = false,
  } = aiHook || {};

  /*
   * ---------------------------------------------------------
   * MONITORING
   * ---------------------------------------------------------
   */

  const monitoringHook =
    useMonitoring();

  const {
    isMonitoring = false,
    isPaused: monitoringPaused = false,
    isMuted = false,
    startMonitoring,
    pauseMonitoring,
    resumeMonitoring,
    stopMonitoring,
  } = monitoringHook || {};

  /*
   * ---------------------------------------------------------
   * ALERTS
   * ---------------------------------------------------------
   */

  const alertsHook = useAlerts();

  const {
    alerts = [],
    dismissAlert,
  } = alertsHook || {};

  /*
   * ---------------------------------------------------------
   * LOAD DASHBOARD DATA
   * ---------------------------------------------------------
   */

  const loadDashboardData =
    useCallback(() => {
      try {
        setDailyGoal(
          getDailyGoal?.() || null
        );

        setStatistics(
          getStatistics?.() || {}
        );

        setPreferences(
          getPreferences?.() || {}
        );
      } catch (error) {
        console.warn(
          "Unable to load dashboard data:",
          error
        );
      } finally {
        setIsInitialLoading(false);
      }
    }, []);

  useEffect(() => {
    loadDashboardData();

    const timer =
      window.setTimeout(() => {
        setIsFirstEntrance(false);
      }, 1500);

    return () =>
      window.clearTimeout(timer);
  }, [loadDashboardData]);

  useEffect(() => {
    const handleDataChange = () => {
      loadDashboardData();
      setRefreshKey((value) => value + 1);
    };
    window.addEventListener("storage", handleDataChange);
    window.addEventListener("daily-goal-data-change", handleDataChange);
    return () => {
      window.removeEventListener("storage", handleDataChange);
      window.removeEventListener("daily-goal-data-change", handleDataChange);
    };
  }, [loadDashboardData]);

  /*
   * ---------------------------------------------------------
   * TODAY'S SESSIONS
   * ---------------------------------------------------------
   */

  const todaySessions = useMemo(() => {
    return sessions.filter(isToday);
  }, [sessions, refreshKey]);

  /*
   * ---------------------------------------------------------
   * TODAY'S METRICS
   * ---------------------------------------------------------
   */

  const metrics = useMemo(() => {
    const completedStudySeconds =
      todaySessions.reduce(
        (total, session) =>
          total +
          getSessionDuration(session),
        0
      );

    const distractionSeconds =
      todaySessions.reduce(
        (total, session) =>
          total +
          getDistractionSeconds(session),
        0
      );

    const phoneSeconds =
      todaySessions.reduce(
        (total, session) =>
          total +
          getPhoneSeconds(session),
        0
      );

    const breakSeconds =
      todaySessions.reduce(
        (total, session) =>
          total +
          getBreakSeconds(session),
        0
      );

    const completedFocusScores =
      todaySessions
        .map(getFocusScore)
        .filter(
          (score) => score > 0
        );

    const historicalAverage =
      completedFocusScores.length
        ? completedFocusScores.reduce(
            (sum, score) =>
              sum + score,
            0
          ) /
          completedFocusScores.length
        : 0;

    let activeMonitoringScore = 0;
    try {
      const raw = localStorage.getItem("daily_goal_active_monitoring_metrics");
      const active = raw ? JSON.parse(raw) : {};
      const focused = Math.max(0, Number(active.focusedSeconds) || 0);
      const distracted = Math.max(0, Number(active.distractionSeconds) || 0);
      const total = focused + distracted;
      activeMonitoringScore = total > 0 ? Math.round((focused / total) * 100) : 0;
    } catch {}

    const liveScore = Math.max(Number(focusScore) || 0, activeMonitoringScore);

    const averageFocusScore =
      liveScore > 0 ? liveScore : historicalAverage;

    const currentStudySeconds =
      sessionIsRunning ||
      sessionIsPaused
        ? elapsedSeconds
        : 0;

    const totalStudySeconds =
      completedStudySeconds +
      currentStudySeconds;

    return {
      studySeconds:
        totalStudySeconds,

      distractionSeconds,

      phoneSeconds,

      breakSeconds,

      focusScore:
        Math.round(
          averageFocusScore
        ),

      sessionCount:
        todaySessions.length,

      activeSessionSeconds:
        currentStudySeconds,
    };
  }, [
    todaySessions,
    focusScore,
    sessionIsRunning,
    sessionIsPaused,
    elapsedSeconds,
  ]);

  const dashboardFocusChartData = useMemo(() => {
    const points = todaySessions
      .map((session) => {
        const date = new Date(getSessionDate(session));
        return {
          label: Number.isNaN(date.getTime()) ? "Session" : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
          value: getFocusScore(session),
        };
      })
      .filter((point) => point.value > 0);

    if ((sessionIsRunning || sessionIsPaused) && Number(focusScore) > 0) {
      points.push({ label: "Now", value: Number(focusScore) });
    }

    return points.slice(-12);
  }, [todaySessions, sessionIsRunning, sessionIsPaused, focusScore, refreshKey]);

  /*
   * ---------------------------------------------------------
   * DAILY GOAL
   * ---------------------------------------------------------
   */

  const goalTargetSeconds =
    useMemo(() => {
      const value =
        dailyGoal?.targetSeconds ??
        dailyGoal?.dailyGoalSeconds ??
        preferences?.dailyGoalSeconds ??
        0;

      return Math.max(
        0,
        Number(value) || 0
      );
    }, [
      dailyGoal,
      preferences,
    ]);

  const goalCompletedSeconds =
    metrics.studySeconds;

  const goalProgress =
    goalTargetSeconds > 0
      ? Math.min(
          100,
          Math.round(
            (goalCompletedSeconds /
              goalTargetSeconds) *
              100
          )
        )
      : 0;

  const goalRemainingSeconds =
    Math.max(
      0,
      goalTargetSeconds -
        goalCompletedSeconds
    );

  const isGoalCompleted =
    goalTargetSeconds > 0 &&
    goalCompletedSeconds >=
      goalTargetSeconds;

  /*
   * ---------------------------------------------------------
   * SESSION ACTIONS
   * ---------------------------------------------------------
   */

  const handleStartSession =
    useCallback(async () => {
      try {
        window.location.assign("/live-monitoring");
      } catch (error) {
        console.warn("Unable to open Live Monitoring:", error);
      }
    }, []);

  const handlePauseSession =
    useCallback(async () => {
      try {
        if (
          typeof pauseSession ===
          "function"
        ) {
          await pauseSession();
        }

        if (
          typeof pauseMonitoring ===
            "function" &&
          isMonitoring
        ) {
          await pauseMonitoring();
        }
      } catch (error) {
        console.warn(
          "Unable to pause session:",
          error
        );
      }
    }, [
      pauseSession,
      pauseMonitoring,
      isMonitoring,
    ]);

  const handleResumeSession =
    useCallback(async () => {
      try {
        if (
          typeof resumeSession ===
          "function"
        ) {
          await resumeSession();
        }

        if (
          typeof resumeMonitoring ===
          "function"
        ) {
          await resumeMonitoring();
        }
      } catch (error) {
        console.warn(
          "Unable to resume session:",
          error
        );
      }
    }, [
      resumeSession,
      resumeMonitoring,
    ]);

  const handleStopSession =
    useCallback(async () => {
      try {
        if (
          typeof stopSession ===
          "function"
        ) {
          await stopSession();
        }

        if (
          typeof stopMonitoring ===
          "function"
        ) {
          await stopMonitoring();
        }
      } catch (error) {
        console.warn(
          "Unable to stop session:",
          error
        );
      }
    }, [
      stopSession,
      stopMonitoring,
    ]);

  /*
   * ---------------------------------------------------------
   * QUICK STATS
   * ---------------------------------------------------------
   */

  const quickStats = useMemo(() => {
    return [
      {
        id: "focus-score",
        label: "Focus Score",
        value: metrics.focusScore,
        unit: "/100",
        subtitle:
          "Current concentration level",
        iconKey: "focus",
        variant: "accent",
        trend: statistics?.focusTrend,
      },
      {
        id: "study-time",
        label: "Study Time",
        value:
          formatMinutes(
            metrics.studySeconds
          ),
        unit: "min",
        subtitle:
          "Focused study completed",
        iconKey: "clock",
        variant: "success",
      },
      {
        id: "distraction-time",
        label: "Distraction",
        value:
          formatMinutes(
            metrics.distractionSeconds
          ),
        unit: "min",
        subtitle:
          "Time away from focus",
        iconKey: "activity",
        variant: "warning",
      },
      {
        id: "phone-time",
        label: "Phone Usage",
        value:
          formatMinutes(
            metrics.phoneSeconds
          ),
        unit: "min",
        subtitle:
          "Detected phone activity",
        iconKey: "phone",
        variant: "danger",
      },
    ];
  }, [
    metrics,
    statistics,
  ]);

  /*
   * ---------------------------------------------------------
   * LIVE AI STATUS
   * ---------------------------------------------------------
   */

  const aiStatus = useMemo(() => {
    if (isLiveMode) {
      return {
        label: "AI Live",
        variant: "live",
      };
    }

    if (isDemoMode) {
      return {
        label: "AI Demo Mode",
        variant: "ai",
      };
    }

    return {
      label: "AI Ready",
      variant: "info",
    };
  }, [
    isLiveMode,
    isDemoMode,
  ]);

  /*
   * ---------------------------------------------------------
   * CURRENT MONITORING STATUS
   * ---------------------------------------------------------
   */

  const monitoringStatus =
    monitoringPaused
      ? "Paused"
      : isMonitoring
      ? "Monitoring Active"
      : "Monitoring Off";

  /*
   * ---------------------------------------------------------
   * RENDER
   * ---------------------------------------------------------
   */

  if (isInitialLoading) {
    return (
      <PageTransition
        variant="dashboard"
        className="dg-dashboard-page"
      >
        <div className="dg-dashboard-loading">
          <div className="dg-dashboard-loading__orb">
            <Brain size={30} />
          </div>

          <div className="dg-dashboard-loading__line dg-dashboard-loading__line--large" />

          <div className="dg-dashboard-loading__line" />

          <div className="dg-dashboard-loading__cards">
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition
      variant={
        isFirstEntrance
          ? "dashboard"
          : "fade"
      }
      className="dg-dashboard-page"
    >
      <div className="dg-dashboard">

        {/* =================================================
            AMBIENT BACKGROUND
            ================================================= */}

        <div
          className="dg-dashboard__ambient dg-dashboard__ambient--one"
          aria-hidden="true"
        />

        <div
          className="dg-dashboard__ambient dg-dashboard__ambient--two"
          aria-hidden="true"
        />

        <div
          className="dg-dashboard__grid"
          aria-hidden="true"
        />

        {/* =================================================
            HEADER
            ================================================= */}

        <header className="dg-dashboard__header">

          <div className="dg-dashboard__welcome">

            <div className="dg-dashboard__eyebrow">
              <Sparkles size={13} />

              <span>
                Your personal study dashboard
              </span>
            </div>

            {/* TIME BASED GREETING */}

            <div className="dg-dashboard__name-row">
              {isEditingName ? (
                <form className="dg-dashboard__name-editor" onSubmit={(event) => { event.preventDefault(); saveDisplayName(); }}>
                  <input value={draftName} onChange={(event) => setDraftName(event.target.value)} maxLength={40} autoFocus aria-label="Display name" />
                  <button type="submit">Save</button>
                  <button type="button" onClick={() => setIsEditingName(false)}>Cancel</button>
                </form>
              ) : (
                <>
                  <span className="dg-dashboard__hey">Hey</span>
                  <span className="dg-dashboard__name">{displayName}</span>
                  <button type="button" className="dg-dashboard__edit-name" onClick={() => setIsEditingName(true)}>Edit</button>
                </>
              )}
            </div>

            <h1 className="dg-dashboard__greeting">

              <span className="dg-dashboard__greeting-video">
                <video
                  key={greetingData.video}
                  className="dg-dashboard__greeting-video-element"
                  src={greetingData.video}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  aria-hidden="true"
                />
              </span>

              <span className="dg-dashboard__greeting-text">
                {greetingData.text}
              </span>

            </h1>

            <p>
              Ready to reach your Daily Goal?
              Stay focused, study smarter and
              grow every day.
            </p>

            <span className="dg-dashboard__date">
              <Clock3 size={13} />
              {formatDate()}
            </span>

            <section className="dg-dashboard__thought" aria-live="polite">
              <div className="dg-dashboard__thought-icon"><Sparkles size={16} /></div>
              <div className="dg-dashboard__thought-body">
                <span>Daily Goal AI <b>•</b> Thought for you</span>
                <p>{thought.loading ? "Finding a fresh thought for you…" : `“${thought.quote}”`}</p>
                {!thought.loading && <small>— {thought.author}</small>}
              </div>
            </section>

          </div>

          <div className="dg-dashboard__header-actions">

            <Badge
              variant={aiStatus.variant}
              showIcon
              dot
              pulse={
                isLiveMode ||
                isMonitoring
              }
              glow={
                isLiveMode ||
                isMonitoring
              }
            >
              {aiStatus.label}
            </Badge>

            <Badge
              variant={
                isMonitoring
                  ? "active"
                  : "inactive"
              }
              dot
              pulse={isMonitoring}
            >
              {monitoringStatus}
            </Badge>

          </div>

        </header>

        {/* =================================================
            LIVE SESSION BAR
            ================================================= */}

        {(sessionIsRunning ||
          sessionIsPaused ||
          isMonitoring) && (
          <section className="dg-dashboard__live-bar">

            <div className="dg-dashboard__live-bar-left">

              <div className="dg-dashboard__live-pulse">
                <span />
                <Activity size={16} />
              </div>

              <div>
                <strong>
                  {sessionIsPaused
                    ? "Study Session Paused"
                    : "Study Session Active"}
                </strong>

                <span>
                  {formatDuration(
                    elapsedSeconds
                  )}
                  {" • "}
                  {isMonitoring
                    ? "Camera monitoring enabled"
                    : "Monitoring inactive"}
                </span>
              </div>

            </div>

            <div className="dg-dashboard__live-actions">

              {sessionIsPaused ? (
                <Button
                  size="sm"
                  variant="success"
                  icon={
                    <Play size={15} />
                  }
                  onClick={
                    handleResumeSession
                  }
                >
                  Resume
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="warning"
                  icon={
                    <TimerReset
                      size={15}
                    />
                  }
                  onClick={
                    handlePauseSession
                  }
                >
                  Pause
                </Button>
              )}

              <Button
                size="sm"
                variant="ghost"
                onClick={
                  handleStopSession
                }
              >
                Stop
              </Button>

            </div>

          </section>
        )}

        {/* =================================================
            KPI CARDS
            ================================================= */}

        <section
          className="dg-dashboard__stats"
          aria-label="Study statistics"
        >
          {quickStats.map(
            (item, index) => (
              <div
                className="dg-dashboard__stat-wrapper"
                key={item.id}
                style={{
                  "--dashboard-stagger":
                    `${index * 80}ms`,
                }}
              >
                <StatCard
                  {...item}
                  animate
                  elevated
                  glow={
                    item.id ===
                    "focus-score"
                  }
                />
              </div>
            )
          )}
        </section>

        {/* =================================================
            PRIMARY GRID
            ================================================= */}

        <section className="dg-dashboard__primary-grid">

          <div className="dg-dashboard__goal-panel">

            <DailyGoal
              targetSeconds={
                goalTargetSeconds
              }
              completedSeconds={
                goalCompletedSeconds
              }
              progress={
                goalProgress
              }
              remainingSeconds={
                goalRemainingSeconds
              }
              isCompleted={
                isGoalCompleted
              }
              isActive={
                sessionIsRunning
              }
              onStart={
                handleStartSession
              }
              onViewDetails={() => {
                window.location.href =
                  "/analytics";
              }}
            />

          </div>

          <div className="dg-dashboard__focus-panel">

            <FocusScore
              data={dashboardFocusChartData}
              score={
                metrics.focusScore
              }
              status={focusStatus}
              breakdown={breakdown}
              isLive={isLiveMode}
              isDemo={isDemoMode}
              title="Focus Score"
              subtitle="AI-powered concentration overview"
              showBreakdown
            />

          </div>

        </section>

        {/* =================================================
            SESSION CTA
            ================================================= */}

        {!sessionIsRunning &&
          !sessionIsPaused && (
            <section className="dg-dashboard__start-card">

              <div className="dg-dashboard__start-orb">
                <Camera size={25} />
              </div>

              <div className="dg-dashboard__start-content">

                <span className="dg-dashboard__start-eyebrow">
                  <Target size={13} />
                  Ready when you are
                </span>

                <h2>
                  Start a focused study session
                </h2>

                <p>
                  Let DAILY GOAL monitor your
                  focus and help you stay on track.
                </p>

              </div>

              <Button
                variant="primary"
                size="lg"
                icon={
                  <Play size={17} />
                }
                onClick={
                  handleStartSession
                }
                glow
              >
                Start Session
              </Button>

            </section>
          )}

        {/* =================================================
            SECONDARY GRID
            ================================================= */}

        <section className="dg-dashboard__secondary-grid">

          <div className="dg-dashboard__panel">

            <RecentAlerts
              alerts={alerts}
              maxItems={5}
              title="Recent Alerts"
              subtitle="Latest monitoring events"
              showHeader
              showViewAll
              showEmptyState
              onViewAll={() => {
                window.location.href =
                  "/alerts";
              }}
              onDismiss={
                dismissAlert
              }
            />

          </div>

          <div className="dg-dashboard__panel">

            <RecentSessions
              sessions={sessions}
              maxItems={5}
              title="Recent Sessions"
              subtitle="Your latest study activity"
              showHeader
              showViewAll
              showEmptyState
              onViewAll={() => {
                window.location.href =
                  "/sessions";
              }}
            />

          </div>

        </section>

        {/* =================================================
            FOOTER INSIGHT
            ================================================= */}

        <section className="dg-dashboard__insight">

          <div className="dg-dashboard__insight-icon">
            <TrendingUp size={19} />
          </div>

          <div className="dg-dashboard__insight-content">

            <span>
              <Sparkles size={12} />
              Smart Insight
            </span>

            <strong>
              {metrics.focusScore >= 75
                ? "You're building a strong focus habit."
                : metrics.studySeconds > 0
                ? "Small focused sessions can build momentum."
                : "Start your first session to unlock personalized insights."}
            </strong>

            <p>
              Your dashboard learns from your
              locally stored study activity and
              turns it into practical feedback.
            </p>

          </div>

          <button
            type="button"
            className="dg-dashboard__insight-link"
            onClick={() => {
              window.location.href =
                "/smart-report";
            }}
          >
            Smart Report
            <ArrowRight size={15} />
          </button>

        </section>

      </div>
    </PageTransition>
  );
};

export default Dashboard;