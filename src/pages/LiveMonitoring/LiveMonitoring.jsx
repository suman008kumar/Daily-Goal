import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Activity,
  Brain,
  Camera,
  CameraOff,
  ChevronLeft,
  Eye,
  EyeOff,
  Focus,
  Maximize2,
  Monitor,
  Phone,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserRound,
  UsersRound,
} from "lucide-react";

import CameraView from "../../components/Camera/CameraView";
import CameraControls from "../../components/Camera/CameraControls";
import CameraPermission from "../../components/Camera/CameraPermission";

import FocusScore from "../../components/Dashboard/FocusScore";
import Badge from "../../components/Common/Badge";
import Button from "../../components/Common/Button";
import PageTransition from "../../components/Common/PageTransition";
import ProgressRing from "../../components/Common/ProgressRing";
import AlertToast from "../../components/Alerts/AlertToast";

import useCamera from "../../hooks/useCamera";
import useAI from "../../hooks/useAI";
import useMonitoring from "../../hooks/useMonitoring";
import useAlerts from "../../hooks/useAlerts";
import useSession from "../../hooks/useSession";
import soundService from "../../services/soundService";
import notificationService from "../../services/notificationService";
import useCloudVisionAI from "../../hooks/useCloudVisionAI";
import { cloudAIConfig } from "../../services/cloudAIService";

import "./LiveMonitoring.css";

/* =========================================================
   HELPERS
   ========================================================= */

const clamp = (
  value,
  min = 0,
  max = 100
) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return min;
  }

  return Math.min(
    max,
    Math.max(min, number)
  );
};

const getConfidence = (result) => {
  const value =
    result?.confidence ??
    result?.score ??
    0;

  return clamp(
    Number(value) <= 1
      ? Number(value) * 100
      : Number(value)
  );
};

const getBoolean = (
  result,
  keys,
  fallback = false
) => {
  for (const key of keys) {
    if (
      result &&
      typeof result[key] === "boolean"
    ) {
      return result[key];
    }
  }

  return fallback;
};

const getStatusText = (
  result,
  fallback = "Unavailable"
) => {
  if (!result) return fallback;

  if (result.status) {
    return String(
      result.status
    );
  }

  return fallback;
};

const normalizeStatus = (
  value
) => {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
};

/* =========================================================
   STATUS ITEM
   ========================================================= */

const MonitoringStatus = ({
  icon,
  label,
  value,
  confidence,
  tone = "neutral",
  pulse = false,
}) => {
  return (
    <div
      className={[
        "dg-live-status",
        `dg-live-status--${tone}`,
      ].join(" ")}
    >
      <div className="dg-live-status__icon">
        {icon}

        {pulse && (
          <span className="dg-live-status__pulse" />
        )}
      </div>

      <div className="dg-live-status__content">
        <span className="dg-live-status__label">
          {label}
        </span>

        <strong className="dg-live-status__value">
          {value}
        </strong>

        {confidence > 0 && (
          <div className="dg-live-status__confidence">
            <span
              style={{
                "--confidence":
                  `${confidence}%`,
              }}
            />
          </div>
        )}
      </div>

      {confidence > 0 && (
        <span className="dg-live-status__percent">
          {Math.round(
            confidence
          )}
          %
        </span>
      )}
    </div>
  );
};

/* =========================================================
   PAGE
   ========================================================= */

const LiveMonitoring = () => {
  const fallbackVideoRef = useRef(null);
  const cameraContainerRef = useRef(null);
  const aiRef = useRef(null);

  const [isFullscreen, setIsFullscreen] =
    useState(false);

  const [selectedAlert, setSelectedAlert] =
    useState(null);

  const [showSidebar, setShowSidebar] =
    useState(true);

  /*
   * ---------------------------------------------------------
   * CAMERA
   * ---------------------------------------------------------
   */

  const camera = useCamera() || {};

  const {
    videoRef: cameraVideoRef,
    videoStream,
    stream,
    cameraState = "IDLE",
    permissionState = "NOT_ASKED",
    status: cameraStatus,
    cameras = [],
    selectedCameraId,
    startCamera,
    stopCamera,
    switchCamera,
    selectCamera,
  } = camera;

  const activeStream = videoStream || stream || null;
  const videoRef = cameraVideoRef || fallbackVideoRef;

  /*
   * ---------------------------------------------------------
   * AI
   * ---------------------------------------------------------
   */

  /*
   * ---------------------------------------------------------
   * ALERTS / SESSION
   * ---------------------------------------------------------
   */

  const alertsHook = useAlerts({ soundService, notificationService, muted: false }) || {};
  const { alerts = [], dismissAlert, addAlert } = alertsHook;

  const sessionHook = useSession();
  const { session: studySession = {}, isRunning: sessionRunning, isPaused: sessionPaused, elapsedSeconds: sessionElapsed = 0, startSession, pauseSession, resumeSession, stopSession } = sessionHook || {};

  /* Monitoring state is intentionally resolved before AI so local AI is
     completely stopped when the camera/session is inactive. */
  const monitoringStateHook = useMonitoring({ camera, aiRef, onAlert: addAlert }) || {};
  const { isMonitoring = false, isPaused = false, isMuted = false, startMonitoring: startMonitoringBase, pauseMonitoring, resumeMonitoring, stopMonitoring: stopMonitoringBase, toggleMute } = monitoringStateHook;

  const ai = useAI({
    videoRef,
    enabled: Boolean(isMonitoring && activeStream),
    initialMode: "LIVE",
  }) || {};
  aiRef.current = ai;

  /* Keep monitoring's AI reference synchronized without recreating its hook.
     The monitoring hook reads the current analysis through this bridge. */
  const monitoring = monitoringStateHook;
  const startMonitoring = startMonitoringBase;
  const stopMonitoring = stopMonitoringBase;

  const { analysis, focusScore, isAnalyzing, error: aiError, isDemoMode, isLiveMode, modelHealth = {} } = ai;

  const cloudVision = useCloudVisionAI({
    videoRef,
    enabled: Boolean(isMonitoring && activeStream),
    focusScore,
    attention: analysis?.attention?.status || "unknown",
  });



  useEffect(() => {
    if (!isMonitoring || !analysis) return;
    const timestamp = Date.now();
    if (analysis.phone?.phoneDetected) addAlert?.({ type: "PHONE", level: "WARNING", title: "Phone detected", description: "Try to keep your phone away during your study session.", timestamp });
    if (analysis.drowsiness?.drowsy) addAlert?.({ type: "DROWSY", level: "CRITICAL", title: "You may be getting sleepy", description: "Take a short break and refresh your focus.", timestamp });
    if (analysis.attention?.status === "looking_away") addAlert?.({ type: "LOOKING_AWAY", level: "WARNING", title: "Focus drifting", description: "Bring your attention back to your study.", timestamp });
    if (analysis.face?.detected === false) addAlert?.({ type: "FACE_MISSING", level: "INFO", title: "Face not detected", description: "Make sure you are comfortably visible to the camera.", timestamp });
    if (analysis.objects?.multiplePeople) addAlert?.({ type: "MULTIPLE_PERSON", level: "WARNING", title: "Multiple people detected", description: "Only one person should be visible during focused study.", timestamp });
  }, [analysis, isMonitoring, addAlert]);

  /*
   * ---------------------------------------------------------
   * VIDEO STREAM
   * ---------------------------------------------------------
   */

  useEffect(() => {
    const video = videoRef.current;

    if (!video) return;

    if (
      activeStream &&
      video.srcObject !==
        activeStream
    ) {
      video.srcObject =
        activeStream;

      const playVideo = async () => {
        try {
          await video.play();
        } catch (error) {
          console.warn(
            "Camera video autoplay was blocked:",
            error
          );
        }
      };

      playVideo();
    }

    if (!activeStream) {
      video.srcObject = null;
    }
  }, [activeStream]);

  /*
   * ---------------------------------------------------------
   * FULLSCREEN
   * ---------------------------------------------------------
   */

  const handleFullscreen =
    useCallback(async () => {
      const element =
        cameraContainerRef.current;

      if (!element) return;

      try {
        if (!document.fullscreenElement) {
          if (typeof element.requestFullscreen === "function") {
            await element.requestFullscreen();
          } else {
            setIsFullscreen(true);
          }
        } else if (typeof document.exitFullscreen === "function") {
          await document.exitFullscreen();
        } else {
          setIsFullscreen(false);
        }
      } catch (error) {
        console.warn(
          "Fullscreen is unavailable:",
          error
        );
      }
    }, []);

  useEffect(() => {
    const handleFullscreenChange =
      () => {
        setIsFullscreen(
          Boolean(
            document.fullscreenElement
          )
        );
      };

    document.addEventListener(
      "fullscreenchange",
      handleFullscreenChange
    );

    return () =>
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange
      );
  }, []);

  /*
   * ---------------------------------------------------------
   * CAMERA PERMISSION
   * ---------------------------------------------------------
   */

  const handleRequestPermission =
    useCallback(async () => {
      try {
        if (
          typeof startCamera ===
          "function"
        ) {
          await startCamera();
        }
      } catch (error) {
        console.warn(
          "Unable to start camera:",
          error
        );
      }
    }, [startCamera]);

  const handleRetryCamera =
    useCallback(async () => {
      try {
        if (
          typeof startCamera ===
          "function"
        ) {
          await startCamera();
        }
      } catch (error) {
        console.warn(
          "Unable to retry camera:",
          error
        );
      }
    }, [startCamera]);

  /*
   * ---------------------------------------------------------
   * MONITORING
   * ---------------------------------------------------------
   */

  const handleStartMonitoring =
    useCallback(async () => {
      try {
        await notificationService.requestPermission?.();
        let startedStream = activeStream;
        if (!startedStream && typeof startCamera === "function") {
          startedStream = await startCamera();
        }

        if (!startedStream) {
          addAlert?.({ type: "CAMERA", level: "WARNING", title: "Camera unavailable", description: camera?.error || "Enable camera access before starting monitoring.", timestamp: Date.now() });
          return;
        }

        if (!sessionRunning && !sessionPaused) {
          startSession?.();
        }

        if (
          typeof startMonitoring ===
          "function"
        ) {
          await startMonitoring();
        }
      } catch (error) {
        console.warn(
          "Unable to start monitoring:",
          error
        );
      }
    }, [
      activeStream,
      startCamera,
      startMonitoring,
    ]);

  const handlePause =
    useCallback(async () => {
      try {
        pauseSession?.();
        if (
          typeof pauseMonitoring ===
          "function"
        ) {
          await pauseMonitoring();
        }
      } catch (error) {
        console.warn(
          "Unable to pause monitoring:",
          error
        );
      }
    }, [pauseMonitoring]);

  const handleResume =
    useCallback(async () => {
      try {
        resumeSession?.();
        if (
          typeof resumeMonitoring ===
          "function"
        ) {
          await resumeMonitoring();
        }
      } catch (error) {
        console.warn(
          "Unable to resume monitoring:",
          error
        );
      }
    }, [resumeMonitoring]);

  const handleStop =
    useCallback(async () => {
      try {
        stopSession?.();
        if (
          typeof stopMonitoring ===
          "function"
        ) {
          await stopMonitoring();
        }

        if (
          typeof stopCamera ===
          "function"
        ) {
          await stopCamera();
        }
      } catch (error) {
        console.warn(
          "Unable to stop monitoring:",
          error
        );
      }
    }, [
      stopMonitoring,
      stopCamera,
    ]);

  /*
   * ---------------------------------------------------------
   * ALERTS
   * ---------------------------------------------------------
   */

  const latestAlert = useMemo(() => {
    if (!alerts.length) {
      return null;
    }

    return [...alerts]
      .sort(
        (a, b) =>
          new Date(
            b?.timestamp ||
              b?.createdAt ||
              0
          ) -
          new Date(
            a?.timestamp ||
              a?.createdAt ||
              0
          )
      )
      .find(
        (alert) =>
          alert &&
          !alert.dismissed
      );
  }, [alerts]);

  useEffect(() => {
    if (!latestAlert) return;

    setSelectedAlert(
      latestAlert
    );

    const timer =
      window.setTimeout(() => {
        setSelectedAlert(null);
      }, 5200);

    return () =>
      window.clearTimeout(timer);
  }, [
    latestAlert?.id,
  ]);

  /*
   * ---------------------------------------------------------
   * ANALYSIS
   * ---------------------------------------------------------
   */

  const face = analysis?.face || {};
  const eyes = analysis?.eyes || {};
  const objects =
    analysis?.objects || {};
  const posture =
    analysis?.posture || {};
  const attention =
    analysis?.attention || {};
  const drowsiness =
    analysis?.drowsiness || {};

  const hasAnalysis = Boolean(analysis && analysis.timestamp);

  const faceDetected = hasAnalysis ? getBoolean(face, ["detected", "faceDetected"], null) : null;
  const eyesOpen = hasAnalysis ? getBoolean(eyes, ["eyesOpen", "open"], null) : null;
  const phoneResult = analysis?.phone || {};
  const phoneDetected = hasAnalysis ? getBoolean(phoneResult, ["phoneDetected", "detected"], null) : null;
  const focused = hasAnalysis ? getBoolean(attention, ["focused", "isFocused"], null) : null;
  const drowsy = hasAnalysis ? getBoolean(drowsiness, ["drowsy", "isDrowsy"], null) : null;

  const postureGood =
    normalizeStatus(
      posture?.status
    ) === "good" ||
    normalizeStatus(
      posture?.status
    ) === "normal" ||
    getBoolean(
      posture,
      ["good", "isGood"],
      false
    );

  const personCount = hasAnalysis ? Number(objects?.personCount ?? objects?.peopleCount ?? face?.faceCount ?? (faceDetected ? 1 : 0)) || 0 : null;
  const analyzingLabel = isMonitoring && (ai?.isAnalyzing || !hasAnalysis) ? "Analyzing…" : "Not detected";
  const liveValue = (value, detectedLabel = "Detected", missingLabel = "Not detected") => {
    if (!hasAnalysis || value === null || typeof value === "undefined") return analyzingLabel;
    return value ? detectedLabel : missingLabel;
  };

  /*
   * ---------------------------------------------------------
   * STATUS CONFIG
   * ---------------------------------------------------------
   */

  const statusItems =
    useMemo(() => {
      return [
        {
          id: "face",
          label: "Face Detection",
          value: faceDetected === null ? analyzingLabel : faceDetected ? "Detected" : "Not Detected",
          confidence:
            getConfidence(face),
          tone: faceDetected === null ? "neutral" : faceDetected ? "success" : "danger",
          icon: (
            <UserRound
              size={17}
            />
          ),
          pulse:
            isMonitoring &&
            faceDetected,
        },

        {
          id: "eyes",
          label: "Eye State",
          value: eyesOpen === null ? analyzingLabel : eyesOpen ? "Eyes Open" : "Eyes Closed",
          confidence:
            getConfidence(eyes),
          tone: eyesOpen === null ? "neutral" : eyesOpen ? "success" : "warning",
          icon: eyesOpen ? (
            <Eye size={17} />
          ) : (
            <EyeOff size={17} />
          ),
          pulse:
            isMonitoring &&
            eyesOpen,
        },

        {
          id: "attention",
          label: "Attention",
          value: focused === null ? analyzingLabel : focused ? "Focused" : getStatusText(attention, "Looking Away"),
          confidence:
            getConfidence(
              attention
            ),
          tone: focused === null ? "neutral" : focused ? "success" : "warning",
          icon: (
            <Focus
              size={17}
            />
          ),
          pulse:
            isMonitoring &&
            focused,
        },

        {
          id: "posture",
          label: "Posture",
          value: !hasAnalysis ? analyzingLabel : postureGood ? "Good" : getStatusText(posture, "Needs Attention"),
          confidence:
            getConfidence(
              posture
            ),
          tone: !hasAnalysis ? "neutral" : postureGood ? "success" : "warning",
          icon: (
            <UserRound
              size={17}
            />
          ),
          pulse:
            isMonitoring &&
            postureGood,
        },

        {
          id: "phone",
          label: "Phone",
          value: phoneDetected === null ? analyzingLabel : phoneDetected ? "Detected" : "Not Detected",
          confidence:
            getConfidence(
              phoneResult
            ),
          tone: phoneDetected === null ? "neutral" : phoneDetected ? "danger" : "success",
          icon: (
            <Smartphone
              size={17}
            />
          ),
          pulse:
            isMonitoring &&
            phoneDetected,
        },

        {
          id: "drowsiness",
          label: "Drowsiness",
          value: drowsy === null ? analyzingLabel : drowsy ? "Drowsiness detected" : "Normal",
          confidence:
            getConfidence(
              drowsiness
            ),
          tone: drowsy === null ? "neutral" : drowsy ? "warning" : "success",
          icon: (
            <Brain
              size={17}
            />
          ),
          pulse:
            isMonitoring &&
            drowsy,
        },
      ];
    }, [
      face,
      eyes,
      attention,
      posture,
      objects,
      phoneResult,
      drowsiness,
      faceDetected,
      eyesOpen,
      focused,
      postureGood,
      phoneDetected,
      drowsy,
      isMonitoring,
    ]);

  /*
   * ---------------------------------------------------------
   * MONITORING STATE
   * ---------------------------------------------------------
   */

  const monitoringState =
    isPaused
      ? "paused"
      : isMonitoring
      ? "live"
      : "idle";

  const localModelsReady = [modelHealth.face, modelHealth.posture, modelHealth.objects].some((status) => status === "ready");
  const localModelsLoading = [modelHealth.face, modelHealth.posture, modelHealth.objects].some((status) => status === "loading");
  const localModelsErrored = [modelHealth.face, modelHealth.posture, modelHealth.objects].every((status) => status === "error");
  const aiBadge = isMonitoring
    ? (localModelsReady ? { label: "AI Live", variant: "live" } : { label: "AI Limited", variant: "pending" })
    : { label: "AI Ready", variant: "info" };
  const focusStatus = !isMonitoring ? "Standby" : isAnalyzing ? "Analyzing" : aiError ? "AI Limited" : focusScore >= 75 ? "Focused" : focusScore >= 60 ? "Needs Attention" : "Low Focus";

  /*
   * ---------------------------------------------------------
   * RENDER
   * ---------------------------------------------------------
   */

  return (
    <PageTransition
      variant="dashboard"
      className="dg-live-page"
    >
      <main className="dg-live-monitoring">
        {/* =================================================
            AMBIENT EFFECTS
            ================================================= */}

        <div
          className="dg-live-monitoring__ambient dg-live-monitoring__ambient--one"
          aria-hidden="true"
        />

        <div
          className="dg-live-monitoring__ambient dg-live-monitoring__ambient--two"
          aria-hidden="true"
        />

        {/* =================================================
            PAGE HEADER
            ================================================= */}

        <header className="dg-live-header">
          <div className="dg-live-header__left">
            <div className="dg-live-header__icon">
              <Monitor size={20} />
            </div>

            <div>
              <div className="dg-live-header__eyebrow">
                <Activity size={12} />
                Live Study Monitoring
              </div>

              <h1>
                Live Monitoring
              </h1>

              <p>
                Stay focused while DAILY GOAL
                watches your study environment.
              </p>
            </div>
          </div>

          <div className="dg-live-header__right">
            <Badge
              variant={aiBadge.variant}
              showIcon
              dot
              pulse={
                isMonitoring
              }
              glow={
                isMonitoring
              }
            >
              {aiBadge.label}
            </Badge>

            <Badge
              variant={
                isMonitoring
                  ? "active"
                  : isPaused
                  ? "pending"
                  : "inactive"
              }
              dot
              pulse={
                isMonitoring
              }
            >
              {isPaused
                ? "Paused"
                : isMonitoring
                ? "Monitoring Active"
                : "Monitoring Off"}
            </Badge>
          </div>
        </header>

        <section className="dg-live-session-strip" aria-live="polite">
          <div className="dg-live-session-strip__identity">
            <span className={`dg-live-session-dot ${sessionRunning ? "is-live" : sessionPaused ? "is-paused" : ""}`} />
            <div><span>Study Session</span><strong>{sessionRunning ? "Active" : sessionPaused ? "Paused" : "Ready"}</strong></div>
          </div>
          <div className="dg-live-session-strip__timer">{Math.floor(sessionElapsed / 3600).toString().padStart(2,"0")}:{Math.floor((sessionElapsed % 3600) / 60).toString().padStart(2,"0")}:{(sessionElapsed % 60).toString().padStart(2,"0")}</div>
          <div className="dg-live-session-strip__meta"><span>Monitoring</span><strong>{isMonitoring ? "Active" : isPaused ? "Paused" : "Inactive"}</strong></div>
        </section>

        {/* =================================================
            MAIN CONTENT
            ================================================= */}

        <div
          className={[
            "dg-live-layout",
            showSidebar
              ? ""
              : "dg-live-layout--sidebar-hidden",
          ].join(" ")}
        >
          {/* =================================================
              CAMERA AREA
              ================================================= */}

          <section className="dg-live-camera-section">
            <div
              ref={cameraContainerRef}
              className={[
                "dg-live-camera-card",
                `dg-live-camera-card--${monitoringState}`,
                isFullscreen
                  ? "dg-live-camera-card--fullscreen"
                  : "",
              ].join(" ")}
            >
              <div className="dg-live-camera-card__header">
                <div className="dg-live-camera-card__title">
                  <div className="dg-live-camera-card__camera-icon">
                    <Camera size={17} />
                  </div>

                  <div>
                    <strong>
                      Camera Monitoring
                    </strong>

                    <span>
                      {isMonitoring
                        ? "AI analysis running"
                        : "Camera ready"}
                    </span>
                  </div>
                </div>

                <div className="dg-live-camera-card__header-actions">
                  <Badge
                    variant={
                      isMonitoring
                        ? "live"
                        : "inactive"
                    }
                    dot
                    pulse={
                      isMonitoring
                    }
                    size="sm"
                  >
                    {isMonitoring
                      ? "LIVE"
                      : "STANDBY"}
                  </Badge>

                  <button
                    type="button"
                    className="dg-live-icon-button"
                    onClick={
                      handleFullscreen
                    }
                    title={
                      isFullscreen
                        ? "Exit fullscreen"
                        : "Enter fullscreen"
                    }
                    aria-label={
                      isFullscreen
                        ? "Exit fullscreen"
                        : "Enter fullscreen"
                    }
                  >
                    <Maximize2
                      size={16}
                    />
                  </button>
                </div>
              </div>

              <div
                className={[
                  "dg-live-camera-card__body",
                  activeStream
                    ? "dg-live-camera-card__body--preview"
                    : "dg-live-camera-card__body--permission",
                ].join(" ")}
              >
                {permissionState !==
                  "GRANTED" &&
                !activeStream ? (
                  <CameraPermission
                    permissionState={
                      permissionState
                    }
                    cameraState={
                      isPaused ? "PAUSED" : cameraState
                    }
                    status={
                      cameraStatus
                    }
                    onRequestPermission={
                      handleRequestPermission
                    }
                    onRetry={
                      handleRetryCamera
                    }
                    compact={
                      false
                    }
                    showFeatures
                    showPrivacyNote={false}
                  />
                ) : (
                  <CameraView
                    videoRef={
                      videoRef
                    }
                    stream={
                      activeStream
                    }
                    cameraState={
                      isPaused ? "PAUSED" : cameraState
                    }
                    analysis={
                      analysis
                    }
                    aiStatus={
                      aiBadge
                    }
                    isDemo={
                      isDemoMode
                    }
                    isLive={
                      isLiveMode
                    }
                    cloudAI={cloudVision}
                    showHeader={false}
                    showOverlay
                    showStatuses
                    mirrored
                    fullscreen={
                      isFullscreen
                    }
                  />
                )}
              </div>

              <div className="dg-live-camera-card__controls">
                <CameraControls
                  cameraState={
                    cameraState
                  }
                  isMonitoring={
                    isMonitoring
                  }
                  isPaused={
                    isPaused
                  }
                  isMuted={
                    isMuted
                  }
                  isFullscreen={
                    isFullscreen
                  }
                  cameras={
                    cameras
                  }
                  selectedCameraId={
                    selectedCameraId
                  }
                  showStart={
                    !isMonitoring
                  }
                  showPause={
                    isMonitoring &&
                    !isPaused
                  }
                  showStop={
                    Boolean(
                      isMonitoring ||
                        activeStream
                    )
                  }
                  showMute
                  showFullscreen
                  showSwitchCamera={
                    cameras.length > 1
                  }
                  onStart={
                    handleStartMonitoring
                  }
                  onPause={
                    handlePause
                  }
                  onResume={
                    handleResume
                  }
                  onStop={
                    handleStop
                  }
                  onMuteToggle={
                    toggleMute
                  }
                  onFullscreenToggle={
                    handleFullscreen
                  }
                  onCameraChange={
                    selectCamera
                  }
                  onSwitchCamera={
                    switchCamera
                  }
                />
              </div>
            </div>
          </section>

          {/* =================================================
              SIDE PANEL
              ================================================= */}

          <aside
            className={[
              "dg-live-side-panel",
              showSidebar
                ? ""
                : "dg-live-side-panel--hidden",
            ].join(" ")}
          >
            <button
              type="button"
              className="dg-live-sidebar-toggle"
              onClick={() =>
                setShowSidebar(
                  (value) => !value
                )
              }
              aria-label="Toggle monitoring details"
              title="Toggle monitoring details"
            >
              <ChevronLeft
                size={16}
              />
            </button>

            {/* FOCUS SCORE */}

            <div className="dg-live-focus-card">
              <div className="dg-live-focus-card__header">
                <div>
                  <span>
                    Current Focus
                  </span>

                  <strong>
                    AI Focus Score
                  </strong>
                </div>

                <Brain
                  size={17}
                />
              </div>

              <div className="dg-live-focus-card__ring">
                <ProgressRing
                  value={
                    clamp(
                      focusScore
                    )
                  }
                  max={100}
                  size="lg"
                  variant={
                    focusScore >= 75
                      ? "success"
                      : focusScore >= 60
                      ? "warning"
                      : "danger"
                  }
                  showPercentage
                  showValue
                  glow
                  centerContent={
                    <div className="dg-live-focus-center">
                      <strong>
                        {Math.round(
                          clamp(
                            focusScore
                          )
                        )}
                      </strong>
                      <span>
                        Focus
                      </span>
                    </div>
                  }
                />
              </div>

              <Badge
                variant="auto"
                status={
                  focusStatus ||
                  "Monitoring"
                }
                dot
              >
                {focusStatus ||
                  "Monitoring"}
              </Badge>
            </div>

            <div className="dg-live-engine-card">
              <div className="dg-live-panel-heading">
                <div><span>AI Engine</span><strong>Provider Status</strong></div>
                <Sparkles size={16} />
              </div>
              <div className="dg-live-engine-list">
                <div><span>Local AI</span><strong className={localModelsReady ? "is-online" : localModelsLoading ? "is-loading" : "is-error"}>● {localModelsReady ? "Ready" : localModelsLoading ? "Loading…" : localModelsErrored ? "Error" : "Limited"}</strong></div>
                <div><span>Gemini Vision</span><strong className={cloudAIConfig.hasGemini ? (cloudVision.provider === "Groq Vision" ? "is-error" : "is-online") : "is-error"}>● {cloudAIConfig.hasGemini ? (cloudVision.provider === "Groq Vision" ? "Error" : cloudVision.provider === "Gemini Vision" ? "Online" : "Connected") : "Not configured"}</strong></div>
                <div><span>Groq Vision</span><strong className={cloudAIConfig.hasGroq ? "is-online" : "is-error"}>● {cloudAIConfig.hasGroq ? (cloudVision.provider === "Groq Vision" ? "Fallback" : "Connected") : "Not configured"}</strong></div>
              </div>
              {cloudVision.error && <p className="dg-live-engine-error">{cloudVision.error}</p>}
            </div>

            {/* STATUS LIST */}

            <div className="dg-live-status-panel">
              <div className="dg-live-panel-heading">
                <div>
                  <span>
                    AI Detection
                  </span>

                  <strong>
                    Monitoring Status
                  </strong>
                </div>

                <Sparkles
                  size={16}
                />
              </div>

              <div className="dg-live-status-list">
                {statusItems.map(
                  (item) => (
                    <MonitoringStatus
                      key={item.id}
                      {...item}
                    />
                  )
                )}
              </div>
            </div>

            {/* PRIVACY */}

            <div className="dg-live-privacy-card">
              <div className="dg-live-privacy-icon">
                <ShieldCheck
                  size={17}
                />
              </div>

              <div>
                <strong>
                  Privacy First
                </strong>

                <p>
                  Camera analysis runs in your
                  browser. Monitoring data is
                  handled locally.
                </p>
              </div>
            </div>
          </aside>
        </div>

        {/* =================================================
            BOTTOM STATUS
            ================================================= */}

        <section className="dg-live-bottom-grid">
          <div className="dg-live-info-card">
            <div className="dg-live-info-icon">
              <Camera size={17} />
            </div>

            <div>
              <span>
                Camera
              </span>

              <strong>
                {activeStream
                  ? "Connected"
                  : "Not Connected"}
              </strong>
            </div>

            <Badge
              variant={
                activeStream
                  ? "success"
                  : "inactive"
              }
              dot
              size="sm"
            >
              {activeStream
                ? "Ready"
                : "Offline"}
            </Badge>
          </div>

          <div className="dg-live-info-card">
            <div className="dg-live-info-icon">
              <UsersRound size={17} />
            </div>

            <div>
              <span>
                People Detected
              </span>

              <strong>
                {personCount === null ? "Analyzing…" : personCount}
              </strong>
            </div>

            <Badge
              variant={
                personCount === null
                  ? "inactive"
                  : personCount <= 1
                  ? "success"
                  : "warning"
              }
              dot
              size="sm"
            >
              {personCount === null
                ? "Analyzing"
                : personCount <= 1
                ? "Good"
                : "Check"}
            </Badge>
          </div>

          <div className="dg-live-info-card">
            <div className="dg-live-info-icon">
              <Smartphone
                size={17}
              />
            </div>

            <div>
              <span>
                Phone Detection
              </span>

              <strong>
                {phoneDetected
                  ? "Detected"
                  : "Clear"}
              </strong>
            </div>

            <Badge
              variant={
                phoneDetected
                  ? "danger"
                  : "success"
              }
              dot
              size="sm"
            >
              {phoneDetected
                ? "Attention"
                : "Clear"}
            </Badge>
          </div>

          <div className="dg-live-info-card">
            <div className="dg-live-info-icon">
              <Activity size={17} />
            </div>

            <div>
              <span>
                Monitoring
              </span>

              <strong>
                {isPaused
                  ? "Paused"
                  : isMonitoring
                  ? "Active"
                  : "Idle"}
              </strong>
            </div>

            <Badge
              variant={
                isMonitoring
                  ? "active"
                  : isPaused
                  ? "pending"
                  : "inactive"
              }
              dot
              size="sm"
            >
              {isPaused
                ? "Paused"
                : isMonitoring
                ? "Live"
                : "Idle"}
            </Badge>
          </div>
        </section>

        {/* =================================================
            DEMO MODE NOTICE
            ================================================= */}

        {isDemoMode && (
          <div className="dg-live-demo-notice">
            <Sparkles size={15} />

            <div>
              <strong>
                AI Demo Mode
              </strong>

              <span>
                Detection states shown here are
                simulated because a live AI model
                is not currently active. No simulated
                result is presented as real detection.
              </span>
            </div>
          </div>
        )}

        {/* =================================================
            ALERT TOAST
            ================================================= */}

        {selectedAlert && (
          <AlertToast
            alert={
              selectedAlert
            }
            visible={
              Boolean(
                selectedAlert
              )
            }
            onDismiss={() => {
              setSelectedAlert(
                null
              );

              if (
                typeof dismissAlert ===
                "function"
              ) {
                dismissAlert(
                  selectedAlert.id
                );
              }
            }}
            showClose
            showConfidence
            showTimestamp
            pauseOnHover
          />
        )}
      </main>
    </PageTransition>
  );
};

export default LiveMonitoring;