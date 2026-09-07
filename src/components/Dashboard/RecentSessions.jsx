import React, { useMemo } from "react";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Eye,
  EyeOff,
  Info,
  Moon,
  Smartphone,
  UserRound,
  UsersRound,
  XCircle,
  Zap,
} from "lucide-react";
import "./RecentAlerts.css";

const EMPTY_ALERTS = [];

const ALERT_CONFIG = {
  PHONE: {
    icon: Smartphone,
    tone: "danger",
    fallbackTitle: "Phone detected",
  },

  EYES_CLOSED: {
    icon: EyeOff,
    tone: "warning",
    fallbackTitle: "Eyes closed",
  },

  DROWSY: {
    icon: Moon,
    tone: "warning",
    fallbackTitle: "Drowsiness detected",
  },

  LOOKING_AWAY: {
    icon: Eye,
    tone: "warning",
    fallbackTitle: "Looking away",
  },

  FACE_MISSING: {
    icon: UserRound,
    tone: "danger",
    fallbackTitle: "Face not detected",
  },

  PERSON_LEFT: {
    icon: UserRound,
    tone: "warning",
    fallbackTitle: "Person left",
  },

  MULTIPLE_PERSON: {
    icon: UsersRound,
    tone: "danger",
    fallbackTitle: "Multiple people detected",
  },

  BREAK_OVER: {
    icon: Clock3,
    tone: "info",
    fallbackTitle: "Break is over",
  },

  SESSION_END: {
    icon: CheckCircle2,
    tone: "success",
    fallbackTitle: "Session completed",
  },

  LONG_DISTRACTION: {
    icon: AlertCircle,
    tone: "warning",
    fallbackTitle: "Long distraction",
  },
};

const LEVEL_CONFIG = {
  INFO: {
    tone: "info",
    label: "Info",
  },

  WARNING: {
    tone: "warning",
    label: "Warning",
  },

  CRITICAL: {
    tone: "danger",
    label: "Critical",
  },

  SUCCESS: {
    tone: "success",
    label: "Success",
  },
};

const getConfig = (type) => {
  const normalizedType = String(
    type ?? ""
  ).toUpperCase();

  return (
    ALERT_CONFIG[normalizedType] ?? {
      icon: Bell,
      tone: "info",
      fallbackTitle: "Study alert",
    }
  );
};

const getLevelConfig = (level) => {
  const normalizedLevel = String(
    level ?? "INFO"
  ).toUpperCase();

  return (
    LEVEL_CONFIG[normalizedLevel] ??
    LEVEL_CONFIG.INFO
  );
};

const normalizeTimestamp = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    return value;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
};

const formatRelativeTime = (
  timestamp,
  now = Date.now()
) => {
  const date =
    normalizeTimestamp(timestamp);

  if (!date) {
    return "Recently";
  }

  const difference = Math.max(
    0,
    now - date.getTime()
  );

  const seconds =
    Math.floor(difference / 1000);

  if (seconds < 10) {
    return "Just now";
  }

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes =
    Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours =
    Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days =
    Math.floor(hours / 24);

  if (days < 7) {
    return `${days}d ago`;
  }

  return date.toLocaleDateString(
    undefined,
    {
      day: "numeric",
      month: "short",
    }
  );
};

const getAlertTitle = (
  alert,
  config
) =>
  alert?.title ??
  alert?.name ??
  alert?.messageTitle ??
  config.fallbackTitle;

const getAlertMessage = (alert) =>
  alert?.message ??
  alert?.description ??
  alert?.details ??
  "";

const getAlertTimestamp = (alert) =>
  alert?.timestamp ??
  alert?.createdAt ??
  alert?.time ??
  alert?.date;

const isUnread = (alert) =>
  Boolean(
    alert?.unread ??
      alert?.isUnread ??
      (alert?.read === false)
  );

const AlertIcon = ({
  alert,
  config,
}) => {
  if (React.isValidElement(alert?.icon)) {
    return alert.icon;
  }

  if (
    typeof alert?.icon ===
    "function"
  ) {
    const CustomIcon =
      alert.icon;

    return <CustomIcon size={17} />;
  }

  const Icon = config.icon;

  return <Icon size={17} />;
};

const AlertItem = ({
  alert,
  index,
  now,
  onClick,
  onDismiss,
}) => {
  const type = String(
    alert?.type ?? ""
  ).toUpperCase();

  const config = getConfig(type);
  const levelConfig =
    getLevelConfig(alert?.level);

  const tone =
    alert?.tone ??
    levelConfig.tone ??
    config.tone;

  const title = getAlertTitle(
    alert,
    config
  );

  const message =
    getAlertMessage(alert);

  const timestamp =
    getAlertTimestamp(alert);

  const unread =
    isUnread(alert);

  const relativeTime =
    formatRelativeTime(
      timestamp,
      now
    );

  const handleClick = () => {
    if (
      typeof onClick ===
      "function"
    ) {
      onClick(alert);
    }
  };

  const handleKeyDown = (
    event
  ) => {
    if (
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      handleClick();
    }
  };

  const handleDismiss = (
    event
  ) => {
    event.stopPropagation();

    if (
      typeof onDismiss ===
      "function"
    ) {
      onDismiss(alert);
    }
  };

  return (
    <article
      className={[
        "recent-alerts__item",
        `recent-alerts__item--${tone}`,
        unread
          ? "recent-alerts__item--unread"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        "--alert-index": index,
      }}
      role={
        onClick
          ? "button"
          : undefined
      }
      tabIndex={
        onClick
          ? 0
          : undefined
      }
      onClick={
        onClick
          ? handleClick
          : undefined
      }
      onKeyDown={
        onClick
          ? handleKeyDown
          : undefined
      }
    >
      <div className="recent-alerts__timeline">
        <div className="recent-alerts__icon">
          <AlertIcon
            alert={alert}
            config={config}
          />
        </div>

        {index !== 0 && (
          <span className="recent-alerts__timeline-line" />
        )}
      </div>

      <div className="recent-alerts__body">
        <div className="recent-alerts__top">
          <div className="recent-alerts__title-wrap">
            {unread && (
              <span
                className="recent-alerts__unread-dot"
                aria-label="Unread"
              />
            )}

            <h3>{title}</h3>
          </div>

          <time
            dateTime={
              normalizeTimestamp(
                timestamp
              )?.toISOString()
            }
          >
            {relativeTime}
          </time>
        </div>

        {message && (
          <p>{message}</p>
        )}

        <div className="recent-alerts__meta">
          <span
            className={[
              "recent-alerts__severity",
              `recent-alerts__severity--${tone}`,
            ].join(" ")}
          >
            {alert?.level
              ? levelConfig.label
              : type || "INFO"}
          </span>

          {alert?.confidence !==
            undefined && (
            <span className="recent-alerts__confidence">
              {Math.round(
                Number(
                  alert.confidence
                ) <= 1
                  ? Number(
                      alert.confidence
                    ) * 100
                  : Number(
                      alert.confidence
                    )
              )}
              % confidence
            </span>
          )}

          {alert?.duration && (
            <span className="recent-alerts__duration">
              {alert.duration}
            </span>
          )}
        </div>
      </div>

      {onDismiss && (
        <button
          type="button"
          className="recent-alerts__dismiss"
          aria-label={`Dismiss ${title}`}
          onClick={handleDismiss}
        >
          <XCircle size={15} />
        </button>
      )}

      {onClick && (
        <ChevronRight
          className="recent-alerts__chevron"
          size={16}
        />
      )}
    </article>
  );
};

const RecentAlerts = ({
  alerts = EMPTY_ALERTS,
  items,
  title = "Recent Alerts",
  subtitle = "Latest activity from your study monitor.",
  maxItems = 5,
  showHeader = true,
  showViewAll = true,
  showEmptyState = true,
  showDismiss = false,
  animated = true,
  onViewAll,
  onAlertClick,
  onDismiss,
  className = "",
}) => {
  const [now, setNow] =
    React.useState(Date.now());

  const sourceAlerts =
    items ?? alerts;

  const normalizedAlerts =
    useMemo(() => {
      if (
        !Array.isArray(
          sourceAlerts
        )
      ) {
        return [];
      }

      return sourceAlerts
        .filter(Boolean)
        .sort((a, b) => {
          const first =
            normalizeTimestamp(
              getAlertTimestamp(a)
            )?.getTime() ?? 0;

          const second =
            normalizeTimestamp(
              getAlertTimestamp(b)
            )?.getTime() ?? 0;

          return second - first;
        });
    }, [sourceAlerts]);

  const visibleAlerts =
    useMemo(() => {
      const limit =
        Number(maxItems);

      if (
        !Number.isFinite(limit) ||
        limit <= 0
      ) {
        return normalizedAlerts;
      }

      return normalizedAlerts.slice(
        0,
        limit
      );
    }, [
      normalizedAlerts,
      maxItems,
    ]);

  const unreadCount =
    useMemo(
      () =>
        normalizedAlerts.filter(
          isUnread
        ).length,
      [normalizedAlerts]
    );

  React.useEffect(() => {
    const timer =
      window.setInterval(
        () =>
          setNow(
            Date.now()
          ),
        30000
      );

    return () =>
      window.clearInterval(
        timer
      );
  }, []);

  const containerClasses = [
    "recent-alerts",
    animated
      ? "recent-alerts--animated"
      : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (
    !visibleAlerts.length &&
    showEmptyState
  ) {
    return (
      <section
        className={containerClasses}
      >
        {showHeader && (
          <header className="recent-alerts__header">
            <div className="recent-alerts__heading">
              <div className="recent-alerts__header-icon">
                <Bell size={18} />
              </div>

              <div>
                <h2>{title}</h2>
                <p>{subtitle}</p>
              </div>
            </div>
          </header>
        )}

        <div className="recent-alerts__empty">
          <div className="recent-alerts__empty-orbit">
            <div className="recent-alerts__empty-icon">
              <CheckCircle2
                size={25}
              />
            </div>
          </div>

          <h3>
            All clear
          </h3>

          <p>
            No recent alerts. Keep
            up the great focus!
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      className={containerClasses}
    >
      {showHeader && (
        <header className="recent-alerts__header">
          <div className="recent-alerts__heading">
            <div className="recent-alerts__header-icon">
              <Bell size={18} />
            </div>

            <div>
              <div className="recent-alerts__title-row">
                <h2>{title}</h2>

                {unreadCount > 0 && (
                  <span className="recent-alerts__count">
                    {unreadCount}
                  </span>
                )}
              </div>

              <p>{subtitle}</p>
            </div>
          </div>

          {showViewAll &&
            typeof onViewAll ===
              "function" && (
              <button
                type="button"
                className="recent-alerts__view-all"
                onClick={
                  onViewAll
                }
              >
                View all
                <ChevronRight
                  size={15}
                />
              </button>
            )}
        </header>
      )}

      <div className="recent-alerts__list">
        {visibleAlerts.map(
          (alert, index) => (
            <AlertItem
              key={
                alert.id ??
                alert.alertId ??
                `${getAlertTimestamp(
                  alert
                )}-${index}`
              }
              alert={alert}
              index={index}
              now={now}
              onClick={
                onAlertClick
              }
              onDismiss={
                showDismiss
                  ? onDismiss
                  : undefined
              }
            />
          )
        )}
      </div>

      {showViewAll &&
        typeof onViewAll ===
          "function" &&
        visibleAlerts.length > 0 && (
          <footer className="recent-alerts__footer">
            <button
              type="button"
              onClick={
                onViewAll
              }
            >
              <span>
                View complete
                alert history
              </span>

              <span className="recent-alerts__footer-arrow">
                <ArrowIcon />
              </span>
            </button>
          </footer>
        )}

      {!visibleAlerts.length &&
        !showEmptyState && (
          <div className="recent-alerts__minimal-empty">
            <Info size={16} />
            No recent alerts
          </div>
        )}
    </section>
  );
};

const ArrowIcon = () => (
  <ChevronRight size={15} />
);

export default RecentAlerts;