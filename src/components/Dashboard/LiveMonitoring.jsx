import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  Camera,
  CameraOff,
  CheckCircle2,
  CirclePause,
  Eye,
  EyeOff,
  Focus,
  Maximize2,
  MicOff,
  MonitorPause,
  Play,
  RotateCcw,
  ScanFace,
  Smartphone,
  Sparkles,
  UserRound,
  Users,
  Video,
  VideoOff,
  X,
} from "lucide-react";

import useCamera from "../../hooks/useCamera";
import useAI from "../../hooks/useAI";
import useMonitoring from "../../hooks/useMonitoring";

import {
  AI_MODES,
  MONITORING_STATUS,
} from "../../utils/constants";

import { roundScore } from "../../utils/scoreUtils";

import "./LiveMonitoring.css";

const STATUS_CONFIG = {
  face: {
    label: "Face Detection",
    icon: ScanFace,
  },
  eyes: {
    label: "Eyes",
    icon: Eye,
  },
  attention: {
    label: "Attention",
    icon: Focus,
  },
  phone: {
    label: "Phone",
    icon: Smartphone,
  },
  posture: {
    label: "Posture",
    icon: UserRound,
  },
  drowsiness: {
    label: "Drowsiness",
    icon: Activity,
  },
};

const getConfidence = (value) => {
  const confidence = Number(value);

  if (!Number.isFinite(confidence)) {
    return 0;
  }

  return Math.round(
    confidence <= 1 ? confidence * 100 : confidence
  );
};

const getStatusText = (detector, fallback = "Waiting") => {
  if (!detector) {
    return fallback;
  }

  if (
    detector.phoneDetected === true ||
    detector.status === "distracted"
  ) {
    return "Detected";
  }

  if (
    detector.status === "missing" ||
    detector.detected === false
  ) {
    return "Not detected";
  }

  if (detector.status) {
    return String(detector.status)
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  if (detector.detected === true) {
    return "Detected";
  }

  return fallback;
};

const getStatusTone = (detector, type) => {
  if (!detector) {
    return "neutral";
  }

  if (
    type === "phone" &&
    detector.phoneDetected === true
  ) {
    return "danger";
  }

  if (
    type === "drowsiness" &&
    detector.drowsy === true
  ) {
    return "warning";
  }

  if (
    detector.status === "distracted" ||
    detector.status === "warning" ||
    detector.status === "drowsy"
  ) {
    return "warning";
  }

  if (
    detector.detected === false ||
    detector.status === "missing"
  ) {
    return "danger";
  }

  if (
    detector.detected === true ||
    detector.status === "focused" ||
    detector.status === "good" ||
    detector.status === "normal"
  ) {
    return "success";
  }

  return "neutral";
};

const formatDuration = (seconds = 0) => {
  const safeSeconds = Math.max(
    0,
    Math.floor(Number(seconds) || 0)
  );

  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  if (hours > 0) {
    return [
      hours,
      String(minutes).padStart(2, "0"),
      String(remainingSeconds).padStart(2, "0"),
    ].join(":");
  }

  return [
    String(minutes).padStart(2, "0"),
    String(remainingSeconds).padStart(2, "0"),
  ].join(":");
};

const DetectorCard = ({
  type,
  detector,
  compact = false,
}) => {
  const config = STATUS_CONFIG[type];

  if (!config) {
    return null;
  }

  const Icon = config.icon;
  const confidence = getConfidence(
    detector?.confidence
  );

  const tone = getStatusTone(detector, type);
  const status = getStatusText(detector);

  return (
    <div
      className={`lm-detector lm-detector--${tone} ${
        compact ? "lm-detector--compact" : ""
      }`}
    >
      <div className="lm-detector__icon">
        <Icon size={compact ? 15 : 17} />
      </div>

      <div className="lm-detector__content">
        <span className="lm-detector__label">
          {config.label}
        </span>

        <strong className="lm-detector__status">
          {status}
        </strong>
      </div>

      <div className="lm-detector__confidence">
        {confidence > 0 ? `${confidence}%` : "--"}
      </div>
    </div>
  );
};

const MonitoringIndicator = ({
  active,
  paused,
}) => {
  if (paused) {
    return (
      <div className="lm-live-indicator lm-live-indicator--paused">
        <span className="lm-live-indicator__dot" />
        <span>Monitoring Paused</span>
      </div>
    );
  }

  if (active) {
    return (
      <div className="lm-live-indicator">
        <span className="lm-live-indicator__dot" />
        <span>LIVE MONITORING</span>
      </div>
    );
  }

  return (
    <div className="lm-live-indicator lm-live-indicator--off">
      <span className="lm-live-indicator__dot" />
      <span>MONITORING OFF</span>
    </div>
  );
};

const EmptyCameraState = ({
  cameraStatus,
  onStartCamera,
}) => {
  const denied =
    cameraStatus === "denied";

  const unavailable =
    cameraStatus === "unavailable";

  const title = unavailable
    ? "Camera unavailable"
    : denied
      ? "Camera permission required"
      : "Camera is ready";

  const description = unavailable
    ? "Your browser could not provide access to a compatible camera."
    : denied
      ? "Allow camera access from your browser settings to start AI monitoring."
      : "Start your camera to begin live study monitoring.";

  return (
    <div className="lm-camera-empty">
      <div className="lm-camera-empty__orb">
        <div className="lm-camera-empty__orb-ring" />
        <Camera size={30} />
      </div>

      <div className="lm-camera-empty__content">
        <span className="lm-camera-empty__eyebrow">
          AI CAMERA
        </span>

        <h3>{title}</h3>

        <p>{description}</p>

        {!unavailable && (
          <button
            type="button"
            className="lm-primary-button"
            onClick={onStartCamera}
          >
            <Video size={17} />
            Start Camera
          </button>
        )}
      </div>
    </div>
  );
};

const LiveMonitoring = () => {
  const videoRef = useRef(null);
  const cameraContainerRef = useRef(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showDetails, setShowDetails] = useState(true);
  const [localAlert, setLocalAlert] = useState(null);

  const camera = useCamera();
  const ai = useAI();
  const monitoring = useMonitoring();

  const {
    stream,
    status: cameraStatus,
    startCamera,
    stopCamera,
  } = camera;

  const {
    analysis,
    focusScore,
    isDemoMode,
    isLiveMode,
    setMode,
  } = ai;

  const {
    status: monitoringStatus,
    elapsedSeconds,
    isMuted,
    startMonitoring,
    pauseMonitoring,
    resumeMonitoring,
    stopMonitoring,
    toggleMute,
  } = monitoring;

  useEffect(() => {
    if (!videoRef.current || !stream) {
      return;
    }

    videoRef.current.srcObject = stream;

    const playVideo = async () => {
      try {
        await videoRef.current?.play();
      } catch {
        // Browser autoplay restrictions are handled silently.
      }
    };

    playVideo();
  }, [stream]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        document.fullscreenElement ===
          cameraContainerRef.current
      );
    };

    document.addEventListener(
      "fullscreenchange",
      handleFullscreenChange
    );

    return () => {
      document.removeEventListener(
        "fullscreenchange",
        handleFullscreenChange
      );
    };
  }, []);

  useEffect(() => {
    if (!localAlert) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setLocalAlert(null);
    }, 4500);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [localAlert]);

  const handleStartCamera = useCallback(async () => {
    try {
      await startCamera();
    } catch (error) {
      setLocalAlert({
        type: "error",
        title: "Camera could not start",
        message:
          error?.message ||
          "Please check your camera permission.",
      });
    }
  }, [startCamera]);

  const handleStartMonitoring = useCallback(async () => {
    try {
      if (!stream) {
        await startCamera();
      }

      await startMonitoring();
    } catch (error) {
      setLocalAlert({
        type: "error",
        title: "Monitoring could not start",
        message:
          error?.message ||
          "Please check your camera and monitoring settings.",
      });
    }
  }, [
    stream,
    startCamera,
    startMonitoring,
  ]);

  const handleStopMonitoring = useCallback(() => {
    stopMonitoring();
  }, [stopMonitoring]);

  const handleStopCamera = useCallback(() => {
    stopMonitoring();
    stopCamera();
  }, [
    stopMonitoring,
    stopCamera,
  ]);

  const handlePauseResume = useCallback(() => {
    if (
      monitoringStatus ===
      MONITORING_STATUS.PAUSED
    ) {
      resumeMonitoring();
      return;
    }

    pauseMonitoring();
  }, [
    monitoringStatus,
    pauseMonitoring,
    resumeMonitoring,
  ]);

  const handleFullscreen = useCallback(async () => {
    try {
      if (
        document.fullscreenElement ===
        cameraContainerRef.current
      ) {
        await document.exitFullscreen();
        return;
      }

      await cameraContainerRef.current?.requestFullscreen();
    } catch (error) {
      setLocalAlert({
        type: "error",
        title: "Fullscreen unavailable",
        message:
          "Your browser does not allow fullscreen mode here.",
      });
    }
  }, []);

  const handleModeChange = useCallback(
    (event) => {
      setMode(event.target.value);
    },
    [setMode]
  );

  const detectorData = useMemo(
    () => ({
      face: analysis?.face,
      eyes: analysis?.eyes,
      attention: analysis?.attention,
      phone: analysis?.phone || analysis?.objects,
      posture: analysis?.posture,
      drowsiness: analysis?.drowsiness,
    }),
    [analysis]
  );

  const score = roundScore(
    Number(focusScore) || 0
  );

  const scoreCircumference = 2 * Math.PI * 50;

  const scoreOffset =
    scoreCircumference -
    (score / 100) * scoreCircumference;

  const isMonitoringActive =
    monitoringStatus ===
    MONITORING_STATUS.ACTIVE;

  const isMonitoringPaused =
    monitoringStatus ===
    MONITORING_STATUS.PAUSED;

  const hasCamera =
    cameraStatus === "granted" && Boolean(stream);

  const faceDetected =
    analysis?.face?.detected === true;

  const phoneDetected =
    analysis?.phone?.phoneDetected === true ||
    analysis?.objects?.phoneDetected === true;

  const peopleCount =
    Number(
      analysis?.objects?.personCount
    ) || 0;

  return (
    <section
      className={`live-monitoring ${
        isFullscreen
          ? "live-monitoring--fullscreen"
          : ""
      }`}
    >
      <div className="lm-background-glow lm-background-glow--one" />
      <div className="lm-background-glow lm-background-glow--two" />

      <div className="lm-header">
        <div className="lm-heading">
          <div className="lm-heading__icon">
            <BrainCircuit size={22} />
          </div>

          <div>
            <div className="lm-heading__eyebrow">
              AI STUDY MONITOR
            </div>

            <h2>Live Monitoring</h2>

            <p>
              Stay focused while DAILY GOAL watches
              your study session in real time.
            </p>
          </div>
        </div>

        <div className="lm-header__actions">
          <div
            className={`lm-ai-mode ${
              isLiveMode
                ? "lm-ai-mode--live"
                : "lm-ai-mode--demo"
            }`}
          >
            <Sparkles size={14} />

            <span>
              {isLiveMode
                ? "AI Live Mode"
                : "AI Demo Mode"}
            </span>
          </div>

          <select
            className="lm-mode-select"
            value={
              isLiveMode
                ? AI_MODES.LIVE
                : AI_MODES.DEMO
            }
            onChange={handleModeChange}
            aria-label="AI monitoring mode"
          >
            <option value={AI_MODES.DEMO}>
              Demo Mode
            </option>

            <option value={AI_MODES.LIVE}>
              Live Mode
            </option>
          </select>
        </div>
      </div>

      <div className="lm-layout">
        <div className="lm-main-column">
          <div
            ref={cameraContainerRef}
            className={`lm-camera-card ${
              hasCamera
                ? "lm-camera-card--active"
                : ""
            }`}
          >
            <div className="lm-camera-topbar">
              <MonitoringIndicator
                active={isMonitoringActive}
                paused={isMonitoringPaused}
              />

              <div className="lm-camera-topbar__right">
                <div className="lm-camera-status">
                  <span
                    className={`lm-status-dot ${
                      hasCamera
                        ? "lm-status-dot--on"
                        : ""
                    }`}
                  />

                  {hasCamera
                    ? "Camera connected"
                    : "Camera offline"}
                </div>

                <button
                  type="button"
                  className="lm-icon-button"
                  onClick={handleFullscreen}
                  title={
                    isFullscreen
                      ? "Exit fullscreen"
                      : "Fullscreen"
                  }
                  aria-label={
                    isFullscreen
                      ? "Exit fullscreen"
                      : "Fullscreen"
                  }
                >
                  <Maximize2 size={17} />
                </button>
              </div>
            </div>

            <div className="lm-camera-stage">
              {hasCamera ? (
                <>
                  <video
                    ref={videoRef}
                    className="lm-camera-video"
                    autoPlay
                    muted
                    playsInline
                  />

                  <div className="lm-camera-vignette" />

                  <div className="lm-scan-grid" />

                  <div className="lm-scan-line" />

                  <div className="lm-corner lm-corner--tl" />
                  <div className="lm-corner lm-corner--tr" />
                  <div className="lm-corner lm-corner--bl" />
                  <div className="lm-corner lm-corner--br" />

                  <div className="lm-ai-ring">
                    <span />
                    <span />
                    <span />
                  </div>

                  <div className="lm-face-target">
                    <div className="lm-face-target__top" />
                    <div className="lm-face-target__bottom" />
                  </div>

                  <div className="lm-camera-badges">
                    <div className="lm-camera-badge lm-camera-badge--face">
                      <ScanFace size={14} />

                      <span>
                        {faceDetected
                          ? "Face detected"
                          : "Looking for face"}
                      </span>
                    </div>

                    <div className="lm-camera-badge">
                      <Activity size={14} />

                      <span>
                        {isDemoMode
                          ? "Simulation"
                          : "AI Analysis"}
                      </span>
                    </div>
                  </div>

                  <div className="lm-camera-bottom">
                    <div className="lm-camera-bottom__left">
                      <span className="lm-recording-pulse" />

                      <span>
                        {formatDuration(
                          elapsedSeconds
                        )}
                      </span>

                      <span className="lm-separator">
                        •
                      </span>

                      <span>
                        {peopleCount > 1
                          ? `${peopleCount} people`
                          : "1 person"}
                      </span>
                    </div>

                    <div className="lm-camera-bottom__right">
                      {phoneDetected && (
                        <div className="lm-warning-pill">
                          <Smartphone size={13} />
                          Phone detected
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <EmptyCameraState
                  cameraStatus={cameraStatus}
                  onStartCamera={
                    handleStartCamera
                  }
                />
              )}
            </div>

            <div className="lm-camera-controls">
              <div className="lm-controls-primary">
                {!isMonitoringActive &&
                  !isMonitoringPaused && (
                    <button
                      type="button"
                      className="lm-control-button lm-control-button--primary"
                      onClick={
                        handleStartMonitoring
                      }
                    >
                      <Play size={17} />
                      Start Monitoring
                    </button>
                  )}

                {isMonitoringActive && (
                  <button
                    type="button"
                    className="lm-control-button lm-control-button--warning"
                    onClick={
                      handlePauseResume
                    }
                  >
                    <CirclePause size={17} />
                    Pause
                  </button>
                )}

                {isMonitoringPaused && (
                  <button
                    type="button"
                    className="lm-control-button lm-control-button--primary"
                    onClick={
                      handlePauseResume
                    }
                  >
                    <Play size={17} />
                    Resume
                  </button>
                )}

                {(isMonitoringActive ||
                  isMonitoringPaused) && (
                  <button
                    type="button"
                    className="lm-control-button lm-control-button--danger"
                    onClick={
                      handleStopMonitoring
                    }
                  >
                    <MonitorPause size={17} />
                    Stop
                  </button>
                )}
              </div>

              <div className="lm-controls-secondary">
                <button
                  type="button"
                  className={`lm-control-icon ${
                    isMuted
                      ? "lm-control-icon--muted"
                      : ""
                  }`}
                  onClick={toggleMute}
                  title={
                    isMuted
                      ? "Unmute alerts"
                      : "Mute alerts"
                  }
                  aria-label={
                    isMuted
                      ? "Unmute alerts"
                      : "Mute alerts"
                  }
                >
                  {isMuted ? (
                    <MicOff size={17} />
                  ) : (
                    <Activity size={17} />
                  )}
                </button>

                <button
                  type="button"
                  className="lm-control-icon"
                  onClick={handleStartCamera}
                  title="Reconnect camera"
                  aria-label="Reconnect camera"
                >
                  <RotateCcw size={17} />
                </button>

                {hasCamera && (
                  <button
                    type="button"
                    className="lm-control-icon lm-control-icon--danger"
                    onClick={
                      handleStopCamera
                    }
                    title="Stop camera"
                    aria-label="Stop camera"
                  >
                    <CameraOff size={17} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="lm-monitoring-note">
            <div className="lm-monitoring-note__icon">
              <CheckCircle2 size={16} />
            </div>

            <div>
              <strong>
                Your privacy comes first
              </strong>

              <span>
                Camera analysis stays in your
                browser. DAILY GOAL does not
                upload your camera feed.
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowDetails(
                  (current) => !current
                )
              }
            >
              {showDetails
                ? "Hide details"
                : "View details"}
            </button>
          </div>

          {showDetails && (
            <div className="lm-detectors">
              <div className="lm-section-heading">
                <div>
                  <span className="lm-section-heading__eyebrow">
                    REAL-TIME SIGNALS
                  </span>

                  <h3>
                    AI Monitoring Status
                  </h3>
                </div>

                <span className="lm-section-heading__live">
                  <span />
                  Updating live
                </span>
              </div>

              <div className="lm-detector-grid">
                {Object.keys(
                  STATUS_CONFIG
                ).map((type) => (
                  <DetectorCard
                    key={type}
                    type={type}
                    detector={
                      detectorData[type]
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="lm-side-column">
          <div className="lm-score-card">
            <div className="lm-score-card__glow" />

            <div className="lm-score-header">
              <div>
                <span>
                  CURRENT FOCUS
                </span>

                <h3>Focus Score</h3>
              </div>

              <div className="lm-score-header__icon">
                <Focus size={18} />
              </div>
            </div>

            <div className="lm-score-ring">
              <svg
                viewBox="0 0 120 120"
                className="lm-score-ring__svg"
              >
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  className="lm-score-ring__track"
                />

                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  className="lm-score-ring__progress"
                  strokeDasharray={
                    scoreCircumference
                  }
                  strokeDashoffset={
                    scoreOffset
                  }
                />
              </svg>

              <div className="lm-score-ring__value">
                <strong>{score}</strong>
                <span>/ 100</span>
              </div>
            </div>

            <div className="lm-score-status">
              <span className="lm-score-status__pulse" />

              <strong>
                {score >= 90
                  ? "Excellent Focus"
                  : score >= 75
                    ? "Good Focus"
                    : score >= 60
                      ? "Needs Attention"
                      : "Low Focus"}
              </strong>
            </div>

            <div className="lm-score-message">
              {score >= 90
                ? "You're in a strong focus zone. Keep going!"
                : score >= 75
                  ? "Nice work. Stay with your current study flow."
                  : score >= 60
                    ? "A small reset could help you regain focus."
                    : "Consider taking a short break before continuing."}
            </div>
          </div>

          <div className="lm-quick-card">
            <div className="lm-quick-card__header">
              <div>
                <span>
                  SESSION
                </span>

                <h3>Live Overview</h3>
              </div>

              <Activity size={18} />
            </div>

            <div className="lm-quick-stats">
              <div className="lm-quick-stat">
                <span>Session Time</span>
                <strong>
                  {formatDuration(
                    elapsedSeconds
                  )}
                </strong>
              </div>

              <div className="lm-quick-stat">
                <span>Camera</span>

                <strong
                  className={
                    hasCamera
                      ? "is-success"
                      : "is-muted"
                  }
                >
                  {hasCamera
                    ? "Connected"
                    : "Offline"}
                </strong>
              </div>

              <div className="lm-quick-stat">
                <span>Face</span>

                <strong
                  className={
                    faceDetected
                      ? "is-success"
                      : "is-warning"
                  }
                >
                  {faceDetected
                    ? "Detected"
                    : "Searching"}
                </strong>
              </div>

              <div className="lm-quick-stat">
                <span>Phone</span>

                <strong
                  className={
                    phoneDetected
                      ? "is-danger"
                      : "is-success"
                  }
                >
                  {phoneDetected
                    ? "Detected"
                    : "Clear"}
                </strong>
              </div>
            </div>
          </div>

          <div className="lm-ai-card">
            <div className="lm-ai-card__orb">
              <BrainCircuit size={23} />
            </div>

            <div className="lm-ai-card__content">
              <div className="lm-ai-card__title">
                <strong>
                  {isLiveMode
                    ? "AI is monitoring"
                    : "AI Demo is active"}
                </strong>

                <span
                  className={
                    isLiveMode
                      ? "is-live"
                      : "is-demo"
                  }
                >
                  {isLiveMode
                    ? "LIVE"
                    : "DEMO"}
                </span>
              </div>

              <p>
                {isLiveMode
                  ? "Your camera signals are being analyzed locally in real time."
                  : "Demo signals are being generated locally for testing the monitoring experience."}
              </p>
            </div>
          </div>

          <div className="lm-alert-card">
            <div className="lm-alert-card__header">
              <div className="lm-alert-card__title">
                <AlertTriangle size={17} />
                <h3>Monitoring Alerts</h3>
              </div>

              <span>
                {isMuted
                  ? "Muted"
                  : "Sound On"}
              </span>
            </div>

            <div className="lm-alert-list">
              {phoneDetected ? (
                <div className="lm-alert-item lm-alert-item--danger">
                  <Smartphone size={16} />

                  <div>
                    <strong>
                      Phone detected
                    </strong>

                    <span>
                      Remove the phone to
                      maintain focus.
                    </span>
                  </div>
                </div>
              ) : faceDetected ? (
                <div className="lm-alert-item lm-alert-item--success">
                  <CheckCircle2 size={16} />

                  <div>
                    <strong>
                      Everything looks good
                    </strong>

                    <span>
                      No immediate distraction
                      detected.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="lm-alert-item lm-alert-item--warning">
                  <EyeOff size={16} />

                  <div>
                    <strong>
                      Camera attention needed
                    </strong>

                    <span>
                      Make sure your face is
                      visible.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {localAlert && (
        <div
          className={`lm-floating-alert lm-floating-alert--${localAlert.type}`}
        >
          <div className="lm-floating-alert__icon">
            {localAlert.type === "error" ? (
              <X size={18} />
            ) : (
              <AlertTriangle size={18} />
            )}
          </div>

          <div>
            <strong>
              {localAlert.title}
            </strong>

            <span>
              {localAlert.message}
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              setLocalAlert(null)
            }
            aria-label="Close alert"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </section>
  );
};

export default LiveMonitoring;