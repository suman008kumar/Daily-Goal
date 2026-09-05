import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

const MONITORING_STORAGE_KEY =
  "daily_goal_monitoring_preferences";


const broadcastMonitoringChange = (active) => {
  try {
    window.dispatchEvent(new CustomEvent("daily-goal-data-change", { detail: { source: "monitoring", at: Date.now() } }));
    window.dispatchEvent(new CustomEvent("daily-goal-monitoring-change", { detail: { active: Boolean(active) } }));
  } catch {}
};

const loadPreferences = () => {
  try {
    const saved = localStorage.getItem(
      MONITORING_STORAGE_KEY
    );

    return saved
      ? JSON.parse(saved)
      : {
          autoStart: false,
          autoPause: true,
          muted: false,
        };
  } catch {
    return {
      autoStart: false,
      autoPause: true,
      muted: false,
    };
  }
};

export const useMonitoring = ({
  camera = null,
  ai = null,
  onAlert = null,
} = {}) => {
  const preferences =
    loadPreferences();

  const [isMonitoring, setIsMonitoring] =
    useState(false);

  const [isPaused, setIsPaused] =
    useState(false);

  const [isMuted, setIsMuted] =
    useState(preferences.muted ?? false);

  const [monitoringTime, setMonitoringTime] =
    useState(0);

  const startTimeRef =
    useRef(null);

  const elapsedBeforePauseRef =
    useRef(0);

  const metricsRef = useRef({ focusedSeconds: 0, distractionSeconds: 0, phoneSeconds: 0 });
  const analysisRef = useRef(null);
  analysisRef.current = ai?.analysis || null;

  const savePreferences = useCallback(
    (updates) => {
      try {
        localStorage.setItem(
          MONITORING_STORAGE_KEY,
          JSON.stringify({
            ...preferences,
            muted: isMuted,
            ...updates,
          })
        );
      } catch {
        // Continue in memory.
      }
    },
    [preferences, isMuted]
  );

  const startMonitoring =
    useCallback(async () => {
      if (!camera) {
        return false;
      }

      let cameraReady =
        camera.isCameraOn;

      if (!cameraReady) {
        const stream =
          await camera.startCamera();

        cameraReady = Boolean(stream);
      }

      if (!cameraReady) {
        onAlert?.({
          type: "CAMERA",
          level: "WARNING",
          title: "Camera unavailable",
          description:
            "Enable your camera to start live monitoring.",
          timestamp: Date.now(),
        });

        return false;
      }

      ai?.setMode?.(
        ai.mode
      );

      startTimeRef.current =
        Date.now();

      metricsRef.current = { focusedSeconds: 0, distractionSeconds: 0, phoneSeconds: 0 };
      try { localStorage.setItem("daily_goal_active_monitoring_metrics", JSON.stringify(metricsRef.current)); } catch {}
      setIsMonitoring(true);
      setIsPaused(false);
      broadcastMonitoringChange(true);

      return true;
    }, [
      camera,
      ai,
      onAlert,
    ]);

  const pauseMonitoring =
    useCallback(() => {
      if (!isMonitoring) {
        return;
      }

      const now = Date.now();

      if (startTimeRef.current) {
        elapsedBeforePauseRef.current +=
          Math.floor(
            (now -
              startTimeRef.current) /
              1000
          );
      }

      startTimeRef.current = null;

      setIsPaused(true);
      setIsMonitoring(false);
      broadcastMonitoringChange(false);
    }, [isMonitoring]);

  const resumeMonitoring =
    useCallback(() => {
      if (!isPaused) {
        return;
      }

      startTimeRef.current =
        Date.now();

      setIsPaused(false);
      setIsMonitoring(true);
      broadcastMonitoringChange(true);
    }, [isPaused]);

  const stopMonitoring =
    useCallback(() => {
      if (startTimeRef.current) {
        elapsedBeforePauseRef.current +=
          Math.floor(
            (Date.now() -
              startTimeRef.current) /
              1000
          );
      }

      startTimeRef.current = null;

      setIsMonitoring(false);
      setIsPaused(false);

      camera?.stopCamera?.();

      ai?.reset?.();
      try { localStorage.removeItem("daily_goal_active_monitoring_metrics"); } catch {}
      broadcastMonitoringChange(false);
    }, [
      camera,
      ai,
    ]);

  const toggleMute =
    useCallback(() => {
      setIsMuted((current) => {
        const next = !current;

        savePreferences({
          muted: next,
        });

        return next;
      });
    }, [savePreferences]);

  useEffect(() => {
    if (
      !isMonitoring ||
      !startTimeRef.current
    ) {
      return undefined;
    }

    const interval = setInterval(() => {
      const currentElapsed =
        Math.floor(
          (Date.now() -
            startTimeRef.current) /
            1000
        );

      const totalElapsed = elapsedBeforePauseRef.current + currentElapsed;
      setMonitoringTime(totalElapsed);
      const a = analysisRef.current;
      if (a) {
        if (a.phone?.phoneDetected === true) {
          metricsRef.current.phoneSeconds += 1;
          metricsRef.current.distractionSeconds += 1;
        } else if (a.attention?.focused === true && a.drowsiness?.drowsy !== true) {
          metricsRef.current.focusedSeconds += 1;
        } else {
          metricsRef.current.distractionSeconds += 1;
        }
        try { localStorage.setItem("daily_goal_active_monitoring_metrics", JSON.stringify(metricsRef.current)); } catch {}
        try { window.dispatchEvent(new CustomEvent("daily-goal-data-change", { detail: { source: "monitoring-tick", at: Date.now() } })); } catch {}
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [isMonitoring]);

  useEffect(() => {
    if (
      !isMonitoring ||
      !ai?.analysis
    ) {
      return;
    }

    const analysis = ai.analysis;

    if (
      analysis.phone?.phoneDetected
    ) {
      onAlert?.({
        type: "PHONE",
        level: "WARNING",
        title: "Phone detected",
        description:
          "Try to keep your phone away during your study session.",
        timestamp: Date.now(),
      });
    }

    if (
      analysis.drowsiness?.drowsy
    ) {
      onAlert?.({
        type: "DROWSY",
        level: "CRITICAL",
        title: "You may be getting sleepy",
        description:
          "Take a short break and refresh your focus.",
        timestamp: Date.now(),
      });
    }

    if (
      analysis.attention?.status ===
      "looking_away"
    ) {
      onAlert?.({
        type: "LOOKING_AWAY",
        level: "WARNING",
        title: "Focus drifting",
        description:
          "Bring your attention back to your study.",
        timestamp: Date.now(),
      });
    }

    if (
      analysis.face?.detected === false
    ) {
      onAlert?.({
        type: "FACE_MISSING",
        level: "INFO",
        title: "Face not detected",
        description:
          "Make sure you are comfortably visible to the camera.",
        timestamp: Date.now(),
      });
    }

    if (
      analysis.objects?.multiplePeople
    ) {
      onAlert?.({
        type: "MULTIPLE_PERSON",
        level: "WARNING",
        title: "Multiple people detected",
        description:
          "Only one person should be visible during focused study.",
        timestamp: Date.now(),
      });
    }
  }, [
    ai?.analysis,
    isMonitoring,
    onAlert,
  ]);

  return {
    isMonitoring,
    isPaused,
    isMuted,

    monitoringTime,

    startMonitoring,
    pauseMonitoring,
    resumeMonitoring,
    stopMonitoring,

    toggleMute,
  };
};

export default useMonitoring;