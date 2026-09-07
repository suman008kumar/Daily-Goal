import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Eye,
  Filter,
  Search,
  Target,
  Trash2,
  TrendingUp,
  X,
  XCircle,
  Zap,
} from "lucide-react";

import PageTransition from "../../components/Common/PageTransition";
import Badge from "../../components/Common/Badge";
import Button from "../../components/Common/Button";
import EmptyState from "../../components/Common/EmptyState";
import Modal from "../../components/Common/Modal";
import ConfirmDialog from "../../components/Common/ConfirmDialog";

import {
  deleteSession,
  getSessions,
} from "../../services/storageService";

import "./Sessions.css";

/* ==========================================================================
   CONSTANTS
   ========================================================================== */

const STATUS_OPTIONS = [
  {
    value: "all",
    label: "All Sessions",
  },
  {
    value: "COMPLETED",
    label: "Completed",
  },
  {
    value: "CANCELLED",
    label: "Cancelled",
  },
  {
    value: "PAUSED",
    label: "Paused",
  },
];

const SORT_OPTIONS = [
  {
    value: "newest",
    label: "Newest first",
  },
  {
    value: "oldest",
    label: "Oldest first",
  },
  {
    value: "focus-high",
    label: "Highest focus",
  },
  {
    value: "focus-low",
    label: "Lowest focus",
  },
  {
    value: "longest",
    label: "Longest session",
  },
];

const RANGE_OPTIONS = [
  {
    value: "all",
    label: "All time",
  },
  {
    value: "today",
    label: "Today",
  },
  {
    value: "week",
    label: "This week",
  },
  {
    value: "month",
    label: "This month",
  },
];

/* ==========================================================================
   HELPERS
   ========================================================================== */

const clamp = (
  value,
  min = 0,
  max = 100
) =>
  Math.min(
    max,
    Math.max(min, Number(value) || 0)
  );

const toNumber = (
  value,
  fallback = 0
) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
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

    const parts = value
      .split(":")
      .map(Number);

    if (
      parts.length === 3 &&
      parts.every(Number.isFinite)
    ) {
      return (
        parts[0] * 3600 +
        parts[1] * 60 +
        parts[2]
      );
    }

    if (
      parts.length === 2 &&
      parts.every(Number.isFinite)
    ) {
      return (
        parts[0] * 60 +
        parts[1]
      );
    }
  }

  return 0;
};

const getDate = (session) => {
  const value =
    session?.date ||
    session?.startTime ||
    session?.startedAt ||
    session?.createdAt ||
    session?.timestamp;

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
};

const getEndDate = (session) => {
  const value =
    session?.endTime ||
    session?.endedAt ||
    session?.completedAt ||
    session?.updatedAt;

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
};

const getDuration = (session) => {
  if (
    session?.durationSeconds != null
  ) {
    return toSeconds(
      session.durationSeconds
    );
  }

  if (session?.duration != null) {
    return toSeconds(
      session.duration
    );
  }

  const start = getDate(session);
  const end = getEndDate(session);

  if (
    start &&
    end &&
    end > start
  ) {
    return Math.floor(
      (end.getTime() -
        start.getTime()) /
        1000
    );
  }

  return 0;
};

const getFocus = (session) =>
  clamp(
    session?.focusScore ??
      session?.score ??
      session?.averageFocus ??
      session?.focus ??
      0
  );

const getDistraction = (
  session,
  duration
) => {
  if (
    session?.distractionSeconds !=
    null
  ) {
    return toSeconds(
      session.distractionSeconds
    );
  }

  if (
    session?.distractedTime != null
  ) {
    return toSeconds(
      session.distractedTime
    );
  }

  if (
    session?.distractionPercentage !=
    null
  ) {
    return (
      duration *
      clamp(
        session.distractionPercentage
      ) /
      100
    );
  }

  return 0;
};

const getPhone = (session) =>
  toSeconds(
    session?.phoneSeconds ??
      session?.phoneTime ??
      session?.phoneUsageSeconds ??
      0
  );

const getBreak = (session) =>
  toSeconds(
    session?.breakSeconds ??
      session?.breakTime ??
      0
  );

const getStatus = (session) => {
  const status = String(
    session?.status ||
      session?.state ||
      "COMPLETED"
  ).toUpperCase();

  return status;
};

const formatDuration = (seconds) => {
  const total = Math.max(
    0,
    Math.round(toNumber(seconds))
  );

  const hours = Math.floor(
    total / 3600
  );

  const minutes = Math.floor(
    (total % 3600) / 60
  );

  const secs = total % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }

  return `${secs}s`;
};

const formatCompactDuration = (
  seconds
) => {
  const total = Math.max(
    0,
    Math.round(toNumber(seconds))
  );

  const hours = Math.floor(
    total / 3600
  );

  const minutes = Math.floor(
    (total % 3600) / 60
  );

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
};

const formatDate = (date) => {
  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  ).format(date);
};

const formatTime = (date) => {
  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      hour: "numeric",
      minute: "2-digit",
    }
  ).format(date);
};

const formatDateTime = (date) => {
  if (!date) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    undefined,
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  ).format(date);
};

const getFocusLabel = (score) => {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 60)
    return "Needs Attention";

  return "Low Focus";
};

const getFocusVariant = (score) => {
  if (score >= 90) return "success";
  if (score >= 75) return "accent";
  if (score >= 60) return "warning";

  return "danger";
};

const getStatusVariant = (status) => {
  switch (status) {
    case "COMPLETED":
      return "success";

    case "CANCELLED":
      return "danger";

    case "PAUSED":
      return "warning";

    case "RUNNING":
      return "active";

    default:
      return "default";
  }
};

const getStatusLabel = (status) => {
  switch (status) {
    case "COMPLETED":
      return "Completed";

    case "CANCELLED":
      return "Cancelled";

    case "PAUSED":
      return "Paused";

    case "RUNNING":
      return "Running";

    case "IDLE":
      return "Idle";

    default:
      return status || "Unknown";
  }
};

const matchesDateRange = (
  date,
  range
) => {
  if (!date || range === "all") {
    return true;
  }

  const now = new Date();

  if (range === "today") {
    return (
      date.getFullYear() ===
        now.getFullYear() &&
      date.getMonth() ===
        now.getMonth() &&
      date.getDate() ===
        now.getDate()
    );
  }

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (range === "week") {
    const day = start.getDay();
    const difference =
      day === 0 ? 6 : day - 1;

    start.setDate(
      start.getDate() - difference
    );

    return date >= start;
  }

  if (range === "month") {
    start.setDate(1);

    return date >= start;
  }

  return true;
};

const normalizeSession = (
  session,
  index
) => {
  const date = getDate(session);

  const duration =
    getDuration(session);

  const distraction =
    getDistraction(
      session,
      duration
    );

  const phone = getPhone(session);

  const breakTime =
    getBreak(session);

  const focused =
    session?.focusedSeconds != null
      ? toSeconds(
          session.focusedSeconds
        )
      : session?.focusedTime != null
      ? toSeconds(
          session.focusedTime
        )
      : Math.max(
          0,
          duration - distraction
        );

  return {
    ...session,

    _index: index,

    _id:
      session?.id ??
      session?.sessionId ??
      `session-${index}`,

    _date: date,

    _duration: duration,

    _focus: getFocus(session),

    _focused: focused,

    _distraction: distraction,

    _phone: phone,

    _break: breakTime,

    _status: getStatus(session),
  };
};

/* ==========================================================================
   STAT CARD
   ========================================================================== */

const SummaryCard = ({
  icon: Icon,
  label,
  value,
  detail,
  tone = "accent",
  index = 0,
}) => {
  return (
    <article
      className={`sessions-summary-card sessions-summary-card--${tone}`}
      style={{
        "--sessions-delay": `${
          index * 70
        }ms`,
      }}
    >
      <div className="sessions-summary-top">
        <span className="sessions-summary-icon">
          <Icon size={19} />
        </span>

        <span className="sessions-summary-dot" />
      </div>

      <span className="sessions-summary-label">
        {label}
      </span>

      <strong className="sessions-summary-value">
        {value}
      </strong>

      {detail && (
        <span className="sessions-summary-detail">
          {detail}
        </span>
      )}
    </article>
  );
};

/* ==========================================================================
   SESSION ROW
   ========================================================================== */

const SessionRow = ({
  session,
  index,
  onView,
  onDelete,
}) => {
  const focus = session._focus;

  return (
    <article
      className="sessions-row"
      style={{
        "--sessions-delay": `${
          index * 45
        }ms`,
      }}
    >
      <div className="sessions-row-main">
        <div className="sessions-row-date">
          <div className="sessions-row-date-icon">
            <CalendarDays size={17} />
          </div>

          <div>
            <strong>
              {formatDate(
                session._date
              )}
            </strong>

            <span>
              {formatTime(
                session._date
              )}
            </span>
          </div>
        </div>

        <div className="sessions-row-duration">
          <Clock3 size={15} />
          <span>
            {formatDuration(
              session._duration
            )}
          </span>
        </div>

        <div className="sessions-row-focus">
          <div className="sessions-focus-score">
            <span
              className={`sessions-focus-dot sessions-focus-dot--${getFocusVariant(
                focus
              )}`}
            />

            <strong>
              {Math.round(focus)}
            </strong>

            <span>/100</span>
          </div>

          <Badge
            variant={getFocusVariant(
              focus
            )}
            size="sm"
            soft
          >
            {getFocusLabel(focus)}
          </Badge>
        </div>

        <div className="sessions-row-distraction">
          <span>Distraction</span>

          <strong>
            {formatCompactDuration(
              session._distraction
            )}
          </strong>
        </div>

        <div className="sessions-row-phone">
          <span>Phone</span>

          <strong>
            {formatCompactDuration(
              session._phone
            )}
          </strong>
        </div>

        <div className="sessions-row-status">
          <Badge
            variant={getStatusVariant(
              session._status
            )}
            dot
            size="sm"
          >
            {getStatusLabel(
              session._status
            )}
          </Badge>
        </div>

        <div className="sessions-row-actions">
          <button
            type="button"
            className="sessions-icon-button"
            onClick={() =>
              onView(session)
            }
            aria-label="View session"
            title="View session"
          >
            <Eye size={16} />
          </button>

          <button
            type="button"
            className="sessions-icon-button sessions-icon-button--danger"
            onClick={() =>
              onDelete(session)
            }
            aria-label="Delete session"
            title="Delete session"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </article>
  );
};

/* ==========================================================================
   DETAIL ROW
   ========================================================================== */

const DetailItem = ({
  icon: Icon,
  label,
  value,
}) => (
  <div className="sessions-detail-item">
    <div className="sessions-detail-icon">
      <Icon size={16} />
    </div>

    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  </div>
);

/* ==========================================================================
   MAIN
   ========================================================================== */

const Sessions = () => {
  const [sessions, setSessions] =
    useState([]);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [rangeFilter, setRangeFilter] =
    useState("all");

  const [sortBy, setSortBy] =
    useState("newest");

  const [showFilters, setShowFilters] =
    useState(false);

  const [selectedSession, setSelectedSession] =
    useState(null);

  const [deleteTarget, setDeleteTarget] =
    useState(null);

  const [isDeleting, setIsDeleting] =
    useState(false);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadSessions =
    useCallback(async () => {
      setIsLoading(true);
      setError("");

      try {
        const result =
          await Promise.resolve(
            getSessions()
          );

        setSessions(
          Array.isArray(result)
            ? result
            : []
        );
      } catch (loadError) {
        console.error(
          "Unable to load sessions:",
          loadError
        );

        setSessions([]);

        setError(
          "Unable to load your saved sessions."
        );
      } finally {
        setIsLoading(false);
      }
    }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  /* ---------------------------------------------------------------------- */
  /* Normalized sessions                                                     */
  /* ---------------------------------------------------------------------- */

  const normalizedSessions =
    useMemo(
      () =>
        sessions
          .map(normalizeSession)
          .filter(
            (session) =>
              session._date !== null
          ),
      [sessions]
    );

  /* ---------------------------------------------------------------------- */
  /* Filtered sessions                                                       */
  /* ---------------------------------------------------------------------- */

  const filteredSessions =
    useMemo(() => {
      const query =
        search.trim().toLowerCase();

      const result =
        normalizedSessions.filter(
          (session) => {
            const matchesSearch =
              !query ||
              String(
                session._id
              )
                .toLowerCase()
                .includes(query) ||
              formatDate(
                session._date
              )
                .toLowerCase()
                .includes(query) ||
              getStatusLabel(
                session._status
              )
                .toLowerCase()
                .includes(query);

            const matchesStatus =
              statusFilter === "all" ||
              session._status ===
                statusFilter;

            const matchesRange =
              matchesDateRange(
                session._date,
                rangeFilter
              );

            return (
              matchesSearch &&
              matchesStatus &&
              matchesRange
            );
          }
        );

      return [...result].sort(
        (a, b) => {
          switch (sortBy) {
            case "oldest":
              return (
                a._date.getTime() -
                b._date.getTime()
              );

            case "focus-high":
              return (
                b._focus -
                a._focus
              );

            case "focus-low":
              return (
                a._focus -
                b._focus
              );

            case "longest":
              return (
                b._duration -
                a._duration
              );

            case "newest":
            default:
              return (
                b._date.getTime() -
                a._date.getTime()
              );
          }
        }
      );
    }, [
      normalizedSessions,
      search,
      statusFilter,
      rangeFilter,
      sortBy,
    ]);

  /* ---------------------------------------------------------------------- */
  /* Summary                                                                 */
  /* ---------------------------------------------------------------------- */

  const summary = useMemo(() => {
    const total = filteredSessions.length;

    const completed =
      filteredSessions.filter(
        (session) =>
          session._status ===
          "COMPLETED"
      ).length;

    const totalDuration =
      filteredSessions.reduce(
        (sum, session) =>
          sum + session._duration,
        0
      );

    const totalFocused =
      filteredSessions.reduce(
        (sum, session) =>
          sum + session._focused,
        0
      );

    const totalDistraction =
      filteredSessions.reduce(
        (sum, session) =>
          sum + session._distraction,
        0
      );

    const totalPhone =
      filteredSessions.reduce(
        (sum, session) =>
          sum + session._phone,
        0
      );

    const averageFocus =
      filteredSessions.length
        ? filteredSessions.reduce(
            (sum, session) =>
              sum + session._focus,
            0
          ) / filteredSessions.length
        : 0;

    return {
      total,
      completed,
      totalDuration,
      totalFocused,
      totalDistraction,
      totalPhone,
      averageFocus,
    };
  }, [filteredSessions]);

  /* ---------------------------------------------------------------------- */
  /* Clear filters                                                           */
  /* ---------------------------------------------------------------------- */

  const hasFilters =
    Boolean(search.trim()) ||
    statusFilter !== "all" ||
    rangeFilter !== "all";

  const clearFilters =
    useCallback(() => {
      setSearch("");
      setStatusFilter("all");
      setRangeFilter("all");
      setSortBy("newest");
    }, []);

  /* ---------------------------------------------------------------------- */
  /* Delete                                                                  */
  /* ---------------------------------------------------------------------- */

  const handleDelete = useCallback(
    async () => {
      if (!deleteTarget) {
        return;
      }

      setIsDeleting(true);

      try {
        await Promise.resolve(
          deleteSession(
            deleteTarget._id
          )
        );

        setSessions((current) =>
          current.filter(
            (session) =>
              String(
                session.id ??
                  session.sessionId
              ) !==
              String(
                deleteTarget._id
              )
          )
        );

        setDeleteTarget(null);

        if (
          selectedSession &&
          String(
            selectedSession._id
          ) ===
            String(deleteTarget._id)
        ) {
          setSelectedSession(null);
        }
      } catch (deleteError) {
        console.error(
          "Unable to delete session:",
          deleteError
        );

        setError(
          "Unable to delete this session. Please try again."
        );
      } finally {
        setIsDeleting(false);
      }
    },
    [
      deleteTarget,
      selectedSession,
    ]
  );

  /* ---------------------------------------------------------------------- */
  /* Loading                                                                 */
  /* ---------------------------------------------------------------------- */

  if (isLoading) {
    return (
      <PageTransition>
        <div className="sessions-page sessions-page--loading">
          <div className="sessions-loader">
            <div className="sessions-loader-ring" />

            <Activity size={28} />
          </div>

          <h2>
            Loading study sessions
          </h2>

          <p>
            Preparing your study history...
          </p>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <main className="sessions-page">
        <div className="sessions-background">
          <span className="sessions-orb sessions-orb--one" />
          <span className="sessions-orb sessions-orb--two" />
          <span className="sessions-orb sessions-orb--three" />
          <span className="sessions-grid" />
        </div>

        <div className="sessions-container">
          {/* ============================================================ */}
          {/* HEADER                                                       */}
          {/* ============================================================ */}

          <header className="sessions-header">
            <div className="sessions-heading">
              <div className="sessions-heading-icon">
                <Clock3 size={23} />
              </div>

              <div>
                <div className="sessions-eyebrow">
                  <span />
                  Study History
                </div>

                <h1>Study Sessions</h1>

                <p>
                  Review your study time,
                  focus quality and session
                  performance.
                </p>
              </div>
            </div>

            <div className="sessions-header-actions">
              <Badge
                variant="active"
                dot
              >
                {summary.total} Session
                {summary.total === 1
                  ? ""
                  : "s"}
              </Badge>
            </div>
          </header>

          {/* ============================================================ */}
          {/* SUMMARY                                                      */}
          {/* ============================================================ */}

          <section className="sessions-summary">
            <SummaryCard
              icon={BarChart3}
              label="Total Sessions"
              value={summary.total}
              detail={`${summary.completed} completed`}
              tone="primary"
              index={0}
            />

            <SummaryCard
              icon={Clock3}
              label="Study Time"
              value={formatCompactDuration(
                summary.totalDuration
              )}
              detail={`${formatCompactDuration(
                summary.totalFocused
              )} focused`}
              tone="accent"
              index={1}
            />

            <SummaryCard
              icon={Target}
              label="Average Focus"
              value={`${Math.round(
                summary.averageFocus
              )}/100`}
              detail={getFocusLabel(
                summary.averageFocus
              )}
              tone="success"
              index={2}
            />

            <SummaryCard
              icon={Zap}
              label="Distraction"
              value={formatCompactDuration(
                summary.totalDistraction
              )}
              detail={`${formatCompactDuration(
                summary.totalPhone
              )} phone`}
              tone="warning"
              index={3}
            />
          </section>

          {/* ============================================================ */}
          {/* TOOLBAR                                                       */}
          {/* ============================================================ */}

          <section className="sessions-toolbar">
            <div className="sessions-search">
              <Search size={17} />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search sessions..."
                aria-label="Search sessions"
              />

              {search && (
                <button
                  type="button"
                  className="sessions-search-clear"
                  onClick={() =>
                    setSearch("")
                  }
                  aria-label="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <div className="sessions-toolbar-actions">
              <button
                type="button"
                className={`sessions-filter-button ${
                  showFilters
                    ? "is-active"
                    : ""
                }`}
                onClick={() =>
                  setShowFilters(
                    (current) =>
                      !current
                  )
                }
              >
                <Filter size={16} />
                Filters

                {hasFilters && (
                  <span className="sessions-filter-count">
                    •
                  </span>
                )}
              </button>

              <label className="sessions-sort">
                <span>Sort</span>

                <select
                  value={sortBy}
                  onChange={(event) =>
                    setSortBy(
                      event.target.value
                    )
                  }
                >
                  {SORT_OPTIONS.map(
                    (option) => (
                      <option
                        key={
                          option.value
                        }
                        value={
                          option.value
                        }
                      >
                        {option.label}
                      </option>
                    )
                  )}
                </select>

                <ChevronDown
                  size={14}
                />
              </label>
            </div>
          </section>

          {/* ============================================================ */}
          {/* FILTER PANEL                                                  */}
          {/* ============================================================ */}

          {showFilters && (
            <section className="sessions-filter-panel">
              <div className="sessions-filter-group">
                <span>Status</span>

                <div className="sessions-filter-options">
                  {STATUS_OPTIONS.map(
                    (option) => (
                      <button
                        key={
                          option.value
                        }
                        type="button"
                        className={
                          statusFilter ===
                          option.value
                            ? "is-active"
                            : ""
                        }
                        onClick={() =>
                          setStatusFilter(
                            option.value
                          )
                        }
                      >
                        {option.label}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="sessions-filter-group">
                <span>Period</span>

                <div className="sessions-filter-options">
                  {RANGE_OPTIONS.map(
                    (option) => (
                      <button
                        key={
                          option.value
                        }
                        type="button"
                        className={
                          rangeFilter ===
                          option.value
                            ? "is-active"
                            : ""
                        }
                        onClick={() =>
                          setRangeFilter(
                            option.value
                          )
                        }
                      >
                        {option.label}
                      </button>
                    )
                  )}
                </div>
              </div>

              {hasFilters && (
                <button
                  type="button"
                  className="sessions-clear-filters"
                  onClick={
                    clearFilters
                  }
                >
                  Clear filters
                </button>
              )}
            </section>
          )}

          {/* ============================================================ */}
          {/* ERROR                                                         */}
          {/* ============================================================ */}

          {error && (
            <div className="sessions-error">
              <XCircle size={17} />

              <span>{error}</span>

              <button
                type="button"
                onClick={() => {
                  setError("");
                  loadSessions();
                }}
              >
                Retry
              </button>
            </div>
          )}

          {/* ============================================================ */}
          {/* RESULT INFO                                                   */}
          {/* ============================================================ */}

          <div className="sessions-result-bar">
            <div>
              Showing{" "}
              <strong>
                {filteredSessions.length}
              </strong>{" "}
              of{" "}
              <strong>
                {normalizedSessions.length}
              </strong>{" "}
              sessions
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
              >
                Reset
              </button>
            )}
          </div>

          {/* ============================================================ */}
          {/* SESSION LIST                                                   */}
          {/* ============================================================ */}

          {filteredSessions.length ? (
            <section className="sessions-list">
              <div className="sessions-list-header">
                <span>Session</span>
                <span>Duration</span>
                <span>Focus</span>
                <span>Distraction</span>
                <span>Phone</span>
                <span>Status</span>
                <span>Actions</span>
              </div>

              <div className="sessions-list-body">
                {filteredSessions.map(
                  (session, index) => (
                    <SessionRow
                      key={
                        session._id
                      }
                      session={
                        session
                      }
                      index={index}
                      onView={
                        setSelectedSession
                      }
                      onDelete={
                        setDeleteTarget
                      }
                    />
                  )
                )}
              </div>
            </section>
          ) : (
            <section className="sessions-empty">
              {normalizedSessions.length ? (
                <EmptyState
                  iconKey="search"
                  title="No sessions found"
                  description="Try changing your search or filters to find another study session."
                  action={{
                    label:
                      "Clear Filters",
                    variant:
                      "outline",
                    onClick:
                      clearFilters,
                  }}
                />
              ) : (
                <EmptyState
                  iconKey="sessions"
                  title="No study sessions yet"
                  description="Start your first study session and your progress will appear here automatically."
                />
              )}
            </section>
          )}
        </div>

        {/* ================================================================ */}
        {/* SESSION DETAIL MODAL                                              */}
        {/* ================================================================ */}

        <Modal
          open={
            Boolean(
              selectedSession
            )
          }
          onClose={() =>
            setSelectedSession(null)
          }
          title="Session Details"
          subtitle={
            selectedSession
              ? formatDateTime(
                  selectedSession._date
                )
              : ""
          }
          size="lg"
          showIcon
          variant="info"
        >
          {selectedSession && (
            <div className="sessions-detail">
              <div className="sessions-detail-hero">
                <div>
                  <span>
                    Focus Score
                  </span>

                  <strong>
                    {Math.round(
                      selectedSession._focus
                    )}
                    <small>
                      /100
                    </small>
                  </strong>

                  <Badge
                    variant={getFocusVariant(
                      selectedSession._focus
                    )}
                    soft
                  >
                    {getFocusLabel(
                      selectedSession._focus
                    )}
                  </Badge>
                </div>

                <div className="sessions-detail-ring">
                  <div
                    className="sessions-detail-ring-progress"
                    style={{
                      "--session-score":
                        `${clamp(
                          selectedSession._focus
                        )}%`,
                    }}
                  >
                    <Target
                      size={21}
                    />
                  </div>
                </div>
              </div>

              <div className="sessions-detail-grid">
                <DetailItem
                  icon={CalendarDays}
                  label="Date"
                  value={formatDate(
                    selectedSession._date
                  )}
                />

                <DetailItem
                  icon={Clock3}
                  label="Start Time"
                  value={formatTime(
                    selectedSession._date
                  )}
                />

                <DetailItem
                  icon={TrendingUp}
                  label="Duration"
                  value={formatDuration(
                    selectedSession._duration
                  )}
                />

                <DetailItem
                  icon={CheckCircle2}
                  label="Focused Time"
                  value={formatDuration(
                    selectedSession._focused
                  )}
                />

                <DetailItem
                  icon={Activity}
                  label="Distraction"
                  value={formatDuration(
                    selectedSession._distraction
                  )}
                />

                <DetailItem
                  icon={Zap}
                  label="Phone Usage"
                  value={formatDuration(
                    selectedSession._phone
                  )}
                />

                <DetailItem
                  icon={CalendarDays}
                  label="Break Time"
                  value={formatDuration(
                    selectedSession._break
                  )}
                />

                <DetailItem
                  icon={CheckCircle2}
                  label="Status"
                  value={getStatusLabel(
                    selectedSession._status
                  )}
                />
              </div>

              <div className="sessions-detail-footer">
                <Button
                  variant="danger"
                  icon={
                    <Trash2
                      size={16}
                    />
                  }
                  onClick={() => {
                    setSelectedSession(
                      null
                    );
                    setDeleteTarget(
                      selectedSession
                    );
                  }}
                >
                  Delete Session
                </Button>

                <Button
                  variant="outline"
                  onClick={() =>
                    setSelectedSession(
                      null
                    )
                  }
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* ================================================================ */}
        {/* DELETE CONFIRMATION                                               */}
        {/* ================================================================ */}

        <ConfirmDialog
          open={
            Boolean(deleteTarget)
          }
          title="Delete Study Session?"
          message={
            deleteTarget
              ? `The session from ${formatDate(
                  deleteTarget._date
                )} will be permanently removed from your study history.`
              : ""
          }
          variant="danger"
          confirmLabel="Delete Session"
          cancelLabel="Keep Session"
          loading={isDeleting}
          loadingLabel="Deleting..."
          destructive
          onConfirm={
            handleDelete
          }
          onClose={() =>
            !isDeleting &&
            setDeleteTarget(null)
          }
        />
      </main>
    </PageTransition>
  );
};

export default Sessions;