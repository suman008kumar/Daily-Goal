const STORAGE_VERSION = "v1";

const STORAGE_KEYS = {
  settings: `daily_goal_settings_${STORAGE_VERSION}`,
  sessions: `daily_goal_sessions_${STORAGE_VERSION}`,
  alerts: `daily_goal_alerts_${STORAGE_VERSION}`,
  preferences: `daily_goal_preferences_${STORAGE_VERSION}`,
  statistics: `daily_goal_statistics_${STORAGE_VERSION}`,
  monitoring: `daily_goal_monitoring_${STORAGE_VERSION}`,
};

const memoryStorage = new Map();

const isLocalStorageAvailable = () => {
  try {
    const testKey =
      "__daily_goal_storage_test__";

    localStorage.setItem(
      testKey,
      "1"
    );

    localStorage.removeItem(
      testKey
    );

    return true;
  } catch {
    return false;
  }
};

const storageAvailable =
  isLocalStorageAvailable();

const readValue = (
  key,
  fallback
) => {
  try {
    if (storageAvailable) {
      const value =
        localStorage.getItem(key);

      if (value === null) {
        return fallback;
      }

      return JSON.parse(value);
    }

    if (memoryStorage.has(key)) {
      return memoryStorage.get(key);
    }

    return fallback;
  } catch (error) {
    console.warn(
      `Unable to read storage key: ${key}`,
      error
    );

    return fallback;
  }
};

const writeValue = (
  key,
  value
) => {
  try {
    if (storageAvailable) {
      localStorage.setItem(
        key,
        JSON.stringify(value)
      );

      return true;
    }

    memoryStorage.set(
      key,
      value
    );

    return true;
  } catch (error) {
    console.warn(
      `Unable to save storage key: ${key}`,
      error
    );

    try {
      memoryStorage.set(
        key,
        value
      );

      return true;
    } catch {
      return false;
    }
  }
};

const removeValue = (key) => {
  try {
    if (storageAvailable) {
      localStorage.removeItem(key);
    }

    memoryStorage.delete(key);

    return true;
  } catch {
    return false;
  }
};

/* ----------------------------------
   Settings
----------------------------------- */

export const getSettings = () =>
  readValue(
    STORAGE_KEYS.settings,
    {
      dailyGoalSeconds:
        2 * 60 * 60,

      defaultSessionSeconds:
        60 * 60,

      breakDurationSeconds:
        5 * 60,

      numberOfBreaks: 2,

      autoPause: true,

      alertIntensity: "medium",
    }
  );

export const saveSettings = (
  settings
) =>
  writeValue(
    STORAGE_KEYS.settings,
    settings
  );

/* ----------------------------------
   Preferences
----------------------------------- */

export const getPreferences = () =>
  readValue(
    STORAGE_KEYS.preferences,
    {
      theme: "light",

      soundEnabled: true,

      soundVolume: 0.7,

      notificationsEnabled: true,

      aiMode: "DEMO",

      cameraEnabled: true,

      autoStartMonitoring: false,
    }
  );

export const savePreferences = (
  preferences
) =>
  writeValue(
    STORAGE_KEYS.preferences,
    preferences
  );

/* ----------------------------------
   Sessions
----------------------------------- */

export const getSessions = () =>
  readValue(
    STORAGE_KEYS.sessions,
    []
  );

export const saveSessions = (
  sessions
) =>
  writeValue(
    STORAGE_KEYS.sessions,
    Array.isArray(sessions)
      ? sessions
      : []
  );

export const addSession = (
  session
) => {
  const sessions =
    getSessions();

  const nextSessions = [
    session,
    ...sessions,
  ];

  saveSessions(
    nextSessions
  );

  return session;
};

export const updateSession = (
  sessionId,
  updates
) => {
  const sessions =
    getSessions();

  const updated =
    sessions.map(
      (session) =>
        session.id === sessionId
          ? {
              ...session,
              ...updates,
            }
          : session
    );

  saveSessions(updated);

  return updated;
};

export const deleteSession = (
  sessionId
) => {
  const sessions =
    getSessions();

  const updated =
    sessions.filter(
      (session) =>
        session.id !== sessionId
    );

  saveSessions(updated);

  return updated;
};

/* ----------------------------------
   Alerts
----------------------------------- */

export const getAlerts = () =>
  readValue(
    STORAGE_KEYS.alerts,
    []
  );

export const saveAlerts = (
  alerts
) =>
  writeValue(
    STORAGE_KEYS.alerts,
    Array.isArray(alerts)
      ? alerts
      : []
  );

export const addAlert = (
  alert
) => {
  const alerts =
    getAlerts();

  const nextAlerts = [
    alert,
    ...alerts,
  ].slice(0, 200);

  saveAlerts(nextAlerts);

  return alert;
};

export const updateAlert = (
  alertId,
  updates
) => {
  const alerts =
    getAlerts();

  const updated =
    alerts.map(
      (alert) =>
        alert.id === alertId
          ? {
              ...alert,
              ...updates,
            }
          : alert
    );

  saveAlerts(updated);

  return updated;
};

export const deleteAlert = (
  alertId
) => {
  const alerts =
    getAlerts();

  const updated =
    alerts.filter(
      (alert) =>
        alert.id !== alertId
    );

  saveAlerts(updated);

  return updated;
};

export const clearAlerts =
  () =>
    saveAlerts([]);

/* ----------------------------------
   Statistics
----------------------------------- */

export const getStatistics = () =>
  readValue(
    STORAGE_KEYS.statistics,
    {
      totalStudySeconds: 0,
      focusedSeconds: 0,
      distractedSeconds: 0,
      breakSeconds: 0,
      phoneUsageSeconds: 0,
      distractionCount: 0,
      averageFocusScore: 0,
    }
  );

export const saveStatistics = (
  statistics
) =>
  writeValue(
    STORAGE_KEYS.statistics,
    statistics
  );

export const updateStatistics = (
  updates
) => {
  const current =
    getStatistics();

  const updated = {
    ...current,
    ...updates,
  };

  saveStatistics(updated);

  return updated;
};

/* ----------------------------------
   Monitoring
----------------------------------- */

export const getMonitoringSettings =
  () =>
    readValue(
      STORAGE_KEYS.monitoring,
      {
        cameraEnabled: true,
        aiEnabled: true,
        autoStart: false,
        autoPause: true,
        muted: false,
      }
    );

export const saveMonitoringSettings =
  (settings) =>
    writeValue(
      STORAGE_KEYS.monitoring,
      settings
    );

/* ----------------------------------
   Daily Goal
----------------------------------- */

export const getDailyGoal =
  () => {
    const settings =
      getSettings();

    return Number(
      settings.dailyGoalSeconds
    );
  };

export const setDailyGoal = (
  seconds
) => {
  const settings =
    getSettings();

  const updated = {
    ...settings,
    dailyGoalSeconds:
      Math.max(
        0,
        Number(seconds) || 0
      ),
  };

  saveSettings(updated);

  return updated.dailyGoalSeconds;
};

/* ----------------------------------
   Clear / Reset
----------------------------------- */

export const clearAllData = () => {
  Object.values(
    STORAGE_KEYS
  ).forEach((key) => {
    removeValue(key);
  });

  try {
    localStorage.removeItem(
      "daily_goal_active_session"
    );

    localStorage.removeItem(
      "daily_goal_camera_preferences"
    );

    localStorage.removeItem(
      "daily_goal_monitoring_preferences"
    );
  } catch {
    // Continue.
  }

  memoryStorage.clear();

  return true;
};

export const exportData = () => ({
  version: STORAGE_VERSION,

  settings: getSettings(),

  preferences:
    getPreferences(),

  sessions:
    getSessions(),

  alerts:
    getAlerts(),

  statistics:
    getStatistics(),

  monitoring:
    getMonitoringSettings(),

  exportedAt:
    new Date().toISOString(),
});

export const importData = (
  data
) => {
  if (
    !data ||
    typeof data !== "object"
  ) {
    throw new Error(
      "Invalid Daily Goal data."
    );
  }

  if (data.settings) {
    saveSettings(
      data.settings
    );
  }

  if (data.preferences) {
    savePreferences(
      data.preferences
    );
  }

  if (Array.isArray(data.sessions)) {
    saveSessions(
      data.sessions
    );
  }

  if (Array.isArray(data.alerts)) {
    saveAlerts(
      data.alerts
    );
  }

  if (data.statistics) {
    saveStatistics(
      data.statistics
    );
  }

  if (data.monitoring) {
    saveMonitoringSettings(
      data.monitoring
    );
  }

  return true;
};

export const getStorageInfo = () => ({
  version: STORAGE_VERSION,
  localStorageAvailable:
    storageAvailable,
  keys: STORAGE_KEYS,
});

export default {
  getSettings,
  saveSettings,

  getPreferences,
  savePreferences,

  getSessions,
  saveSessions,
  addSession,
  updateSession,
  deleteSession,

  getAlerts,
  saveAlerts,
  addAlert,
  updateAlert,
  deleteAlert,
  clearAlerts,

  getStatistics,
  saveStatistics,
  updateStatistics,

  getMonitoringSettings,
  saveMonitoringSettings,

  getDailyGoal,
  setDailyGoal,

  clearAllData,

  exportData,
  importData,

  getStorageInfo,
};