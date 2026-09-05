import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { getPreferences, savePreferences } from "../../services/storageService";
import {
  Menu,
  Bell,
  Sun,
  Moon,
  Monitor,
  ChevronRight,
  Wifi,
  Clock3,
} from "lucide-react";
import "./Header.css";

const PAGE_CONFIG = {
  "/": {
    title: "Dashboard",
    subtitle: "",
  },
  "/live-monitoring": {
    title: "Live Monitoring",
    subtitle: "Stay aware. Stay focused.",
  },
  "/analytics": {
    title: "Analytics",
    subtitle: "Understand your focus patterns",
  },
  "/sessions": {
    title: "Sessions",
    subtitle: "Review your study history",
  },
  "/alerts": {
    title: "Alerts",
    subtitle: "Review your focus notifications",
  },
  "/smart-report": {
    title: "Smart Report",
    subtitle: "Your personalized study insights",
  },
  "/live-users": {
    title: "Live Users",
    subtitle: "Frontend demonstration environment",
  },
  "/settings": {
    title: "Settings",
    subtitle: "Customize your Daily Goal experience",
  },
};

const THEME_OPTIONS = [
  {
    value: "light",
    label: "Light",
    icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    icon: Moon,
  },
  {
    value: "system",
    label: "System",
    icon: Monitor,
  },
];

function Header({
  onMenuToggle,
  monitoringActive = false,
  notificationCount = 0,
  theme = "light",
  onThemeChange,
}) {
  const location = useLocation();

  const [currentTime, setCurrentTime] = useState(new Date());

  const [displayName, setDisplayName] = useState(() => {
    const prefs = getPreferences?.() || {};

    return (
      String(
        prefs.displayName ||
          prefs.name ||
          "Student"
      ).trim() || "Student"
    );
  });

  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(displayName);

  /* =========================================================
     LIVE CLOCK
  ========================================================= */

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  /* =========================================================
     PAGE CONFIG
  ========================================================= */

  const page = useMemo(() => {
    if (PAGE_CONFIG[location.pathname]) {
      return PAGE_CONFIG[location.pathname];
    }

    const matchingPage = Object.entries(PAGE_CONFIG).find(
      ([path]) =>
        path !== "/" &&
        location.pathname.startsWith(path)
    );

    return (
      matchingPage?.[1] || {
        title: "Daily Goal",
        subtitle: "Study smarter. Stay focused.",
      }
    );
  }, [location.pathname]);

  /* =========================================================
     THEME
  ========================================================= */

  const currentTheme = THEME_OPTIONS.find(
    (option) => option.value === theme
  );

  const ThemeIcon = currentTheme?.icon || Sun;

  const handleThemeChange = () => {
    const currentIndex = THEME_OPTIONS.findIndex(
      (option) => option.value === theme
    );

    const nextIndex =
      currentIndex >= 0
        ? (currentIndex + 1) % THEME_OPTIONS.length
        : 0;

    const nextTheme =
      THEME_OPTIONS[nextIndex].value;

    if (onThemeChange) {
      onThemeChange(nextTheme);
    }
  };

  /* =========================================================
     EDIT PROFILE NAME
  ========================================================= */

  const saveName = () => {
    const next =
      draftName.trim().slice(0, 40) || "Student";

    const prefs = getPreferences?.() || {};

    savePreferences?.({
      ...prefs,
      displayName: next,
    });

    setDisplayName(next);
    setDraftName(next);
    setEditingName(false);
  };

  /* =========================================================
     TIME
  ========================================================= */

  const formattedTime = currentTime.toLocaleTimeString(
    [],
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );

  return (
    <header className="daily-goal-header">

      {/* =====================================================
          LEFT
      ====================================================== */}

      <div className="daily-goal-header__left">

        {/* Mobile Menu */}
        <button
          type="button"
          className="daily-goal-header__menu-button"
          onClick={onMenuToggle}
          aria-label="Open navigation menu"
        >
          <Menu size={21} />
        </button>

        <div className="daily-goal-header__page-info">

          {/* Breadcrumb */}
          <div className="daily-goal-header__breadcrumb">
            <span>Daily Goal</span>

            <ChevronRight size={13} />

            <strong>
              {page.title}
            </strong>
          </div>

          {/* Page Heading */}
          <div className="daily-goal-header__heading-row">

            <h1>
              {page.title}
            </h1>

            {monitoringActive && (
              <span className="daily-goal-header__live-pill">
                <span className="daily-goal-header__live-dot" />
                <span>Monitoring Active</span>
              </span>
            )}

          </div>

          {page.subtitle && (
            <p>
              {page.subtitle}
            </p>
          )}

        </div>
      </div>

      {/* =====================================================
          RIGHT
      ====================================================== */}

      <div className="daily-goal-header__right">

        {/* Time */}
        <div
          className="daily-goal-header__time"
          aria-label={`Current time ${formattedTime}`}
        >
          <Clock3
            size={15}
            className="daily-goal-header__time-icon"
            aria-hidden="true"
          />

          <span className="daily-goal-header__time-value">
            {formattedTime}
          </span>
        </div>

        {/* Monitoring Status */}
        <div
          className={[
            "daily-goal-header__monitor-status",
            monitoringActive
              ? "daily-goal-header__monitor-status--active"
              : "",
          ]
            .filter(Boolean)
            .join(" ")}
          title={
            monitoringActive
              ? "Camera monitoring is active"
              : "Camera monitoring is currently off"
          }
        >

          <span className="daily-goal-header__monitor-icon">
            <Wifi size={15} />
          </span>

          <span className="daily-goal-header__monitor-copy">

            <strong>
              {monitoringActive
                ? "Monitoring Active"
                : "Monitoring Off"}
            </strong>

            <small>
              {monitoringActive
                ? "Live session"
                : "Ready when you are"}
            </small>

          </span>

        </div>

        {/* Actions */}
        <div className="daily-goal-header__actions">

          {/* Notifications */}
          <button
            type="button"
            className="daily-goal-header__icon-button"
            aria-label="Notifications"
            title="Notifications"
          >
            <Bell size={19} />

            {notificationCount > 0 && (
              <span className="daily-goal-header__notification-badge">
                {notificationCount > 99
                  ? "99+"
                  : notificationCount}
              </span>
            )}
          </button>

          {/* Theme */}
          <button
            type="button"
            className="daily-goal-header__icon-button"
            onClick={handleThemeChange}
            aria-label={`Switch theme. Current theme: ${
              currentTheme?.label || "Light"
            }`}
            title={`Theme: ${
              currentTheme?.label || "Light"
            }`}
          >
            <ThemeIcon size={19} />
          </button>

          {/* Profile */}
          <button
            type="button"
            className="daily-goal-header__profile"
            onClick={() => {
              setDraftName(displayName);
              setEditingName(true);
            }}
            aria-label="Edit profile"
          >

            <div
              className="daily-goal-header__avatar"
              aria-hidden="true"
            >
              DG
            </div>

            <div className="daily-goal-header__profile-copy">
              <strong>Study Profile</strong>
              <span>Focus learner</span>
            </div>

          </button>

        </div>
      </div>

      {/* =====================================================
          PROFILE EDIT POPOVER
      ====================================================== */}

      {editingName && (
        <div className="daily-goal-header__name-popover">

          <div className="daily-goal-header__name-heading">
            <span>Edit profile name</span>

            <strong>
              Personalize your Daily Goal profile.
            </strong>
          </div>

          <input
            value={draftName}
            onChange={(e) =>
              setDraftName(e.target.value)
            }
            autoFocus
            maxLength={40}
            aria-label="Profile name"
          />

          <div className="daily-goal-header__name-actions">

            <button
              type="button"
              onClick={() =>
                setEditingName(false)
              }
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={saveName}
            >
              Save
            </button>

          </div>
        </div>
      )}

    </header>
  );
}

export default Header;