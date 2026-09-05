import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  BellOff,
  Brain,
  Camera,
  Check,
  Clock3,
  Download,
  Eye,
  HardDrive,
  Moon,
  Palette,
  RotateCcw,
  Save,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  Sun,
  Trash2,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";

import Badge from "../../components/Common/Badge";
import Button from "../../components/Common/Button";
import ConfirmDialog from "../../components/Common/ConfirmDialog";

import {
  getDailyGoal,
  getMonitoringSettings,
  getPreferences,
  getSettings,
  saveMonitoringSettings,
  savePreferences,
  saveSettings,
  clearAllData,
  exportData,
} from "../../services/storageService";

import "./Settings.css";

/* ==========================================================================
   Helpers
   ========================================================================== */

const DEFAULT_SETTINGS = {
  dailyGoalSeconds: 2 * 60 * 60,
  defaultSessionSeconds: 60 * 60,
  breakSeconds: 5 * 60,
  numberOfBreaks: 2,
  autoPause: true,
  alertIntensity: "medium",
};

const DEFAULT_PREFERENCES = {
  theme: "light",
  soundEnabled: true,
  volume: 0.7,
  notificationsEnabled: true,
  aiMode: "DEMO",
  cameraEnabled: true,
  autoStartMonitoring: false,
};

const DEFAULT_MONITORING = {
  autoPause: true,
  alertIntensity: "medium",
  muteAlerts: false,
};

const clamp = (value, min, max) =>
  Math.min(max, Math.max(min, Number(value) || 0));

const formatDuration = (seconds) => {
  const value = Math.max(0, Number(seconds) || 0);

  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
};

const normalizeSeconds = (value, fallback) => {
  const number = Number(value);

  return Number.isFinite(number) && number >= 0 ? number : fallback;
};

/* ==========================================================================
   Reusable Setting Row
   ========================================================================== */

const SettingRow = ({
  icon: Icon,
  title,
  description,
  children,
  tone = "primary",
}) => (
  <div className="settings__row">
    <div className={`settings__row-icon settings__row-icon--${tone}`}>
      <Icon size={19} strokeWidth={2} />
    </div>

    <div className="settings__row-content">
      <strong>{title}</strong>
      <span>{description}</span>
    </div>

    <div className="settings__row-control">{children}</div>
  </div>
);

/* ==========================================================================
   Toggle
   ========================================================================== */

const Toggle = ({ checked, onChange, label }) => (
  <button
    type="button"
    className={`settings__toggle ${checked ? "is-on" : ""}`}
    onClick={() => onChange(!checked)}
    role="switch"
    aria-checked={checked}
    aria-label={label}
  >
    <span className="settings__toggle-track">
      <span className="settings__toggle-thumb">
        {checked && <Check size={11} strokeWidth={3} />}
      </span>
    </span>

    <span className="settings__toggle-label">
      {checked ? "On" : "Off"}
    </span>
  </button>
);

/* ==========================================================================
   Select
   ========================================================================== */

const Select = ({ value, onChange, options, ariaLabel }) => (
  <select
    className="settings__select"
    value={value}
    onChange={(event) => onChange(event.target.value)}
    aria-label={ariaLabel}
  >
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);

/* ==========================================================================
   Main
   ========================================================================== */

const Settings = () => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [monitoring, setMonitoring] = useState(DEFAULT_MONITORING);

  const [saved, setSaved] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);

  const loadSettings = useCallback(() => {
    try {
      const storedSettings =
        typeof getSettings === "function"
          ? getSettings()
          : getDailyGoal();

      const storedPreferences =
        typeof getPreferences === "function"
          ? getPreferences()
          : {};

      const storedMonitoring =
        typeof getMonitoringSettings === "function"
          ? getMonitoringSettings()
          : {};

      setSettings({
        ...DEFAULT_SETTINGS,
        ...(storedSettings || {}),
      });

      setPreferences({
        ...DEFAULT_PREFERENCES,
        ...(storedPreferences || {}),
      });

      setMonitoring({
        ...DEFAULT_MONITORING,
        ...(storedMonitoring || {}),
      });
    } catch (error) {
      console.warn("Unable to load settings:", error);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  /* ------------------------------------------------------------------------
     Derived
     ------------------------------------------------------------------------ */

  const goalLabel = useMemo(
    () => formatDuration(settings.dailyGoalSeconds),
    [settings.dailyGoalSeconds]
  );

  const sessionLabel = useMemo(
    () => formatDuration(settings.defaultSessionSeconds),
    [settings.defaultSessionSeconds]
  );

  /* ------------------------------------------------------------------------
     Updates
     ------------------------------------------------------------------------ */

  const updateSetting = (key, value) => {
    setSaved(false);

    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const updatePreference = (key, value) => {
    setSaved(false);

    setPreferences((current) => ({
      ...current,
      [key]: value,
    }));

    if (key === "theme") {
      document.documentElement.dataset.theme = value;
    }
  };

  const updateMonitoring = (key, value) => {
    setSaved(false);

    setMonitoring((current) => ({
      ...current,
      [key]: value,
    }));
  };

  /* ------------------------------------------------------------------------
     Save
     ------------------------------------------------------------------------ */

  const handleSave = () => {
    try {
      const safeSettings = {
        ...settings,
        dailyGoalSeconds: normalizeSeconds(
          settings.dailyGoalSeconds,
          DEFAULT_SETTINGS.dailyGoalSeconds
        ),
        defaultSessionSeconds: normalizeSeconds(
          settings.defaultSessionSeconds,
          DEFAULT_SETTINGS.defaultSessionSeconds
        ),
        breakSeconds: normalizeSeconds(
          settings.breakSeconds,
          DEFAULT_SETTINGS.breakSeconds
        ),
        numberOfBreaks: Math.max(
          0,
          Math.round(
            Number(settings.numberOfBreaks) ||
              DEFAULT_SETTINGS.numberOfBreaks
          )
        ),
      };

      const safePreferences = {
        ...preferences,
        volume: clamp(preferences.volume, 0, 1),
      };

      const safeMonitoring = {
        ...monitoring,
      };

      saveSettings(safeSettings);
      savePreferences(safePreferences);
      saveMonitoringSettings(safeMonitoring);

      setSettings(safeSettings);
      setPreferences(safePreferences);
      setMonitoring(safeMonitoring);

      setSaved(true);

      window.setTimeout(() => {
        setSaved(false);
      }, 2500);
    } catch (error) {
      console.error("Unable to save settings:", error);
    }
  };

  /* ------------------------------------------------------------------------
     Reset Preferences
     ------------------------------------------------------------------------ */

  const handleResetPreferences = () => {
    setSettings(DEFAULT_SETTINGS);
    setPreferences(DEFAULT_PREFERENCES);
    setMonitoring(DEFAULT_MONITORING);

    try {
      saveSettings(DEFAULT_SETTINGS);
      savePreferences(DEFAULT_PREFERENCES);
      saveMonitoringSettings(DEFAULT_MONITORING);

      document.documentElement.dataset.theme =
        DEFAULT_PREFERENCES.theme;
    } catch (error) {
      console.error("Unable to reset preferences:", error);
    }

    setShowResetDialog(false);
    setSaved(true);

    window.setTimeout(() => {
      setSaved(false);
    }, 2500);
  };

  /* ------------------------------------------------------------------------
     Export
     ------------------------------------------------------------------------ */

  const handleExport = () => {
    try {
      if (typeof exportData === "function") {
        const data = exportData();

        if (data instanceof Blob) {
          const url = URL.createObjectURL(data);
          const anchor = document.createElement("a");

          anchor.href = url;
          anchor.download = "daily-goal-data.json";
          anchor.click();

          URL.revokeObjectURL(url);
          return;
        }

        if (typeof data === "string") {
          const blob = new Blob([data], {
            type: "application/json",
          });

          const url = URL.createObjectURL(blob);
          const anchor = document.createElement("a");

          anchor.href = url;
          anchor.download = "daily-goal-data.json";
          anchor.click();

          URL.revokeObjectURL(url);
        }
      }
    } catch (error) {
      console.error("Unable to export data:", error);
    }
  };

  /* ------------------------------------------------------------------------
     Clear all
     ------------------------------------------------------------------------ */

  const handleClearAll = () => {
    try {
      if (typeof clearAllData === "function") {
        clearAllData();
      }

      loadSettings();
    } catch (error) {
      console.error("Unable to clear application data:", error);
    }

    setShowClearDialog(false);
  };

  return (
    <div className="settings-page">
      <div className="settings-page__ambient settings-page__ambient--one" />
      <div className="settings-page__ambient settings-page__ambient--two" />

      {/* Header */}
      <header className="settings__header">
        <div>
          <div className="settings__eyebrow">
            <SettingsIcon size={14} />
            Personalize your experience
          </div>

          <h1>Settings</h1>

          <p>
            Configure your Daily Goal, monitoring preferences, alerts,
            AI mode, camera and privacy controls.
          </p>
        </div>

        <div className="settings__header-actions">
          {saved && (
            <Badge
              variant="success"
              size="md"
              icon={<Check size={14} />}
              showIcon
              pulse
            >
              Saved
            </Badge>
          )}

          <Button
            variant="primary"
            size="md"
            icon={<Save size={17} />}
            onClick={handleSave}
          >
            Save Changes
          </Button>
        </div>
      </header>

      {/* Quick overview */}
      <section className="settings__overview">
        <div className="settings__overview-card">
          <div className="settings__overview-icon">
            <Clock3 size={19} />
          </div>

          <div>
            <span>Daily Goal</span>
            <strong>{goalLabel}</strong>
          </div>
        </div>

        <div className="settings__overview-card">
          <div className="settings__overview-icon">
            <Brain size={19} />
          </div>

          <div>
            <span>AI Mode</span>
            <strong>{preferences.aiMode}</strong>
          </div>
        </div>

        <div className="settings__overview-card">
          <div className="settings__overview-icon">
            <Camera size={19} />
          </div>

          <div>
            <span>Camera</span>
            <strong>
              {preferences.cameraEnabled ? "Enabled" : "Disabled"}
            </strong>
          </div>
        </div>

        <div className="settings__overview-card">
          <div className="settings__overview-icon">
            <Zap size={19} />
          </div>

          <div>
            <span>Session Length</span>
            <strong>{sessionLabel}</strong>
          </div>
        </div>
      </section>

      <div className="settings__layout">
        {/* ================================================================
            STUDY SETTINGS
            ================================================================ */}
        <section className="settings__section">
          <div className="settings__section-header">
            <div className="settings__section-icon">
              <Clock3 size={19} />
            </div>

            <div>
              <h2>Study & Daily Goal</h2>
              <p>Set the rhythm that works best for your study routine.</p>
            </div>
          </div>

          <div className="settings__body">
            <SettingRow
              icon={Clock3}
              title="Daily Goal"
              description="How much focused study time you want to complete each day."
              tone="accent"
            >
              <Select
                value={String(settings.dailyGoalSeconds)}
                onChange={(value) =>
                  updateSetting("dailyGoalSeconds", Number(value))
                }
                ariaLabel="Daily goal"
                options={[
                  { value: "1800", label: "30 minutes" },
                  { value: "2700", label: "45 minutes" },
                  { value: "3600", label: "1 hour" },
                  { value: "5400", label: "1.5 hours" },
                  { value: "7200", label: "2 hours" },
                  { value: "10800", label: "3 hours" },
                  { value: "14400", label: "4 hours" },
                ]}
              />
            </SettingRow>

            <SettingRow
              icon={Brain}
              title="Default Session"
              description="The duration selected when a new study session starts."
            >
              <Select
                value={String(settings.defaultSessionSeconds)}
                onChange={(value) =>
                  updateSetting(
                    "defaultSessionSeconds",
                    Number(value)
                  )
                }
                ariaLabel="Default session duration"
                options={[
                  { value: "1800", label: "30 minutes" },
                  { value: "2700", label: "45 minutes" },
                  { value: "3600", label: "1 hour" },
                  { value: "5400", label: "1.5 hours" },
                  { value: "7200", label: "2 hours" },
                  { value: "10800", label: "3 hours" },
                ]}
              />
            </SettingRow>

            <SettingRow
              icon={Clock3}
              title="Break Duration"
              description="Length of each scheduled study break."
              tone="warning"
            >
              <Select
                value={String(settings.breakSeconds)}
                onChange={(value) =>
                  updateSetting("breakSeconds", Number(value))
                }
                ariaLabel="Break duration"
                options={[
                  { value: "60", label: "1 minute" },
                  { value: "300", label: "5 minutes" },
                  { value: "600", label: "10 minutes" },
                  { value: "900", label: "15 minutes" },
                  { value: "1200", label: "20 minutes" },
                ]}
              />
            </SettingRow>

            <SettingRow
              icon={RotateCcw}
              title="Number of Breaks"
              description="Scheduled breaks available during a session."
            >
              <Select
                value={String(settings.numberOfBreaks)}
                onChange={(value) =>
                  updateSetting("numberOfBreaks", Number(value))
                }
                ariaLabel="Number of breaks"
                options={[
                  { value: "0", label: "No breaks" },
                  { value: "1", label: "1 break" },
                  { value: "2", label: "2 breaks" },
                  { value: "3", label: "3 breaks" },
                  { value: "4", label: "4 breaks" },
                ]}
              />
            </SettingRow>

            <SettingRow
              icon={Zap}
              title="Automatic Pause"
              description="Pause monitoring when the configured break or interruption condition occurs."
              tone="warning"
            >
              <Toggle
                checked={Boolean(settings.autoPause)}
                onChange={(value) => {
                  updateSetting("autoPause", value);
                  updateMonitoring("autoPause", value);
                }}
                label="Automatic pause"
              />
            </SettingRow>
          </div>
        </section>

        {/* ================================================================
            MONITORING
            ================================================================ */}
        <section className="settings__section">
          <div className="settings__section-header">
            <div className="settings__section-icon settings__section-icon--monitor">
              <ShieldCheck size={19} />
            </div>

            <div>
              <h2>Monitoring & AI</h2>
              <p>Control how DAILY GOAL monitors your study sessions.</p>
            </div>
          </div>

          <div className="settings__body">
            <SettingRow
              icon={Brain}
              title="AI Analysis Mode"
              description="Choose between browser AI processing and clearly-labelled demo analysis."
              tone="accent"
            >
              <Select
                value={preferences.aiMode}
                onChange={(value) => updatePreference("aiMode", value)}
                ariaLabel="AI analysis mode"
                options={[
                  { value: "DEMO", label: "Demo Mode" },
                  { value: "LIVE", label: "Live AI" },
                ]}
              />
            </SettingRow>

            <SettingRow
              icon={Camera}
              title="Camera Monitoring"
              description="Allow DAILY GOAL to use the camera during monitoring sessions."
            >
              <Toggle
                checked={Boolean(preferences.cameraEnabled)}
                onChange={(value) =>
                  updatePreference("cameraEnabled", value)
                }
                label="Camera monitoring"
              />
            </SettingRow>

            <SettingRow
              icon={Zap}
              title="Auto-start Monitoring"
              description="Automatically start monitoring when a study session begins."
            >
              <Toggle
                checked={Boolean(preferences.autoStartMonitoring)}
                onChange={(value) =>
                  updatePreference("autoStartMonitoring", value)
                }
                label="Auto-start monitoring"
              />
            </SettingRow>

            <SettingRow
              icon={Bell}
              title="Alert Intensity"
              description="Choose how strongly monitoring alerts should notify you."
              tone="warning"
            >
              <Select
                value={monitoring.alertIntensity}
                onChange={(value) => {
                  updateMonitoring("alertIntensity", value);
                  updateSetting("alertIntensity", value);
                }}
                ariaLabel="Alert intensity"
                options={[
                  { value: "low", label: "Low" },
                  { value: "medium", label: "Medium" },
                  { value: "high", label: "High" },
                ]}
              />
            </SettingRow>

            <SettingRow
              icon={BellOff}
              title="Mute Monitoring Alerts"
              description="Temporarily silence audio alerts while monitoring continues."
            >
              <Toggle
                checked={Boolean(monitoring.muteAlerts)}
                onChange={(value) =>
                  updateMonitoring("muteAlerts", value)
                }
                label="Mute monitoring alerts"
              />
            </SettingRow>
          </div>
        </section>

        {/* ================================================================
            NOTIFICATIONS
            ================================================================ */}
        <section className="settings__section">
          <div className="settings__section-header">
            <div className="settings__section-icon settings__section-icon--notification">
              <Bell size={19} />
            </div>

            <div>
              <h2>Notifications & Sound</h2>
              <p>Decide how DAILY GOAL should keep you informed.</p>
            </div>
          </div>

          <div className="settings__body">
            <SettingRow
              icon={Bell}
              title="Browser Notifications"
              description="Allow supported browsers to show important study alerts."
              tone="primary"
            >
              <Toggle
                checked={Boolean(preferences.notificationsEnabled)}
                onChange={(value) =>
                  updatePreference("notificationsEnabled", value)
                }
                label="Browser notifications"
              />
            </SettingRow>

            <SettingRow
              icon={preferences.soundEnabled ? Volume2 : VolumeX}
              title="Sound Effects"
              description="Play warning, break, distraction and session-complete sounds."
              tone="accent"
            >
              <Toggle
                checked={Boolean(preferences.soundEnabled)}
                onChange={(value) =>
                  updatePreference("soundEnabled", value)
                }
                label="Sound effects"
              />
            </SettingRow>

            <div className="settings__volume">
              <div className="settings__volume-header">
                <div>
                  <strong>Alert Volume</strong>
                  <span>Adjust the volume of DAILY GOAL sounds.</span>
                </div>

                <Badge variant="secondary" size="sm">
                  {Math.round(preferences.volume * 100)}%
                </Badge>
              </div>

              <div className="settings__range-wrap">
                <Volume2 size={16} />

                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={preferences.volume}
                  onChange={(event) =>
                    updatePreference(
                      "volume",
                      Number(event.target.value)
                    )
                  }
                  aria-label="Alert volume"
                />

                <Volume2 size={19} />
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================
            APPEARANCE
            ================================================================ */}
        <section className="settings__section">
          <div className="settings__section-header">
            <div className="settings__section-icon settings__section-icon--appearance">
              <Palette size={19} />
            </div>

            <div>
              <h2>Appearance</h2>
              <p>Make DAILY GOAL feel comfortable in your environment.</p>
            </div>
          </div>

          <div className="settings__body">
            <SettingRow
              icon={Palette}
              title="Theme"
              description="Choose the interface appearance."
              tone="accent"
            >
              <Select
                value={preferences.theme}
                onChange={(value) => updatePreference("theme", value)}
                ariaLabel="Theme"
                options={[
                  { value: "light", label: "Light" },
                  { value: "dark", label: "Dark" },
                  { value: "system", label: "System" },
                ]}
              />
            </SettingRow>

            <div className="settings__theme-preview">
              <button
                type="button"
                className={`settings__theme-card ${
                  preferences.theme === "light" ? "is-selected" : ""
                }`}
                onClick={() => updatePreference("theme", "light")}
              >
                <div className="settings__theme-preview-light">
                  <Sun size={19} />
                </div>

                <strong>Light</strong>
                <span>Clean & bright</span>

                {preferences.theme === "light" && (
                  <Check className="settings__theme-check" size={16} />
                )}
              </button>

              <button
                type="button"
                className={`settings__theme-card settings__theme-card--dark ${
                  preferences.theme === "dark" ? "is-selected" : ""
                }`}
                onClick={() => updatePreference("theme", "dark")}
              >
                <div className="settings__theme-preview-dark">
                  <Moon size={19} />
                </div>

                <strong>Dark</strong>
                <span>Comfortable at night</span>

                {preferences.theme === "dark" && (
                  <Check className="settings__theme-check" size={16} />
                )}
              </button>
            </div>
          </div>
        </section>

        {/* ================================================================
            PRIVACY
            ================================================================ */}
        <section className="settings__section">
          <div className="settings__section-header">
            <div className="settings__section-icon settings__section-icon--privacy">
              <ShieldCheck size={19} />
            </div>

            <div>
              <h2>Privacy & Data</h2>
              <p>Understand and manage the information stored by the app.</p>
            </div>
          </div>

          <div className="settings__body">
            <div className="settings__privacy-card">
              <div className="settings__privacy-icon">
                <HardDrive size={20} />
              </div>

              <div>
                <strong>Browser-first storage</strong>
                <span>
                  Your DAILY GOAL preferences, sessions and alerts are
                  designed to stay in browser storage in this frontend-only
                  application.
                </span>
              </div>
            </div>

            <div className="settings__privacy-actions">
              <Button
                variant="secondary"
                size="md"
                icon={<Download size={16} />}
                onClick={handleExport}
              >
                Export My Data
              </Button>

              <Button
                variant="ghost"
                size="md"
                icon={<RotateCcw size={16} />}
                onClick={() => setShowResetDialog(true)}
              >
                Reset Preferences
              </Button>

              <Button
                variant="danger"
                size="md"
                icon={<Trash2 size={16} />}
                onClick={() => setShowClearDialog(true)}
              >
                Clear All Data
              </Button>
            </div>

            <div className="settings__privacy-note">
              <Eye size={16} />

              <span>
                Camera access is controlled by your browser. DAILY GOAL
                cannot silently enable camera permissions.
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* Bottom save */}
      <div className="settings__bottom-bar">
        <div>
          <Sparkles size={17} />

          <span>
            Changes are stored locally when you select{" "}
            <strong>Save Changes</strong>.
          </span>
        </div>

        <Button
          variant="primary"
          size="md"
          icon={<Save size={16} />}
          onClick={handleSave}
        >
          Save Changes
        </Button>
      </div>

      {/* Reset */}
      <ConfirmDialog
        open={showResetDialog}
        title="Reset Preferences?"
        message="Your settings will return to the default DAILY GOAL configuration."
        variant="warning"
        confirmLabel="Reset Preferences"
        cancelLabel="Keep Settings"
        onConfirm={handleResetPreferences}
        onCancel={() => setShowResetDialog(false)}
      />

      {/* Clear */}
      <ConfirmDialog
        open={showClearDialog}
        title="Clear All Data?"
        message="This will remove locally stored sessions, alerts, statistics and preferences. This action cannot be undone."
        variant="danger"
        confirmLabel="Clear Everything"
        cancelLabel="Cancel"
        destructive
        onConfirm={handleClearAll}
        onCancel={() => setShowClearDialog(false)}
      />
    </div>
  );
};

export default Settings;