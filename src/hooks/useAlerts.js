import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  getAlerts,
  saveAlerts,
} from "../services/storageService";

const ALERT_COOLDOWN = 10000;

const createAlert = (alert) => ({
  id:
    alert.id ||
    `alert_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`,

  type:
    alert.type || "INFO",

  level:
    alert.level || "INFO",

  title:
    alert.title || "Study alert",

  description:
    alert.description || "",

  timestamp:
    alert.timestamp || Date.now(),

  resolved:
    Boolean(alert.resolved),

  muted:
    Boolean(alert.muted),
});

export const useAlerts = ({
  soundService = null,
  notificationService = null,
  enabled = true,
  muted = false,
} = {}) => {
  const [alerts, setAlerts] =
    useState(() => getAlerts());

  const [
    currentAlert,
    setCurrentAlert,
  ] = useState(null);

  const cooldownsRef =
    useRef(new Map());

  const saveAlertHistory =
    useCallback((nextAlerts) => {
      try {
        saveAlerts(nextAlerts);
      } catch {
        // Memory-only fallback.
      }
    }, []);

  const canCreateAlert =
    useCallback((type) => {
      const now = Date.now();

      const previous =
        cooldownsRef.current.get(type);

      if (
        previous &&
        now - previous <
          ALERT_COOLDOWN
      ) {
        return false;
      }

      cooldownsRef.current.set(
        type,
        now
      );

      return true;
    }, []);

  const playAlertSound =
    useCallback(
      (alert) => {
        if (
          muted ||
          !soundService
        ) {
          return;
        }

        try {
          switch (alert.type) {
            case "PHONE":
              soundService.playPhone?.();
              break;

            case "DROWSY":
              soundService.playSleepy?.();
              break;

            case "EYES_CLOSED":
              soundService.playWarning?.();
              break;

            case "LOOKING_AWAY":
            case "LONG_DISTRACTION":
              soundService.playDistraction?.();
              break;

            case "BREAK_OVER":
              soundService.playBreak?.();
              break;

            case "SESSION_END":
              soundService.playSessionComplete?.();
              break;

            default:
              soundService.playWarning?.();
          }
        } catch {
          // Audio failure must never crash the app.
        }
      },
      [
        muted,
        soundService,
      ]
    );

  const sendBrowserNotification =
    useCallback(
      (alert) => {
        if (
          !notificationService
        ) {
          return;
        }

        try {
          notificationService.sendNotification?.(
            alert.title,
            {
              body:
                alert.description,
              tag: alert.type,
            }
          );
        } catch {
          // Browser notification failure ignored.
        }
      },
      [notificationService]
    );

  const addAlert =
    useCallback(
      (alertData) => {
        if (!enabled) {
          return null;
        }

        const alert =
          createAlert(alertData);

        if (
          !canCreateAlert(
            alert.type
          )
        ) {
          return null;
        }

        setAlerts((current) => {
          const next = [
            alert,
            ...current,
          ].slice(0, 200);

          saveAlertHistory(next);

          return next;
        });

        setCurrentAlert(alert);

        playAlertSound(alert);

        if (
          alert.level ===
            "CRITICAL" ||
          alert.level ===
            "WARNING"
        ) {
          sendBrowserNotification(
            alert
          );
        }

        return alert;
      },
      [
        enabled,
        canCreateAlert,
        saveAlertHistory,
        playAlertSound,
        sendBrowserNotification,
      ]
    );

  const dismissAlert =
    useCallback((alertId) => {
      setCurrentAlert(
        (current) =>
          current?.id === alertId
            ? null
            : current
      );

      setAlerts((current) => {
        const next =
          current.map((alert) =>
            alert.id === alertId
              ? {
                  ...alert,
                  resolved: true,
                }
              : alert
          );

        saveAlertHistory(next);

        return next;
      });
    }, [saveAlertHistory]);

  const resolveAlert =
    useCallback(
      (alertId) => {
        setAlerts((current) => {
          const next =
            current.map((alert) =>
              alert.id === alertId
                ? {
                    ...alert,
                    resolved: true,
                  }
                : alert
            );

          saveAlertHistory(next);

          return next;
        });

        setCurrentAlert(
          (current) =>
            current?.id === alertId
              ? null
              : current
        );
      },
      [saveAlertHistory]
    );

  const muteAlert =
    useCallback(
      (alertId) => {
        setAlerts((current) => {
          const next =
            current.map((alert) =>
              alert.id === alertId
                ? {
                    ...alert,
                    muted: true,
                  }
                : alert
            );

          saveAlertHistory(next);

          return next;
        });

        setCurrentAlert(
          (current) =>
            current?.id === alertId
              ? null
              : current
        );
      },
      [saveAlertHistory]
    );

  const clearAlerts =
    useCallback(() => {
      setAlerts([]);
      setCurrentAlert(null);
      cooldownsRef.current.clear();

      saveAlertHistory([]);
    }, [saveAlertHistory]);

  useEffect(() => {
    const handleBeforeUnload =
      () => {
        saveAlertHistory(alerts);
      };

    window.addEventListener(
      "beforeunload",
      handleBeforeUnload
    );

    return () => {
      window.removeEventListener(
        "beforeunload",
        handleBeforeUnload
      );
    };
  }, [
    alerts,
    saveAlertHistory,
  ]);

  return {
    alerts,

    currentAlert,

    alertCount:
      alerts.length,

    unresolvedCount:
      alerts.filter(
        (alert) =>
          !alert.resolved
      ).length,

    addAlert,
    dismissAlert,
    resolveAlert,
    muteAlert,
    clearAlerts,
  };
};

export default useAlerts;