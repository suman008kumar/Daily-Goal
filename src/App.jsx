import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

import Layout from "./components/Layout/Layout";
import SplashScreen from "./components/Common/SplashScreen";
import dailyGoalLogo from "./assets/logo/D-G.png";

import Dashboard from "./pages/Dashboard/Dashboard";
import LiveMonitoring from "./pages/LiveMonitoring/LiveMonitoring";
import Analytics from "./pages/Analytics/Analytics";
import Sessions from "./pages/Sessions/Sessions";
import Alerts from "./pages/Alerts/Alerts";
import SmartReport from "./pages/SmartReport/SmartReport";
import LiveUsers from "./pages/LiveUsers/LiveUsers";
import Settings from "./pages/Settings/Settings";

import {
  getPreferences,
  savePreferences,
} from "./services/storageService";


/* =========================================================
   ROUTE CHANGE ANIMATION
========================================================= */

function RouteAnimation({ children }) {
  const location = useLocation();
  return <div key={location.pathname} className="page-transition">{children}</div>;
}


/* =========================================================
   THEME HANDLER
========================================================= */

const applyTheme = (theme) => {
  const root = document.documentElement;

  if (theme === "system") {
    const prefersDark =
      window.matchMedia &&
      window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;

    root.dataset.theme = prefersDark
      ? "dark"
      : "light";

    return;
  }

  root.dataset.theme =
    theme || "light";
};


/* =========================================================
   APP
========================================================= */

function AppContent() {
  const [showSplash, setShowSplash] =
    useState(true);

  const [preferences, setPreferences] =
    useState(() =>
      getPreferences()
    );


  /* -----------------------------------------
     APPLY THEME
  ----------------------------------------- */

  useEffect(() => {
    const theme =
      preferences?.theme || "light";

    applyTheme(theme);

    if (theme !== "system") {
      return undefined;
    }

    const mediaQuery =
      window.matchMedia(
        "(prefers-color-scheme: dark)"
      );

    const handleThemeChange = () => {
      applyTheme("system");
    };

    mediaQuery.addEventListener?.(
      "change",
      handleThemeChange
    );

    return () => {
      mediaQuery.removeEventListener?.(
        "change",
        handleThemeChange
      );
    };
  }, [preferences?.theme]);


  /* -----------------------------------------
     SYNC STORAGE CHANGES
  ----------------------------------------- */

  useEffect(() => {
    const handleStorageChange = () => {
      const updated =
        getPreferences();

      setPreferences(updated);
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


  /* -----------------------------------------
     SPLASH
  ----------------------------------------- */

  const handleSplashComplete =
    () => {
      setShowSplash(false);
    };


  /* -----------------------------------------
     GLOBAL THEME EVENT
  ----------------------------------------- */

  useEffect(() => {
    const handleThemeUpdate = (
      event
    ) => {
      const nextTheme =
        event?.detail?.theme;

      if (!nextTheme) {
        return;
      }

      const current =
        getPreferences();

      const updated = {
        ...current,
        theme: nextTheme,
      };

      savePreferences(
        updated
      );

      setPreferences(updated);

      applyTheme(nextTheme);
    };

    window.addEventListener(
      "daily-goal-theme-change",
      handleThemeUpdate
    );

    return () => {
      window.removeEventListener(
        "daily-goal-theme-change",
        handleThemeUpdate
      );
    };
  }, []);


  return (
    <>
      {showSplash && (
        <SplashScreen
          logo={dailyGoalLogo}
          onComplete={
            handleSplashComplete
          }
        />
      )}

      <BrowserRouter>
        <Layout>
          <RouteAnimation>
            <Routes>

              {/* Dashboard */}
              <Route
                path="/"
                element={
                  <Dashboard />
                }
              />

              {/* Live Monitoring */}
              <Route
                path="/live-monitoring"
                element={
                  <LiveMonitoring />
                }
              />

              {/* Analytics */}
              <Route
                path="/analytics"
                element={
                  <Analytics />
                }
              />

              {/* Sessions */}
              <Route
                path="/sessions"
                element={
                  <Sessions />
                }
              />

              {/* Alerts */}
              <Route
                path="/alerts"
                element={
                  <Alerts />
                }
              />

              {/* Smart Report */}
              <Route
                path="/smart-report"
                element={
                  <SmartReport />
                }
              />

              {/* Live Users */}
              <Route
                path="/live-users"
                element={
                  <LiveUsers />
                }
              />

              {/* Settings */}
              <Route
                path="/settings"
                element={
                  <Settings />
                }
              />

              {/* Unknown Route */}
              <Route
                path="*"
                element={
                  <Navigate
                    to="/"
                    replace
                  />
                }
              />

            </Routes>
          </RouteAnimation>
        </Layout>
      </BrowserRouter>
    </>
  );
}


/* =========================================================
   ROOT APP
========================================================= */

export default function App() {
  return (
    <AppContent />
  );
}