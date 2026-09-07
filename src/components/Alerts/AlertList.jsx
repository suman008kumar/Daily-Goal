import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  BellOff,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Eye,
  EyeOff,
  Filter,
  Info,
  MoreHorizontal,
  Phone,
  Smartphone,
  Trash2,
  UserRound,
  UsersRound,
  X,
  Zap,
} from "lucide-react";
import "./AlertList.css";

/* =========================================================
   ALERT CONFIG
========================================================= */

const ALERT_TYPE_CONFIG = {
  PHONE: {
    icon: Smartphone,
    tone: "danger",
    label: "Phone Usage",
  },
  EYES_CLOSED: {
    icon: EyeOff,
    tone: "warning",
    label: "Eyes Closed",
  },
  DROWSY: {
    icon: Zap,
    tone: "warning",
    label: "Drowsiness",
  },
  LOOKING_AWAY: {
    icon: Eye,
    tone: "warning",
    label: "Looking Away",
  },
  FACE_MISSING: {
    icon: UserRound,
    tone: "danger",
    label: "Face Missing",
  },
  PERSON_LEFT: {
    icon: UserRound,
    tone: "warning",
    label: "Away From Desk",
  },
  MULTIPLE_PERSON: {
    icon: UsersRound,
    tone: "danger",
    label: "Multiple People",
  },
  BREAK_OVER: {
    icon: Clock3,
    tone: "success",
    label: "Break Over",
  },
  SESSION_END: {
    icon: CheckCircle2,
    tone: "success",
    label: "Session Complete",
  },
  LONG_DISTRACTION: {
    icon: AlertTriangle,
    tone: "warning",
    label: "Long Distraction",
  },
};

const ALERT_LEVEL_CONFIG = {
  INFO: {
    icon: Info,
    tone: "info",
    label: "Info",
  },
  WARNING: {
    icon: AlertTriangle,
    tone: "warning",
    label: "Warning",
  },
  CRITICAL: {
    icon: AlertCircle,
    tone: "danger",
    label: "Critical",
  },
  SUCCESS: {
    icon: CheckCircle2,
    tone: "success",
    label: "Success",
  },
};

const FILTER_OPTIONS = [
  { value: "ALL", label: "All Alerts" },
  { value: "UNREAD", label: "Unread" },
  { value: "CRITICAL", label: "Critical" },
  { value: "WARNING", label: "Warning" },
  { value: "INFO", label: "Info" },
  { value: "SUCCESS", label: "Success" },
];

/* =========================================================
   HELPERS
========================================================= */

const normalizeType = (type) =>
  String(type || "INFO").trim().toUpperCase();

const normalizeLevel = (level) =>
  String(level || "INFO").trim().toUpperCase();

const getTypeConfig = (type) =>
  ALERT_TYPE_CONFIG[normalizeType(type)] || {
    icon: Bell,
    tone: "info",
    label: "Alert",
  };

const getLevelConfig = (level) =>
  ALERT_LEVEL_CONFIG[normalizeLevel(level)] || ALERT_LEVEL_CONFIG.INFO;

const getAlertTitle = (alert) => {
  if (alert?.title) return alert.title;

  const typeConfig = getTypeConfig(alert?.type);

  return typeConfig.label;
};

const getAlertMessage = (alert) => {
  return (
    alert?.message ||
    alert?.description ||
    alert?.details ||
    "An activity alert was detected during your study session."
  );
};

const getAlertTimestamp = (alert) => {
  return (
    alert?.timestamp ||
    alert?.createdAt ||
    alert?.time ||
    alert?.date ||
    null
  );
};

const getAlertId = (alert, index) => {
  return (
    alert?.id ||
    alert?.alertId ||
    `${getAlertTimestamp(alert) || "alert"}-${index}`
  );
};

const isUnreadAlert = (alert) => {
  if (typeof alert?.read === "boolean") {
    return !alert.read;
  }

  if (typeof alert?.isRead === "boolean") {
    return !alert.isRead;
  }

  if (typeof alert?.unread === "boolean") {
    return alert.unread;
  }

  if (typeof alert?.isUnread === "boolean") {
    return alert.isUnread;
  }

  return false;
};

const formatRelativeTime = (timestamp, now = Date.now()) => {
  if (!timestamp) return "Recently";

  const parsed = new Date(timestamp).getTime();

  if (Number.isNaN(parsed)) return "Recently";

  const difference = Math.max(0, now - parsed);
  const seconds = Math.floor(difference / 1000);

  if (seconds < 10) return "Just now";
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);

  if (days < 7) return `${days}d ago`;

  return new Date(parsed).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year:
      new Date(parsed).getFullYear() !== new Date().getFullYear()
        ? "numeric"
        : undefined,
  });
};

const formatExactTime = (timestamp) => {
  if (!timestamp) return "";

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatDuration = (value) => {
  if (value === undefined || value === null || value === "") return null;

  if (typeof value === "number") {
    const totalSeconds = Math.max(0, Math.round(value));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes <= 0) return `${seconds}s`;

    return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  }

  return String(value);
};

const normalizeConfidence = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const number = Number(value);

  if (Number.isNaN(number)) return null;

  const percentage = number <= 1 ? number * 100 : number;

  return Math.round(Math.min(100, Math.max(0, percentage)));
};

const sortNewestFirst = (alerts) => {
  return [...alerts].sort((a, b) => {
    const aTime = new Date(getAlertTimestamp(a) || 0).getTime();
    const bTime = new Date(getAlertTimestamp(b) || 0).getTime();

    if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
    if (Number.isNaN(aTime)) return 1;
    if (Number.isNaN(bTime)) return -1;

    return bTime - aTime;
  });
};

/* =========================================================
   ALERT ICON
========================================================= */

const AlertIcon = ({ alert, size = 20 }) => {
  const typeConfig = getTypeConfig(alert?.type);
  const levelConfig = getLevelConfig(alert?.level);

  const Icon = typeConfig.icon || levelConfig.icon || Bell;

  return (
    <div
      className={`alert-list__icon alert-list__icon--${typeConfig.tone || levelConfig.tone}`}
      aria-hidden="true"
    >
      <Icon size={size} strokeWidth={2.1} />
      <span className="alert-list__icon-pulse" />
    </div>
  );
};

/* =========================================================
   ALERT ITEM
========================================================= */

const AlertItem = ({
  alert,
  index,
  now,
  showConfidence,
  showTimestamp,
  showDuration,
  showActions,
  showChevron,
  animated,
  onClick,
  onDismiss,
  onResolve,
  onMarkRead,
  onMarkUnread,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const unread = isUnreadAlert(alert);
  const level = normalizeLevel(alert?.level);
  const type = normalizeType(alert?.type);

  const typeConfig = getTypeConfig(type);
  const levelConfig = getLevelConfig(level);

  const confidence = normalizeConfidence(
    alert?.confidence ?? alert?.score
  );

  const timestamp = getAlertTimestamp(alert);

  const duration = formatDuration(
    alert?.duration ??
      alert?.durationSeconds ??
      alert?.distractionDuration
  );

  const handleClick = useCallback(
    (event) => {
      if (
        event.target.closest(".alert-list__item-action") ||
        event.target.closest(".alert-list__menu")
      ) {
        return;
      }

      onClick?.(alert);
    },
    [alert, onClick]
  );

  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick?.(alert);
    }
  };

  const handleMarkRead = (event) => {
    event.stopPropagation();
    setMenuOpen(false);

    if (unread) {
      onMarkRead?.(alert);
    } else {
      onMarkUnread?.(alert);
    }
  };

  const handleResolve = (event) => {
    event.stopPropagation();
    setMenuOpen(false);
    onResolve?.(alert);
  };

  const handleDismiss = (event) => {
    event.stopPropagation();
    setMenuOpen(false);
    onDismiss?.(alert);
  };

  return (
    <article
      className={[
        "alert-list__item",
        `alert-list__item--${levelConfig.tone}`,
        unread ? "alert-list__item--unread" : "",
        animated ? "alert-list__item--animated" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        "--alert-index": index,
      }}
      role="listitem"
      tabIndex={onClick ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={onClick ? handleKeyDown : undefined}
    >
      <div className="alert-list__timeline">
        <span className="alert-list__timeline-dot" />
        <span className="alert-list__timeline-line" />
      </div>

      <div className="alert-list__item-main">
        <AlertIcon alert={alert} />

        <div className="alert-list__content">
          <div className="alert-list__top-row">
            <div className="alert-list__title-group">
              {unread && (
                <span
                  className="alert-list__unread-dot"
                  title="Unread alert"
                  aria-label="Unread alert"
                />
              )}

              <h3 className="alert-list__title">
                {getAlertTitle(alert)}
              </h3>
            </div>

            <div className="alert-list__meta">
              <span
                className={`alert-list__level alert-list__level--${levelConfig.tone}`}
              >
                {levelConfig.label}
              </span>

              {timestamp && (
                <time
                  className="alert-list__relative-time"
                  dateTime={timestamp}
                  title={formatExactTime(timestamp)}
                >
                  {formatRelativeTime(timestamp, now)}
                </time>
              )}
            </div>
          </div>

          <p className="alert-list__message">{getAlertMessage(alert)}</p>

          {(showConfidence || showTimestamp || showDuration) && (
            <div className="alert-list__details">
              {showConfidence && confidence !== null && (
                <span className="alert-list__detail">
                  <Zap size={13} />
                  {confidence}% confidence
                </span>
              )}

              {showDuration && duration && (
                <span className="alert-list__detail">
                  <Clock3 size={13} />
                  {duration}
                </span>
              )}

              {showTimestamp && timestamp && (
                <span className="alert-list__detail">
                  <Clock3 size={13} />
                  {formatExactTime(timestamp)}
                </span>
              )}
            </div>
          )}

          <div className="alert-list__type">
            <span className="alert-list__type-indicator" />
            {typeConfig.label}
          </div>
        </div>

        {showActions && (
          <div className="alert-list__actions">
            {onResolve && !alert?.resolved && (
              <button
                type="button"
                className="alert-list__item-action alert-list__item-action--resolve"
                onClick={handleResolve}
                title="Resolve alert"
                aria-label="Resolve alert"
              >
                <Check size={17} />
              </button>
            )}

            {onDismiss && (
              <button
                type="button"
                className="alert-list__item-action alert-list__item-action--dismiss"
                onClick={handleDismiss}
                title="Dismiss alert"
                aria-label="Dismiss alert"
              >
                <X size={17} />
              </button>
            )}

            <div className="alert-list__menu-wrapper">
              <button
                type="button"
                className="alert-list__item-action"
                onClick={(event) => {
                  event.stopPropagation();
                  setMenuOpen((current) => !current);
                }}
                title="More actions"
                aria-label="More actions"
                aria-expanded={menuOpen}
              >
                <MoreHorizontal size={18} />
              </button>

              {menuOpen && (
                <div
                  className="alert-list__menu"
                  role="menu"
                  onClick={(event) => event.stopPropagation()}
                >
                  {(onMarkRead || onMarkUnread) && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleMarkRead}
                    >
                      {unread ? (
                        <>
                          <Check size={15} />
                          Mark as read
                        </>
                      ) : (
                        <>
                          <Eye size={15} />
                          Mark as unread
                        </>
                      )}
                    </button>
                  )}

                  {onResolve && !alert?.resolved && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleResolve}
                    >
                      <CheckCircle2 size={15} />
                      Resolve
                    </button>
                  )}

                  {onDismiss && (
                    <button
                      type="button"
                      role="menuitem"
                      className="alert-list__menu-danger"
                      onClick={handleDismiss}
                    >
                      <Trash2 size={15} />
                      Dismiss
                    </button>
                  )}
                </div>
              )}
            </div>

            {showChevron && (
              <ChevronRight
                className="alert-list__chevron"
                size={18}
                aria-hidden="true"
              />
            )}
          </div>
        )}
      </div>
    </article>
  );
};

/* =========================================================
   EMPTY STATE
========================================================= */

const EmptyState = ({ filtered, title, message }) => {
  return (
    <div className="alert-list__empty">
      <div className="alert-list__empty-orbit">
        <div className="alert-list__empty-icon">
          {filtered ? (
            <Filter size={27} />
          ) : (
            <BellOff size={27} />
          )}
        </div>
      </div>

      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  );
};

/* =========================================================
   MAIN COMPONENT
========================================================= */

const AlertList = ({
  alerts = [],
  items,
  title = "Recent Alerts",
  subtitle = "Stay updated with your study monitoring activity.",
  maxItems,
  filter = "ALL",
  onFilterChange,
  showHeader = true,
  showFilters = true,
  showFilterDropdown = true,
  showSummary = true,
  showConfidence = false,
  showTimestamp = false,
  showDuration = false,
  showActions = true,
  showChevron = true,
  showViewAll = false,
  viewAllLabel = "View all alerts",
  onViewAll,
  onAlertClick,
  onDismiss,
  onResolve,
  onMarkRead,
  onMarkUnread,
  onClearAll,
  animated = true,
  emptyTitle = "No alerts yet",
  emptyMessage = "Everything looks clear. Your study activity alerts will appear here.",
  className = "",
}) => {
  const sourceAlerts = Array.isArray(items)
    ? items
    : Array.isArray(alerts)
      ? alerts
      : [];

  const [internalFilter, setInternalFilter] = useState(filter);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    setInternalFilter(filter);
  }, [filter]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 30000);

    return () => window.clearInterval(interval);
  }, []);

  const activeFilter = filter !== undefined ? filter : internalFilter;

  const unreadCount = useMemo(
    () => sourceAlerts.filter(isUnreadAlert).length,
    [sourceAlerts]
  );

  const criticalCount = useMemo(
    () =>
      sourceAlerts.filter(
        (alert) => normalizeLevel(alert?.level) === "CRITICAL"
      ).length,
    [sourceAlerts]
  );

  const warningCount = useMemo(
    () =>
      sourceAlerts.filter(
        (alert) => normalizeLevel(alert?.level) === "WARNING"
      ).length,
    [sourceAlerts]
  );

  const filteredAlerts = useMemo(() => {
    let result = sortNewestFirst(sourceAlerts);

    if (activeFilter === "UNREAD") {
      result = result.filter(isUnreadAlert);
    } else if (
      ["CRITICAL", "WARNING", "INFO", "SUCCESS"].includes(activeFilter)
    ) {
      result = result.filter(
        (alert) => normalizeLevel(alert?.level) === activeFilter
      );
    }

    if (typeof maxItems === "number" && maxItems >= 0) {
      result = result.slice(0, maxItems);
    }

    return result;
  }, [sourceAlerts, activeFilter, maxItems]);

  const handleFilterChange = (value) => {
    setInternalFilter(value);
    onFilterChange?.(value);
  };

  const handleViewAll = () => {
    onViewAll?.();
  };

  const hasAlerts = sourceAlerts.length > 0;
  const hasFilteredAlerts = filteredAlerts.length > 0;

  return (
    <section
      className={[
        "alert-list",
        hasAlerts ? "alert-list--has-alerts" : "alert-list--empty",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {showHeader && (
        <header className="alert-list__header">
          <div className="alert-list__heading">
            <div className="alert-list__heading-icon">
              <Bell size={19} />
              {unreadCount > 0 && (
                <span className="alert-list__heading-badge">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>

            <div>
              <div className="alert-list__title-row">
                <h2>{title}</h2>

                {unreadCount > 0 && (
                  <span className="alert-list__unread-label">
                    {unreadCount} unread
                  </span>
                )}
              </div>

              {subtitle && <p>{subtitle}</p>}
            </div>
          </div>

          {showFilters && (
            <div className="alert-list__header-actions">
              {showSummary && (
                <div className="alert-list__summary">
                  <span>
                    <strong>{sourceAlerts.length}</strong>
                    Total
                  </span>

                  {criticalCount > 0 && (
                    <span className="alert-list__summary-danger">
                      <strong>{criticalCount}</strong>
                      Critical
                    </span>
                  )}

                  {warningCount > 0 && (
                    <span className="alert-list__summary-warning">
                      <strong>{warningCount}</strong>
                      Warning
                    </span>
                  )}
                </div>
              )}

              {showFilterDropdown && (
                <label className="alert-list__filter">
                  <Filter size={15} />

                  <select
                    value={activeFilter}
                    onChange={(event) =>
                      handleFilterChange(event.target.value)
                    }
                    aria-label="Filter alerts"
                  >
                    {FILTER_OPTIONS.map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}
        </header>
      )}

      {!hasFilteredAlerts ? (
        <EmptyState
          filtered={hasAlerts}
          title={hasAlerts ? "No matching alerts" : emptyTitle}
          message={
            hasAlerts
              ? "Try another alert filter to see more activity."
              : emptyMessage
          }
        />
      ) : (
        <div className="alert-list__body" role="list">
          {filteredAlerts.map((alert, index) => (
            <AlertItem
              key={getAlertId(alert, index)}
              alert={alert}
              index={index}
              now={now}
              showConfidence={showConfidence}
              showTimestamp={showTimestamp}
              showDuration={showDuration}
              showActions={showActions}
              showChevron={showChevron}
              animated={animated}
              onClick={onAlertClick}
              onDismiss={onDismiss}
              onResolve={onResolve}
              onMarkRead={onMarkRead}
              onMarkUnread={onMarkUnread}
            />
          ))}
        </div>
      )}

      {(showViewAll || onClearAll) && (
        <footer className="alert-list__footer">
          {showViewAll && (
            <button
              type="button"
              className="alert-list__view-all"
              onClick={handleViewAll}
            >
              <span>{viewAllLabel}</span>
              <ChevronRight size={17} />
            </button>
          )}

          {onClearAll && sourceAlerts.length > 0 && (
            <button
              type="button"
              className="alert-list__clear"
              onClick={onClearAll}
            >
              <Trash2 size={15} />
              Clear all
            </button>
          )}
        </footer>
      )}
    </section>
  );
};

export default AlertList;