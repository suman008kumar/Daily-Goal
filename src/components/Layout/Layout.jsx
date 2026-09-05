import React, { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import MobileNavbar from "./MobileNavbar";
import { getPreferences } from "../../services/storageService";
import "./Layout.css";

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [sidebarCollapsed, setSidebarCollapsed] =
    useState(false);

  const [preferences, setPreferences] = useState(() =>
    getPreferences()
  );

  const [monitoringActive, setMonitoringActive] =
    useState(false);

  const [notificationCount, setNotificationCount] =
    useState(0);

  /* =========================================================
     LOAD PREFERENCES
  ========================================================= */

  useEffect(() => {
    const loadPreferences = () => {
      const savedPreferences = getPreferences();

      setPreferences(savedPreferences);
    };

    loadPreferences();

    const handleStorageChange = () => {
      loadPreferences();
    };

    window.addEventListener(
      "storage",
      handleStorageChange
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorageChange
      );
    };
  }, []);

  /* =========================================================
     THEME CHANGE
  ========================================================= */

  const handleThemeChange = (nextTheme) => {
    const currentPreferences = getPreferences();

    const updatedPreferences = {
      ...currentPreferences,
      theme: nextTheme,
    };

    setPreferences(updatedPreferences);

    window.dispatchEvent(
      new CustomEvent(
        "daily-goal-theme-change",
        {
          detail: {
            theme: nextTheme,
          },
        }
      )
    );
  };

  /* =========================================================
     SIDEBAR
  ========================================================= */

  const handleMenuToggle = () => {
    setSidebarOpen((previous) => !previous);
  };

  const handleSidebarClose = () => {
    setSidebarOpen(false);
  };

  const handleSidebarCollapse = () => {
    setSidebarCollapsed((previous) => !previous);
  };

  const handleMoreClick = () => {
    setSidebarOpen(true);
  };

  /* =========================================================
     RESPONSIVE
  ========================================================= */

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener(
      "resize",
      handleResize
    );

    return () => {
      window.removeEventListener(
        "resize",
        handleResize
      );
    };
  }, []);

  /* =========================================================
     MONITORING
  ========================================================= */

  useEffect(() => {
    const handleMonitoringChange = (event) => {
      const active = event?.detail?.active;

      if (typeof active === "boolean") {
        setMonitoringActive(active);
      }
    };

    window.addEventListener("daily-goal-monitoring-change", handleMonitoringChange);
    return () => {
      window.removeEventListener("daily-goal-monitoring-change", handleMonitoringChange);
    };
  }, []);

  /* =========================================================
     NOTIFICATIONS
  ========================================================= */

  useEffect(() => {
    const handleNotificationChange = (event) => {
      const count = event?.detail?.count;

      if (typeof count === "number") {
        setNotificationCount(
          Math.max(0, count)
        );
      }
    };

    window.addEventListener(
      "daily-goal-notification-count",
      handleNotificationChange
    );

    return () => {
      window.removeEventListener(
        "daily-goal-notification-count",
        handleNotificationChange
      );
    };
  }, []);

  /* =========================================================
     THEME
  ========================================================= */

  const activeTheme =
    preferences?.theme || "light";

  return (
    <div
      className={[
        "daily-goal-layout",

        sidebarCollapsed
          ? "daily-goal-layout--sidebar-collapsed"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}

      data-theme={activeTheme}
    >

      <Sidebar
        isOpen={sidebarOpen}
        isCollapsed={sidebarCollapsed}
        onClose={handleSidebarClose}
        onToggleCollapse={handleSidebarCollapse}
      />

      <div className="daily-goal-layout__main">

        <Header
          onMenuToggle={handleMenuToggle}
          monitoringActive={monitoringActive}
          notificationCount={notificationCount}
          theme={activeTheme}
          onThemeChange={handleThemeChange}
        />

        <main className="daily-goal-layout__content">
          {children}
        </main>

      </div>

      <MobileNavbar
        onMoreClick={handleMoreClick}
      />

    </div>
  );
}

export default Layout;