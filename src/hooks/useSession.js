import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  getSessions,
  saveSessions,
} from "../services/storageService";

const SESSION_STATE_KEY =
  "daily_goal_active_session";

const DEFAULT_SESSION = {
  targetSeconds: 2 * 60 * 60,
  breakSeconds: 5 * 60,
  status: "IDLE",
  elapsedSeconds: 0,
  breakElapsedSeconds: 0,
  startedAt: null,
  pausedAt: null,
};

const loadActiveSession = () => {
  try {
    const saved =
      localStorage.getItem(
        SESSION_STATE_KEY
      );

    return saved
      ? JSON.parse(saved)
      : DEFAULT_SESSION;
  } catch {
    return DEFAULT_SESSION;
  }
};

const persistActiveSession = (
  session
) => {
  try {
    localStorage.setItem(
      SESSION_STATE_KEY,
      JSON.stringify(session)
    );
  } catch {
    // Memory-only fallback.
  }
};

export const useSession = ({
  onComplete = null,
  onTick = null,
} = {}) => {
  const [session, setSession] =
    useState(loadActiveSession);

  const intervalRef =
    useRef(null);

  const previousStatusRef =
    useRef(session.status);

  const updateSession =
    useCallback((updates) => {
      setSession((current) => {
        const next = {
          ...current,
          ...updates,
        };

        persistActiveSession(next);

        return next;
      });
    }, []);

  const startSession =
    useCallback(
      ({
        targetSeconds = DEFAULT_SESSION.targetSeconds,
        breakSeconds = DEFAULT_SESSION.breakSeconds,
      } = {}) => {
        const next = {
          ...DEFAULT_SESSION,

          targetSeconds,
          breakSeconds,

          status: "RUNNING",
          elapsedSeconds: 0,
          breakElapsedSeconds: 0,

          startedAt: Date.now(),
          pausedAt: null,
        };

        setSession(next);
        persistActiveSession(next);

        return next;
      },
      []
    );

  const pauseSession =
    useCallback(() => {
      setSession((current) => {
        if (
          current.status !== "RUNNING"
        ) {
          return current;
        }

        const next = {
          ...current,
          status: "PAUSED",
          pausedAt: Date.now(),
        };

        persistActiveSession(next);

        return next;
      });
    }, []);

  const resumeSession =
    useCallback(() => {
      setSession((current) => {
        if (
          current.status !== "PAUSED"
        ) {
          return current;
        }

        const next = {
          ...current,
          status: "RUNNING",
          pausedAt: null,
        };

        persistActiveSession(next);

        return next;
      });
    }, []);

  const cancelSession =
    useCallback(() => {
      const next = {
        ...session,
        status: "CANCELLED",
        endedAt: Date.now(),
      };

      setSession(next);

      try {
        localStorage.removeItem(
          SESSION_STATE_KEY
        );
      } catch {
        // Continue in memory.
      }
    }, [session]);

  const stopSession = useCallback(() => {
    setSession((current) => {
      if (!["RUNNING", "PAUSED"].includes(current.status)) return current;
      const endedAt = Date.now();
      const stopped = { ...current, status: "COMPLETED", endedAt };
      let liveMetrics = {};
      try { liveMetrics = JSON.parse(localStorage.getItem("daily_goal_active_monitoring_metrics") || "{}"); } catch {}
      try {
        const history = getSessions();
        const record = {
          id: `session_${endedAt}`,
          date: new Date().toISOString(),
          startedAt: current.startedAt,
          endedAt,
          duration: current.elapsedSeconds,
          durationSeconds: current.elapsedSeconds,
          focusScore: liveMetrics.focusedSeconds && current.elapsedSeconds ? Math.round((liveMetrics.focusedSeconds / current.elapsedSeconds) * 100) : 0,
          distractions: liveMetrics.distractionSeconds || 0,
          distractionSeconds: liveMetrics.distractionSeconds || 0,
          phoneUsage: liveMetrics.phoneSeconds || 0,
          phoneSeconds: liveMetrics.phoneSeconds || 0,
          status: "COMPLETED",
        };
        saveSessions([record, ...history]);
      } catch {}
      try { localStorage.removeItem(SESSION_STATE_KEY); localStorage.removeItem("daily_goal_active_monitoring_metrics"); } catch {}
      onComplete?.(stopped);
      return stopped;
    });
  }, [onComplete]);

  const completeSession =
    useCallback(() => {
      setSession((current) => {
        const completed = {
          ...current,
          status: "COMPLETED",
          elapsedSeconds:
            current.targetSeconds,
          endedAt: Date.now(),
        };

        try {
          const history =
            getSessions();

          const sessionRecord = {
            id: `session_${Date.now()}`,
            date: new Date().toISOString(),

            startedAt:
              current.startedAt,

            endedAt:
              completed.endedAt,

            duration:
              completed.targetSeconds,

            focusScore: 0,

            distractions: 0,

            phoneUsage: 0,

            status: "COMPLETED",
          };

          saveSessions([
            sessionRecord,
            ...history,
          ]);
        } catch {
          // Session can still complete in memory.
        }

        try {
          localStorage.removeItem(
            SESSION_STATE_KEY
          );
        } catch {
          // Continue.
        }

        return completed;
      });

      onComplete?.();
    }, [onComplete]);

  useEffect(() => {
    if (
      session.status !== "RUNNING"
    ) {
      return undefined;
    }

    intervalRef.current =
      setInterval(() => {
        setSession((current) => {
          if (
            current.status !==
            "RUNNING"
          ) {
            return current;
          }

          const nextElapsed =
            current.elapsedSeconds + 1;

          if (
            nextElapsed >=
            current.targetSeconds
          ) {
            const completed = {
              ...current,
              elapsedSeconds:
                current.targetSeconds,
              status: "COMPLETED",
              endedAt: Date.now(),
            };

            persistActiveSession(
              completed
            );

            onComplete?.();

            return completed;
          }

          const next = {
            ...current,
            elapsedSeconds:
              nextElapsed,
          };

          persistActiveSession(next);

          onTick?.(next);

          return next;
        });
      }, 1000);

    return () => {
      clearInterval(
        intervalRef.current
      );
    };
  }, [
    session.status,
    onComplete,
    onTick,
  ]);

  useEffect(() => {
    if (
      previousStatusRef.current !==
        "COMPLETED" &&
      session.status === "COMPLETED"
    ) {
      onComplete?.();
    }

    previousStatusRef.current =
      session.status;
  }, [
    session.status,
    onComplete,
  ]);

  const progress =
    session.targetSeconds > 0
      ? Math.min(
          100,
          Math.round(
            (session.elapsedSeconds /
              session.targetSeconds) *
              100
          )
        )
      : 0;

  const remainingSeconds =
    Math.max(
      0,
      session.targetSeconds -
        session.elapsedSeconds
    );

  return {
    session,

    status: session.status,

    isRunning:
      session.status === "RUNNING",

    isPaused:
      session.status === "PAUSED",

    isCompleted:
      session.status === "COMPLETED",

    progress,

    remainingSeconds,

    startSession,
    pauseSession,
    resumeSession,
    cancelSession,
    completeSession,
    stopSession,

    updateSession,
  };
};

export default useSession;