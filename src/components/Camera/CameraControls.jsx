import React, { useMemo } from "react";
import {
  Camera,
  CameraOff,
  ChevronDown,
  Expand,
  Maximize2,
  Mic,
  MicOff,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Square,
  Volume2,
  VolumeX,
} from "lucide-react";

import "./CameraControls.css";

const CONTROL_STATES = {
  IDLE: "idle",
  STARTING: "starting",
  LIVE: "live",
  PAUSED: "paused",
  STOPPED: "stopped",
  ERROR: "error",
};

const getState = (value) =>
  String(value || CONTROL_STATES.IDLE).toLowerCase();

const ControlButton = ({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  active = false,
  danger = false,
  primary = false,
  title,
  className = "",
}) => {
  return (
    <button
      type="button"
      className={[
        "camera-control-button",
        active ? "is-active" : "",
        danger ? "is-danger" : "",
        primary ? "is-primary" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
      disabled={disabled}
      title={title || label}
      aria-label={title || label}
    >
      <span className="camera-control-icon">
        <Icon size={17} strokeWidth={2.2} />
      </span>

      <span className="camera-control-label">{label}</span>
    </button>
  );
};

const CameraControls = ({
  cameraState = CONTROL_STATES.IDLE,

  isMonitoring = false,
  isPaused = false,
  isStarting = false,

  isMuted = false,
  isFullscreen = false,

  cameras = [],
  selectedCameraId = "",

  showStart = true,
  showPause = true,
  showStop = true,
  showMute = true,
  showFullscreen = true,
  showSwitchCamera = true,

  disabled = false,

  onStart,
  onPause,
  onResume,
  onStop,

  onMuteToggle,
  onFullscreenToggle,

  onCameraChange,
  onSwitchCamera,

  startLabel = "Start Monitoring",
  pauseLabel = "Pause",
  resumeLabel = "Resume",
  stopLabel = "Stop",
  muteLabel = "Mute Alerts",
  unmuteLabel = "Unmute Alerts",

  className = "",
}) => {
  const normalizedState = getState(cameraState);

  const running =
    isMonitoring ||
    normalizedState === CONTROL_STATES.LIVE;

  const paused =
    isPaused ||
    normalizedState === CONTROL_STATES.PAUSED;

  const starting =
    isStarting ||
    normalizedState === CONTROL_STATES.STARTING;

  const hasMultipleCameras = cameras.length > 1;

  const currentCamera = useMemo(() => {
    if (!selectedCameraId) return null;

    return (
      cameras.find(
        (camera) => camera.deviceId === selectedCameraId
      ) || null
    );
  }, [cameras, selectedCameraId]);

  const handleStart = () => {
    if (disabled || starting) return;

    if (typeof onStart === "function") {
      onStart();
    }
  };

  const handlePause = () => {
    if (disabled || !running || paused) return;

    if (typeof onPause === "function") {
      onPause();
    }
  };

  const handleResume = () => {
    if (disabled || !paused) return;

    if (typeof onResume === "function") {
      onResume();
    }
  };

  const handleStop = () => {
    if (disabled || (!running && !paused)) return;

    if (typeof onStop === "function") {
      onStop();
    }
  };

  const handleMuteToggle = () => {
    if (disabled) return;

    if (typeof onMuteToggle === "function") {
      onMuteToggle(!isMuted);
    }
  };

  const handleFullscreen = () => {
    if (disabled) return;

    if (typeof onFullscreenToggle === "function") {
      onFullscreenToggle(!isFullscreen);
    }
  };

  const handleCameraChange = (event) => {
    const nextDeviceId = event.target.value;

    if (typeof onCameraChange === "function") {
      onCameraChange(nextDeviceId);
    }
  };

  const handleSwitchCamera = () => {
    if (disabled || !hasMultipleCameras) return;

    if (typeof onSwitchCamera === "function") {
      onSwitchCamera();
      return;
    }

    const currentIndex = cameras.findIndex(
      (camera) => camera.deviceId === selectedCameraId
    );

    const nextIndex =
      currentIndex >= 0
        ? (currentIndex + 1) % cameras.length
        : 0;

    const nextCamera = cameras[nextIndex];

    if (
      nextCamera &&
      typeof onCameraChange === "function"
    ) {
      onCameraChange(nextCamera.deviceId);
    }
  };

  const showMainAction = !running && !paused;

  return (
    <div
      className={[
        "camera-controls",
        `state-${normalizedState}`,
        running ? "controls-running" : "",
        paused ? "controls-paused" : "",
        disabled ? "controls-disabled" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="camera-controls-main">
        <div className="camera-controls-status">
          <span
            className={`camera-status-indicator ${
              running
                ? "status-live"
                : paused
                ? "status-paused"
                : starting
                ? "status-starting"
                : "status-idle"
            }`}
          />

          <div className="camera-controls-status-text">
            <strong>
              {starting
                ? "Preparing camera"
                : running
                ? "Monitoring active"
                : paused
                ? "Monitoring paused"
                : "Monitoring off"}
            </strong>

            <span>
              {starting
                ? "Please wait..."
                : running
                ? "AI analysis is running"
                : paused
                ? "Resume when you're ready"
                : "Start when you're ready to study"}
            </span>
          </div>
        </div>

        <div className="camera-controls-actions">
          {showStart && showMainAction && (
            <ControlButton
              icon={starting ? RefreshCw : Play}
              label={starting ? "Starting..." : startLabel}
              onClick={handleStart}
              disabled={disabled || starting}
              primary
              className={starting ? "is-loading" : ""}
            />
          )}

          {showPause && running && !paused && (
            <ControlButton
              icon={Pause}
              label={pauseLabel}
              onClick={handlePause}
              disabled={disabled}
            />
          )}

          {showPause && paused && (
            <ControlButton
              icon={Play}
              label={resumeLabel}
              onClick={handleResume}
              disabled={disabled}
              primary
            />
          )}

          {showStop && (running || paused) && (
            <ControlButton
              icon={Square}
              label={stopLabel}
              onClick={handleStop}
              disabled={disabled}
              danger
            />
          )}
        </div>
      </div>

      <div className="camera-controls-divider" />

      <div className="camera-controls-secondary">
        {showMute && (
          <ControlButton
            icon={isMuted ? VolumeX : Volume2}
            label={isMuted ? unmuteLabel : muteLabel}
            onClick={handleMuteToggle}
            disabled={disabled}
            active={isMuted}
          />
        )}

        {showSwitchCamera && hasMultipleCameras && (
          <div className="camera-selector-wrapper">
            <div className="camera-selector">
              <Camera size={16} />

              <select
                value={selectedCameraId}
                onChange={handleCameraChange}
                disabled={disabled}
                aria-label="Select camera"
              >
                {cameras.map((camera, index) => (
                  <option
                    key={camera.deviceId || `camera-${index}`}
                    value={camera.deviceId}
                  >
                    {camera.label || `Camera ${index + 1}`}
                  </option>
                ))}
              </select>

              <ChevronDown
                className="camera-selector-arrow"
                size={14}
              />
            </div>

            <button
              type="button"
              className="camera-switch-button"
              onClick={handleSwitchCamera}
              disabled={disabled}
              title="Switch camera"
              aria-label="Switch camera"
            >
              <RotateCcw size={15} />
            </button>
          </div>
        )}

        {showFullscreen && (
          <ControlButton
            icon={isFullscreen ? Expand : Maximize2}
            label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            onClick={handleFullscreen}
            disabled={disabled}
            active={isFullscreen}
          />
        )}
      </div>
    </div>
  );
};

export default CameraControls;