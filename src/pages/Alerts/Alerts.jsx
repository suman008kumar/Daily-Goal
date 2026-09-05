import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  AlertTriangle,
  Bell,
  BellOff,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Eye,
  EyeOff,
  Filter,
  Info,
  RefreshCw,
  Search,
  ShieldAlert,
  Smartphone,
  Sparkles,
  Trash2,
  UserRound,
  UsersRound,
  X,
  Zap,
} from "lucide-react";

import PageTransition from "../../components/Common/PageTransition";
import Badge from "../../components/Common/Badge";
import Button from "../../components/Common/Button";
import Modal from "../../components/Common/Modal";
import ConfirmDialog from "../../components/Common/ConfirmDialog";
import EmptyState from "../../components/Common/EmptyState";

import {
  getAlerts,
  saveAlerts,
} from "../../services/storageService";

import "./Alerts.css";

/* =========================================================
   CONFIG
========================================================= */

const ALERT_TYPES = {
  PHONE: {
    label: "Phone Usage",
    icon: Smartphone,
    tone: "warning",
  },

  EYES_CLOSED: {
    label: "Eyes Closed",
    icon: EyeOff,
    tone: "warning",
  },

  DROWSY: {
    label: "Drowsiness",
    icon: Sparkles,
    tone: "danger",
  },

  LOOKING_AWAY: {
    label: "Looking Away",
    icon: Eye,
    tone: "warning",
  },

  FACE_MISSING: {
    label: "Face Missing",
    icon: UserRound,
    tone: "danger",
  },

  PERSON_LEFT: {
    label: "Person Left",
    icon: UserRound,
    tone: "warning",
  },

  MULTIPLE_PERSON: {
    label: "Multiple People",
    icon: UsersRound,
    tone: "danger",
  },

  BREAK_OVER: {
    label: "Break Over",
    icon: Clock3,
    tone: "info",
  },

  SESSION_END: {
    label: "Session End",
    icon: CheckCircle2,
    tone: "success",
  },

  LONG_DISTRACTION: {
    label: "Long Distraction",
    icon: Zap,
    tone: "warning",
  },
};

const ALERT_LEVELS = {
  INFO: {
    label: "Info",
    tone: "info",
    icon: Info,
  },

  WARNING: {
    label: "Warning",
    tone: "warning",
    icon: AlertTriangle,
  },

  CRITICAL: {
    label: "Critical",
    tone: "danger",
    icon: ShieldAlert,
  },

  SUCCESS: {
    label: "Success",
    tone: "success",
    icon: CheckCircle2,
  },
};

const STATUS_OPTIONS = [
  {
    value: "all",
    label: "All Status",
  },
  {
    value: "unread",
    label: "Unread",
  },
  {
    value: "read",
    label: "Read",
  },
  {
    value: "resolved",
    label: "Resolved",
  },
];

const TYPE_OPTIONS = [
  {
    value: "all",
    label: "All Types",
  },
  ...Object.entries(ALERT_TYPES).map(([value, config]) => ({
    value,
    label: config.label,
  })),
];

const LEVEL_OPTIONS = [
  {
    value: "all",
    label: "All Severity",
  },
  ...Object.entries(ALERT_LEVELS).map(([value, config]) => ({
    value,
    label: config.label,
  })),
];

/* =========================================================
   HELPERS
========================================================= */

const normalizeType = (type) =>
  String(type || "")
    .trim()
    .toUpperCase();

const normalizeLevel = (level) =>
  String(level || "INFO")
    .trim()
    .toUpperCase();

const getAlertTypeConfig = (type) =>
  ALERT_TYPES[normalizeType(type)] || {
    label: "Alert",
    icon: AlertCircle,
    tone: "info",
  };

const getAlertLevelConfig = (level) =>
  ALERT_LEVELS[normalizeLevel(level)] || ALERT_LEVELS.INFO;

const getAlertTimestamp = (alert) =>
  alert?.timestamp ||
  alert?.createdAt ||
  alert?.time ||
  alert?.date ||
  null;

const getAlertTitle = (alert) => {
  if (alert?.title) return alert.title;

  return getAlertTypeConfig(alert?.type).label;
};

const getAlertMessage = (alert) =>
  alert?.message ||
  alert?.description ||
  "Monitoring activity was detected.";

const getAlertId = (alert, index) =>
  alert?.id ||
  alert?._id ||
  `${getAlertTimestamp(alert) || "alert"}-${index}`;

const getConfidence = (alert) => {
  const value = Number(alert?.confidence);

  if (!Number.isFinite(value)) return null;

  if (value <= 1) {
    return Math.round(value * 100);
  }

  return Math.round(value);
};

const isResolved = (alert) =>
  Boolean(
    alert?.resolved ||
      alert?.isResolved ||
      String(alert?.status || "").toLowerCase() === "resolved"
  );

const isRead = (alert) =>
  Boolean(
    alert?.read ||
      alert?.isRead ||
      alert?.seen ||
      isResolved(alert)
  );

const getTimeValue = (timestamp) => {
  const value = new Date(timestamp || 0).getTime();

  return Number.isFinite(value) ? value : 0;
};

const formatDate = (timestamp) => {
  if (!timestamp) return "Unknown date";

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const formatTime = (timestamp) => {
  if (!timestamp) return "--:--";

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const formatDateTime = (timestamp) => {
  if (!timestamp) return "Unknown";

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return "Unknown time";

  const time = new Date(timestamp).getTime();

  if (!Number.isFinite(time)) {
    return "Unknown time";
  }

  const diff = Date.now() - time;

  if (diff < 0) {
    return "Just now";
  }

  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) {
    return "Just now";
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days}d ago`;
  }

  return formatDate(timestamp);
};

const matchesDateFilter = (timestamp, filter) => {
  if (filter === "all") return true;

  if (!timestamp) return false;

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const now = new Date();

  if (filter === "today") {
    return date.toDateString() === now.toDateString();
  }

  if (filter === "week") {
    const start = new Date(now);

    start.setDate(now.getDate() - 7);

    return date >= start;
  }

  if (filter === "month") {
    const start = new Date(now);

    start.setMonth(now.getMonth() - 1);

    return date >= start;
  }

  return true;
};

/* =========================================================
   ALERT ICON
========================================================= */

const AlertTypeIcon = ({
  type,
  level,
  size = 20,
}) => {
  const typeConfig = getAlertTypeConfig(type);
  const levelConfig = getAlertLevelConfig(level);

  const Icon =
    typeConfig.icon ||
    levelConfig.icon ||
    AlertCircle;

  return (
    <span
      className={`alerts-page__alert-icon alerts-page__alert-icon--${typeConfig.tone}`}
    >
      <Icon size={size} strokeWidth={2.2} />
    </span>
  );
};

/* =========================================================
   SUMMARY CARD
========================================================= */

const SummaryCard = ({
  label,
  value,
  icon,
  tone = "default",
  detail,
  index = 0,
}) => {
  const Icon = icon || Bell;

  return (
    <article
      className={`alerts-page__summary-card alerts-page__summary-card--${tone}`}
      style={{
        "--alerts-index": index,
      }}
    >
      <div className="alerts-page__summary-icon">
        <Icon size={20} strokeWidth={2.2} />
      </div>

      <div className="alerts-page__summary-content">
        <span className="alerts-page__summary-label">
          {label}
        </span>

        <strong className="alerts-page__summary-value">
          {value}
        </strong>

        {detail && (
          <span className="alerts-page__summary-detail">
            {detail}
          </span>
        )}
      </div>

      <span className="alerts-page__summary-glow" />
    </article>
  );
};

/* =========================================================
   ALERT ROW
========================================================= */

const AlertRow = ({
  alert,
  index,
  onOpen,
  onDismiss,
  onResolve,
}) => {
  const type = normalizeType(alert?.type);
  const level = normalizeLevel(alert?.level);

  const typeConfig = getAlertTypeConfig(type);
  const levelConfig = getAlertLevelConfig(level);

  const read = isRead(alert);
  const resolved = isResolved(alert);
  const confidence = getConfidence(alert);
  const timestamp = getAlertTimestamp(alert);

  return (
    <article
      className={[
        "alerts-page__row",
        !read && "alerts-page__row--unread",
        resolved && "alerts-page__row--resolved",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        "--alerts-index": index,
      }}
      onClick={() => onOpen(alert)}
    >
      <div className="alerts-page__row-main">
        <AlertTypeIcon
          type={type}
          level={level}
        />

        <div className="alerts-page__row-content">
          <div className="alerts-page__row-heading">
            <h3>{getAlertTitle(alert)}</h3>

            {!read && (
              <span className="alerts-page__unread-dot" />
            )}
          </div>

          <p>{getAlertMessage(alert)}</p>

          <div className="alerts-page__row-meta">
            <span>
              <Clock3 size={13} />
              {formatRelativeTime(timestamp)}
            </span>

            <span className="alerts-page__meta-separator">
              •
            </span>

            <span>
              {formatTime(timestamp)}
            </span>

            {confidence !== null && (
              <>
                <span className="alerts-page__meta-separator">
                  •
                </span>

                <span>
                  {confidence}% confidence
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="alerts-page__row-side">
        <Badge
          variant={levelConfig.tone}
          size="sm"
          soft
          dot
        >
          {levelConfig.label}
        </Badge>

        <Badge
          variant={resolved ? "success" : read ? "default" : "primary"}
          size="sm"
          soft
        >
          {resolved
            ? "Resolved"
            : read
              ? "Read"
              : "Unread"}
        </Badge>

        <div
          className="alerts-page__row-actions"
          onClick={(event) => event.stopPropagation()}
        >
          {!resolved && onResolve && (
            <button
              type="button"
              className="alerts-page__icon-button"
              title="Resolve alert"
              aria-label="Resolve alert"
              onClick={() => onResolve(alert)}
            >
              <CheckCircle2 size={17} />
            </button>
          )}

          {onDismiss && (
            <button
              type="button"
              className="alerts-page__icon-button alerts-page__icon-button--danger"
              title="Dismiss alert"
              aria-label="Dismiss alert"
              onClick={() => onDismiss(alert)}
            >
              <X size={17} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

/* =========================================================
   PAGE
========================================================= */

const Alerts = () => {
  const [alerts, setAlerts] = useState([]);

  const [search, setSearch] = useState("");

  const [typeFilter, setTypeFilter] =
    useState("all");

  const [levelFilter, setLevelFilter] =
    useState("all");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [dateFilter, setDateFilter] =
    useState("all");

  const [sortOrder, setSortOrder] =
    useState("newest");

  const [selectedAlert, setSelectedAlert] =
    useState(null);

  const [showClearDialog, setShowClearDialog] =
    useState(false);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [relativeTick, setRelativeTick] =
    useState(0);

  /* =======================================================
     LOAD ALERTS
  ======================================================= */

  const loadAlerts = useCallback(() => {
    try {
      const stored = getAlerts();

      setAlerts(
        Array.isArray(stored)
          ? stored
          : []
      );
    } catch (error) {
      console.error(
        "Unable to load alerts:",
        error
      );

      setAlerts([]);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  /* =======================================================
     RELATIVE TIME REFRESH
  ======================================================= */

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRelativeTick((value) => value + 1);
    }, 30000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  /* =======================================================
     REFRESH
  ======================================================= */

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);

    window.setTimeout(() => {
      loadAlerts();
      setIsRefreshing(false);
    }, 450);
  }, [loadAlerts]);

  /* =======================================================
     UPDATE ALERTS
  ======================================================= */

  const updateAlert = useCallback(
    (targetAlert, updater) => {
      const targetId =
        targetAlert?.id ||
        targetAlert?._id;

      const nextAlerts = alerts.map(
        (alert, index) => {
          const currentId =
            alert?.id ||
            alert?._id;

          const sameById =
            targetId &&
            currentId &&
            String(targetId) ===
              String(currentId);

          const sameByReference =
            alert === targetAlert;

          if (
            !sameById &&
            !sameByReference
          ) {
            return alert;
          }

          return updater(alert, index);
        }
      );

      setAlerts(nextAlerts);
      saveAlerts(nextAlerts);

      return nextAlerts;
    },
    [alerts]
  );

  /* =======================================================
     OPEN ALERT
  ======================================================= */

  const handleOpenAlert = useCallback(
    (alert) => {
      setSelectedAlert(alert);

      updateAlert(
        alert,
        (current) => ({
          ...current,
          read: true,
          isRead: true,
          seen: true,
        })
      );
    },
    [updateAlert]
  );

  /* =======================================================
     RESOLVE
  ======================================================= */

  const handleResolve = useCallback(
    (alert) => {
      updateAlert(
        alert,
        (current) => ({
          ...current,
          read: true,
          isRead: true,
          resolved: true,
          isResolved: true,
          status: "resolved",
        })
      );

      setSelectedAlert((current) => {
        if (!current) return current;

        const selectedId =
          current.id ||
          current._id;

        const alertId =
          alert.id ||
          alert._id;

        if (
          selectedId &&
          alertId &&
          String(selectedId) ===
            String(alertId)
        ) {
          return {
            ...current,
            read: true,
            isRead: true,
            resolved: true,
            isResolved: true,
            status: "resolved",
          };
        }

        return current;
      });
    },
    [updateAlert]
  );

  /* =======================================================
     DISMISS
  ======================================================= */

  const handleDismiss = useCallback(
    (alert) => {
      const targetId =
        alert?.id ||
        alert?._id;

      const nextAlerts = alerts.filter(
        (item) => {
          const itemId =
            item?.id ||
            item?._id;

          if (
            targetId &&
            itemId
          ) {
            return (
              String(itemId) !==
              String(targetId)
            );
          }

          return item !== alert;
        }
      );

      setAlerts(nextAlerts);
      saveAlerts(nextAlerts);

      setSelectedAlert((current) => {
        if (!current) return null;

        const currentId =
          current.id ||
          current._id;

        if (
          targetId &&
          currentId &&
          String(targetId) ===
            String(currentId)
        ) {
          return null;
        }

        return current;
      });
    },
    [alerts]
  );

  /* =======================================================
     CLEAR ALL
  ======================================================= */

  const handleClearAll = useCallback(() => {
    setAlerts([]);
    saveAlerts([]);
    setSelectedAlert(null);
    setShowClearDialog(false);
  }, []);

  /* =======================================================
     MARK ALL READ
  ======================================================= */

  const handleMarkAllRead = useCallback(() => {
    const nextAlerts = alerts.map(
      (alert) => ({
        ...alert,
        read: true,
        isRead: true,
        seen: true,
      })
    );

    setAlerts(nextAlerts);
    saveAlerts(nextAlerts);
  }, [alerts]);

  /* =======================================================
     SUMMARY
  ======================================================= */

  const summary = useMemo(() => {
    const total = alerts.length;

    const unread = alerts.filter(
      (alert) => !isRead(alert)
    ).length;

    const critical = alerts.filter(
      (alert) =>
        normalizeLevel(alert?.level) ===
        "CRITICAL"
    ).length;

    const warning = alerts.filter(
      (alert) =>
        normalizeLevel(alert?.level) ===
        "WARNING"
    ).length;

    const resolved = alerts.filter(
      (alert) =>
        isResolved(alert)
    ).length;

    return {
      total,
      unread,
      critical,
      warning,
      resolved,
    };
  }, [alerts]);

  /* =======================================================
     FILTERED ALERTS
  ======================================================= */

  const filteredAlerts = useMemo(() => {
    const query =
      search
        .trim()
        .toLowerCase();

    const result = alerts.filter(
      (alert) => {
        const type =
          normalizeType(
            alert?.type
          );

        const level =
          normalizeLevel(
            alert?.level
          );

        const title =
          getAlertTitle(
            alert
          ).toLowerCase();

        const message =
          getAlertMessage(
            alert
          ).toLowerCase();

        const typeMatch =
          typeFilter === "all" ||
          type === typeFilter;

        const levelMatch =
          levelFilter === "all" ||
          level === levelFilter;

        const read =
          isRead(alert);

        const resolved =
          isResolved(alert);

        const statusMatch =
          statusFilter === "all" ||
          (statusFilter === "unread" &&
            !read) ||
          (statusFilter === "read" &&
            read &&
            !resolved) ||
          (statusFilter === "resolved" &&
            resolved);

        const dateMatch =
          matchesDateFilter(
            getAlertTimestamp(alert),
            dateFilter
          );

        const searchMatch =
          !query ||
          title.includes(query) ||
          message.includes(query) ||
          type
            .toLowerCase()
            .includes(query) ||
          level
            .toLowerCase()
            .includes(query);

        return (
          typeMatch &&
          levelMatch &&
          statusMatch &&
          dateMatch &&
          searchMatch
        );
      }
    );

    result.sort((a, b) => {
      const aTime =
        getTimeValue(
          getAlertTimestamp(a)
        );

      const bTime =
        getTimeValue(
          getAlertTimestamp(b)
        );

      return sortOrder === "newest"
        ? bTime - aTime
        : aTime - bTime;
    });

    return result;
  }, [
    alerts,
    search,
    typeFilter,
    levelFilter,
    statusFilter,
    dateFilter,
    sortOrder,
    relativeTick,
  ]);

  /* =======================================================
     CLEAR FILTERS
  ======================================================= */

  const hasActiveFilters =
    Boolean(
      search.trim() ||
        typeFilter !== "all" ||
        levelFilter !== "all" ||
        statusFilter !== "all" ||
        dateFilter !== "all"
    );

  const handleClearFilters = () => {
    setSearch("");
    setTypeFilter("all");
    setLevelFilter("all");
    setStatusFilter("all");
    setDateFilter("all");
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <PageTransition>
      <main className="alerts-page">
        <div className="alerts-page__ambient alerts-page__ambient--one" />
        <div className="alerts-page__ambient alerts-page__ambient--two" />
        <div className="alerts-page__grid" />

        {/* =================================================
            HEADER
        ================================================= */}

        <section className="alerts-page__header">
          <div className="alerts-page__header-copy">
            <div className="alerts-page__eyebrow">
              <span className="alerts-page__eyebrow-icon">
                <Bell size={15} />
              </span>

              Monitoring Center

              {summary.unread > 0 && (
                <Badge
                  variant="danger"
                  size="sm"
                  soft
                  dot
                  pulse
                >
                  {summary.unread} unread
                </Badge>
              )}
            </div>

            <h1>
              Alerts & Notifications
            </h1>

            <p>
              Review monitoring alerts,
              understand distractions,
              and keep your study sessions
              on track.
            </p>
          </div>

          <div className="alerts-page__header-actions">
            <Button
              variant="secondary"
              size="md"
              icon={
                <RefreshCw
                  size={17}
                  className={
                    isRefreshing
                      ? "alerts-page__refresh-icon"
                      : ""
                  }
                />
              }
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              Refresh
            </Button>

            {summary.unread > 0 && (
              <Button
                variant="outline"
                size="md"
                icon={
                  <CheckCircle2 size={17} />
                }
                onClick={handleMarkAllRead}
              >
                Mark All Read
              </Button>
            )}

            {alerts.length > 0 && (
              <Button
                variant="danger"
                size="md"
                icon={<Trash2 size={17} />}
                onClick={() =>
                  setShowClearDialog(true)
                }
              >
                Clear All
              </Button>
            )}
          </div>
        </section>

        {/* =================================================
            SUMMARY
        ================================================= */}

        <section className="alerts-page__summary">
          <SummaryCard
            label="Total Alerts"
            value={summary.total}
            icon={Bell}
            tone="primary"
            detail="All monitoring events"
            index={0}
          />

          <SummaryCard
            label="Unread"
            value={summary.unread}
            icon={Eye}
            tone="warning"
            detail="Need your attention"
            index={1}
          />

          <SummaryCard
            label="Critical"
            value={summary.critical}
            icon={ShieldAlert}
            tone="danger"
            detail="High priority events"
            index={2}
          />

          <SummaryCard
            label="Resolved"
            value={summary.resolved}
            icon={CheckCircle2}
            tone="success"
            detail="Successfully handled"
            index={3}
          />
        </section>

        {/* =================================================
            FILTER PANEL
        ================================================= */}

        <section className="alerts-page__filter-card">
          <div className="alerts-page__filter-top">
            <div className="alerts-page__filter-title">
              <span className="alerts-page__filter-icon">
                <Filter size={17} />
              </span>

              <div>
                <h2>Find an Alert</h2>
                <p>
                  Filter your monitoring history.
                </p>
              </div>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                className="alerts-page__clear-filters"
                onClick={handleClearFilters}
              >
                <X size={14} />
                Clear filters
              </button>
            )}
          </div>

          <div className="alerts-page__filters">
            <label className="alerts-page__search">
              <Search size={18} />

              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search alerts..."
                aria-label="Search alerts"
              />

              {search && (
                <button
                  type="button"
                  onClick={() =>
                    setSearch("")
                  }
                  aria-label="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </label>

            <label className="alerts-page__select">
              <span>Type</span>

              <div>
                <select
                  value={typeFilter}
                  onChange={(event) =>
                    setTypeFilter(
                      event.target.value
                    )
                  }
                  aria-label="Filter by alert type"
                >
                  {TYPE_OPTIONS.map(
                    (option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    )
                  )}
                </select>

                <ChevronDown size={16} />
              </div>
            </label>

            <label className="alerts-page__select">
              <span>Severity</span>

              <div>
                <select
                  value={levelFilter}
                  onChange={(event) =>
                    setLevelFilter(
                      event.target.value
                    )
                  }
                  aria-label="Filter by severity"
                >
                  {LEVEL_OPTIONS.map(
                    (option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    )
                  )}
                </select>

                <ChevronDown size={16} />
              </div>
            </label>

            <label className="alerts-page__select">
              <span>Status</span>

              <div>
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(
                      event.target.value
                    )
                  }
                  aria-label="Filter by status"
                >
                  {STATUS_OPTIONS.map(
                    (option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    )
                  )}
                </select>

                <ChevronDown size={16} />
              </div>
            </label>

            <label className="alerts-page__select">
              <span>Date</span>

              <div>
                <select
                  value={dateFilter}
                  onChange={(event) =>
                    setDateFilter(
                      event.target.value
                    )
                  }
                  aria-label="Filter by date"
                >
                  <option value="all">
                    All Time
                  </option>

                  <option value="today">
                    Today
                  </option>

                  <option value="week">
                    Last 7 Days
                  </option>

                  <option value="month">
                    Last 30 Days
                  </option>
                </select>

                <ChevronDown size={16} />
              </div>
            </label>

            <label className="alerts-page__select">
              <span>Sort</span>

              <div>
                <select
                  value={sortOrder}
                  onChange={(event) =>
                    setSortOrder(
                      event.target.value
                    )
                  }
                  aria-label="Sort alerts"
                >
                  <option value="newest">
                    Newest First
                  </option>

                  <option value="oldest">
                    Oldest First
                  </option>
                </select>

                <ChevronDown size={16} />
              </div>
            </label>
          </div>
        </section>

        {/* =================================================
            ALERT LIST
        ================================================= */}

        <section className="alerts-page__list-card">
          <div className="alerts-page__list-header">
            <div>
              <div className="alerts-page__list-title">
                <h2>Alert History</h2>

                <Badge
                  variant="primary"
                  size="sm"
                  soft
                >
                  {filteredAlerts.length}
                </Badge>
              </div>

              <p>
                {hasActiveFilters
                  ? "Showing filtered monitoring events."
                  : "Your latest monitoring events appear here."}
              </p>
            </div>

            {filteredAlerts.length > 0 && (
              <div className="alerts-page__list-status">
                <span className="alerts-page__live-dot" />
                Local history
              </div>
            )}
          </div>

          {filteredAlerts.length > 0 ? (
            <div className="alerts-page__rows">
              {filteredAlerts.map(
                (alert, index) => (
                  <AlertRow
                    key={getAlertId(
                      alert,
                      index
                    )}
                    alert={alert}
                    index={index}
                    onOpen={
                      handleOpenAlert
                    }
                    onDismiss={
                      handleDismiss
                    }
                    onResolve={
                      handleResolve
                    }
                  />
                )
              )}
            </div>
          ) : (
            <EmptyState
              icon={
                hasActiveFilters
                  ? "search"
                  : "alerts"
              }
              title={
                hasActiveFilters
                  ? "No matching alerts"
                  : "No alerts yet"
              }
              description={
                hasActiveFilters
                  ? "Try changing your filters or search terms."
                  : "Monitoring alerts will appear here when activity is detected."
              }
              variant="info"
              size="md"
              animated
              showDecoration
              action={
                hasActiveFilters
                  ? {
                      label:
                        "Clear Filters",
                      onClick:
                        handleClearFilters,
                      variant:
                        "secondary",
                    }
                  : undefined
              }
            />
          )}
        </section>

        {/* =================================================
            ALERT DETAIL MODAL
        ================================================= */}

        <Modal
          open={Boolean(
            selectedAlert
          )}
          onClose={() =>
            setSelectedAlert(null)
          }
          title={
            selectedAlert
              ? getAlertTitle(
                  selectedAlert
                )
              : "Alert Details"
          }
          subtitle={
            selectedAlert
              ? "Detailed monitoring event information."
              : undefined
          }
          size="md"
          variant={
            selectedAlert
              ? getAlertLevelConfig(
                  selectedAlert.level
                ).tone
              : "default"
          }
        >
          {selectedAlert && (
            <div className="alerts-page__detail">
              <div className="alerts-page__detail-hero">
                <AlertTypeIcon
                  type={
                    selectedAlert.type
                  }
                  level={
                    selectedAlert.level
                  }
                  size={25}
                />

                <div>
                  <span>
                    {
                      getAlertTypeConfig(
                        selectedAlert.type
                      ).label
                    }
                  </span>

                  <strong>
                    {
                      getAlertLevelConfig(
                        selectedAlert.level
                      ).label
                    }
                  </strong>
                </div>
              </div>

              <div className="alerts-page__detail-message">
                <span>Message</span>

                <p>
                  {getAlertMessage(
                    selectedAlert
                  )}
                </p>
              </div>

              <div className="alerts-page__detail-grid">
                <div>
                  <span>Date & Time</span>
                  <strong>
                    {formatDateTime(
                      getAlertTimestamp(
                        selectedAlert
                      )
                    )}
                  </strong>
                </div>

                <div>
                  <span>Status</span>
                  <strong>
                    {isResolved(
                      selectedAlert
                    )
                      ? "Resolved"
                      : isRead(
                          selectedAlert
                        )
                        ? "Read"
                        : "Unread"}
                  </strong>
                </div>

                {getConfidence(
                  selectedAlert
                ) !== null && (
                  <div>
                    <span>
                      AI Confidence
                    </span>

                    <strong>
                      {
                        getConfidence(
                          selectedAlert
                        )
                      }
                      %
                    </strong>
                  </div>
                )}

                {selectedAlert.duration && (
                  <div>
                    <span>Duration</span>
                    <strong>
                      {
                        selectedAlert.duration
                      }
                    </strong>
                  </div>
                )}
              </div>

              <div className="alerts-page__detail-actions">
                {!isResolved(
                  selectedAlert
                ) && (
                  <Button
                    variant="success"
                    icon={
                      <CheckCircle2
                        size={17}
                      />
                    }
                    onClick={() =>
                      handleResolve(
                        selectedAlert
                      )
                    }
                  >
                    Resolve Alert
                  </Button>
                )}

                <Button
                  variant="secondary"
                  icon={<X size={17} />}
                  onClick={() =>
                    setSelectedAlert(
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

        {/* =================================================
            CLEAR CONFIRMATION
        ================================================= */}

        <ConfirmDialog
          open={showClearDialog}
          title="Clear All Alerts?"
          description={`This will permanently remove ${summary.total} stored alert${summary.total === 1 ? "" : "s"} from your local history.`}
          variant="danger"
          destructive
          confirmLabel="Clear All Alerts"
          cancelLabel="Cancel"
          onConfirm={
            handleClearAll
          }
          onCancel={() =>
            setShowClearDialog(false)
          }
          onClose={() =>
            setShowClearDialog(false)
          }
        />
      </main>
    </PageTransition>
  );
};

export default Alerts;