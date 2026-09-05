import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  Camera,
  CameraOff,
  CheckCircle2,
  Expand,
  Maximize2,
  Minimize2,
  RefreshCw,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";

import FaceDetectionOverlay from "./FaceDetectionOverlay";
import "./CameraView.css";

const CAMERA_STATES = {
  IDLE: "idle",
  REQUESTING: "requesting",
  LIVE: "live",
  PAUSED: "paused",
  DENIED: "denied",
  ERROR: "error",
  UNAVAILABLE: "unavailable",
};

const STATUS_CONFIG = {
  face: {
    label: "Face",
    fallback: "Not detected",
  },
  eyes: {
    label: "Eyes",
    fallback: "Unavailable",
  },
  attention: {
    label: "Attention",
    fallback: "Unavailable",
  },
  posture: {
    label: "Posture",
    fallback: "Unavailable",
  },
  phone: {
    label: "Phone",
    fallback: "Unavailable",
  },
  drowsiness: {
    label: "Drowsiness",
    fallback: "Unavailable",
  },
};

const normalizeConfidence = (value) => {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) return null;

  if (numeric <= 1) {
    return Math.round(numeric * 100);
  }

  return Math.min(100, Math.max(0, Math.round(numeric)));
};

const getStatusText = (key, value, active = false) => {
  const config = STATUS_CONFIG[key];

  if (!config) return active ? "Analyzing…" : "Not detected";

  if (typeof value === "string") return value;

  if (value === true) return "Detected";

  if (value === false) return "Not detected";

  if (value && typeof value === "object") {
    return (
      value.status ||
      value.label ||
      value.state ||
      value.message ||
      config.fallback
    );
  }

  return active ? "Analyzing…" : config.fallback;
};

const getConfidence = (value) => {
  if (!value || typeof value !== "object") return null;

  return normalizeConfidence(
    value.confidence ??
      value.score ??
      value.probability ??
      value.certainty
  );
};

const getStatusTone = (key, value) => {
  if (!value) return "neutral";

  if (typeof value === "object") {
    const status = String(
      value.status || value.state || value.label || ""
    ).toLowerCase();

    if (
      status.includes("good") ||
      status.includes("focused") ||
      status.includes("normal") ||
      status.includes("open") ||
      status.includes("not detected") ||
      status.includes("clear")
    ) {
      return "success";
    }

    if (
      status.includes("warning") ||
      status.includes("away") ||
      status.includes("closed") ||
      status.includes("drowsy")
    ) {
      return "warning";
    }

    if (
      status.includes("danger") ||
      status.includes("critical") ||
      status.includes("detected")
    ) {
      return key === "phone" ? "danger" : "warning";
    }
  }

  if (key === "phone") {
    return value ? "danger" : "success";
  }

  if (key === "face") {
    return value ? "success" : "warning";
  }

  return "neutral";
};

const OverlayStatus = ({ icon, label, value, tone }) => {
  const Icon = icon;

  return (
    <div className={`camera-overlay-status tone-${tone}`}>
      <span className="camera-overlay-status-icon">
        <Icon size={13} strokeWidth={2.3} />
      </span>

      <span className="camera-overlay-status-text">
        <span className="camera-overlay-label">{label}</span>
        <strong>{value}</strong>
      </span>
    </div>
  );
};

const CameraView = forwardRef(
  (
    {
      stream: externalStream = null,
      videoRef: externalVideoRef = null,

      cameraState: externalCameraState = null,

      analysis = null,
      aiStatus = null,

      showOverlay = true,
      showStatuses = true,
      showLiveBadge = true,
      showControls = true,
      showFullscreen = true,
      showCameraIcon = true,
      showHeader = true,

      mirrored = true,
      muted = true,
      autoPlay = true,
      playsInline = true,

      title = "Live Camera",
      subtitle = "Camera monitoring preview",

      emptyTitle = "Camera is not active",
      emptyDescription = "Start monitoring to begin the camera preview.",

      onStart,
      onStop,
      onRetry,
      onFullscreenChange,

      className = "",
    },
    ref
  ) => {
    const internalVideoRef = useRef(null);
    const containerRef = useRef(null);

    const videoElement = externalVideoRef || internalVideoRef;

    const [internalStream, setInternalStream] = useState(null);
    const [internalState, setInternalState] = useState(CAMERA_STATES.IDLE);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [cameraError, setCameraError] = useState("");

    const stream = externalStream || internalStream;
    const cameraState = externalCameraState || internalState;

    const isLive =
      cameraState === CAMERA_STATES.LIVE ||
      Boolean(stream && stream.active);

    const isPaused = cameraState === CAMERA_STATES.PAUSED;

    const getCameraStream = useCallback(async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setInternalState(CAMERA_STATES.UNAVAILABLE);
        setCameraError(
          "Your browser does not support camera access."
        );
        return null;
      }

      try {
        setInternalState(CAMERA_STATES.REQUESTING);
        setCameraError("");

        const nextStream =
          await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: "user",
              width: {
                ideal: 1280,
              },
              height: {
                ideal: 720,
              },
            },
            audio: false,
          });

        setInternalStream(nextStream);
        setInternalState(CAMERA_STATES.LIVE);

        return nextStream;
      } catch (error) {
        console.error("Camera access error:", error);

        const errorName = error?.name;

        if (
          errorName === "NotAllowedError" ||
          errorName === "PermissionDeniedError"
        ) {
          setInternalState(CAMERA_STATES.DENIED);
          setCameraError(
            "Camera permission was denied. Allow camera access and try again."
          );
        } else if (
          errorName === "NotFoundError" ||
          errorName === "DevicesNotFoundError"
        ) {
          setInternalState(CAMERA_STATES.UNAVAILABLE);
          setCameraError("No camera device was found.");
        } else {
          setInternalState(CAMERA_STATES.ERROR);
          setCameraError(
            error?.message ||
              "Unable to start the camera. Please try again."
          );
        }

        return null;
      }
    }, []);

    const startCamera = useCallback(async () => {
      if (typeof onStart === "function") {
        const result = await onStart();

        if (result?.getTracks) {
          setInternalStream(result);
          setInternalState(CAMERA_STATES.LIVE);
        }

        return result;
      }

      return getCameraStream();
    }, [getCameraStream, onStart]);

    const stopCamera = useCallback(() => {
      if (typeof onStop === "function") {
        onStop();
      }

      if (internalStream) {
        internalStream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {
            // Ignore cleanup errors.
          }
        });

        setInternalStream(null);
      }

      setInternalState(CAMERA_STATES.IDLE);
    }, [internalStream, onStop]);

    const retryCamera = useCallback(() => {
      if (typeof onRetry === "function") {
        onRetry();
        return;
      }

      startCamera();
    }, [onRetry, startCamera]);

    const toggleFullscreen = useCallback(async () => {
      const element = containerRef.current;

      if (!element) return;

      try {
        if (!document.fullscreenElement) {
          await element.requestFullscreen?.();
        } else {
          await document.exitFullscreen?.();
        }
      } catch (error) {
        console.warn("Fullscreen unavailable:", error);
      }
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        video: videoElement.current,
        container: containerRef.current,
        stream,
        cameraState,
        start: startCamera,
        stop: stopCamera,
        retry: retryCamera,
        fullscreen: toggleFullscreen,
      }),
      [
        cameraState,
        retryCamera,
        startCamera,
        stopCamera,
        stream,
        toggleFullscreen,
        videoElement,
      ]
    );

    useEffect(() => {
      const video = videoElement.current;

      if (!video) return;

      if (video.srcObject !== stream) {
        video.srcObject = stream || null;
      }

      if (!stream) return;

      const playVideo = async () => {
        try {
          await video.play();
        } catch (error) {
          console.warn("Camera video playback was blocked:", error);
        }
      };

      if (video.readyState >= 2) {
        playVideo();
      } else {
        video.addEventListener("loadedmetadata", playVideo, {
          once: true,
        });
      }

      return () => {
        video.removeEventListener("loadedmetadata", playVideo);
      };
    }, [stream, videoElement]);

    useEffect(() => {
      const handleFullscreenChange = () => {
        const active = Boolean(document.fullscreenElement);

        setIsFullscreen(active);

        if (typeof onFullscreenChange === "function") {
          onFullscreenChange(active);
        }
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
    }, [onFullscreenChange]);

    useEffect(() => {
      return () => {
        if (internalStream) {
          internalStream.getTracks().forEach((track) => {
            try {
              track.stop();
            } catch {
              // Ignore cleanup errors.
            }
          });
        }
      };
    }, [internalStream]);

    const faceValue = analysis?.face ?? analysis?.faceStatus;
    const eyesValue = analysis?.eyes ?? analysis?.eyeStatus;
    const attentionValue =
      analysis?.attention ?? analysis?.attentionStatus;
    const postureValue = analysis?.posture ?? analysis?.postureStatus;
    const phoneValue = analysis?.phone ?? analysis?.phoneStatus;
    const drowsinessValue =
      analysis?.drowsiness ?? analysis?.drowsinessStatus;

    const statuses = [
      {
        key: "face",
        icon: UserRound,
        value: getStatusText("face", faceValue, isLive),
        tone: getStatusTone("face", faceValue),
        confidence: getConfidence(faceValue),
      },
      {
        key: "eyes",
        icon: EyeIcon,
        value: getStatusText("eyes", eyesValue, isLive),
        tone: getStatusTone("eyes", eyesValue),
        confidence: getConfidence(eyesValue),
      },
      {
        key: "attention",
        icon: TargetIcon,
        value: getStatusText("attention", attentionValue, isLive),
        tone: getStatusTone("attention", attentionValue),
        confidence: getConfidence(attentionValue),
      },
      {
        key: "posture",
        icon: PostureIcon,
        value: getStatusText("posture", postureValue, isLive),
        tone: getStatusTone("posture", postureValue),
        confidence: getConfidence(postureValue),
      },
      {
        key: "phone",
        icon: PhoneIcon,
        value: getStatusText("phone", phoneValue, isLive),
        tone: getStatusTone("phone", phoneValue),
        confidence: getConfidence(phoneValue),
      },
      {
        key: "drowsiness",
        icon: MoonIcon,
        value: getStatusText("drowsiness", drowsinessValue, isLive),
        tone: getStatusTone("drowsiness", drowsinessValue),
        confidence: getConfidence(drowsinessValue),
      },
    ];

    const renderContent = () => {
      if (cameraState === CAMERA_STATES.REQUESTING) {
        return (
          <div className="camera-state-content">
            <div className="camera-loader">
              <span />
              <span />
              <span />
            </div>

            <h3>Starting camera…</h3>
            <p>Requesting permission and preparing your camera.</p>
          </div>
        );
      }

      if (cameraState === CAMERA_STATES.DENIED) {
        return (
          <div className="camera-state-content">
            <div className="camera-state-icon danger">
              <ShieldCheck size={28} />
            </div>

            <h3>Camera permission required</h3>
            <p>{cameraError}</p>

            <button
              type="button"
              className="camera-state-button"
              onClick={retryCamera}
            >
              <RefreshCw size={16} />
              Try Again
            </button>
          </div>
        );
      }

      if (cameraState === CAMERA_STATES.UNAVAILABLE) {
        return (
          <div className="camera-state-content">
            <div className="camera-state-icon warning">
              <CameraOff size={28} />
            </div>

            <h3>Camera unavailable</h3>
            <p>{cameraError || emptyDescription}</p>

            <button
              type="button"
              className="camera-state-button"
              onClick={retryCamera}
            >
              <RefreshCw size={16} />
              Check Again
            </button>
          </div>
        );
      }

      if (cameraState === CAMERA_STATES.ERROR) {
        return (
          <div className="camera-state-content">
            <div className="camera-state-icon danger">
              <AlertCircle size={28} />
            </div>

            <h3>Camera could not start</h3>
            <p>{cameraError || "Something went wrong."}</p>

            <button
              type="button"
              className="camera-state-button"
              onClick={retryCamera}
            >
              <RefreshCw size={16} />
              Retry
            </button>
          </div>
        );
      }

      if (!stream || !isLive) {
        return (
          <div className="camera-state-content">
            <div className="camera-state-icon">
              <Camera size={28} />
            </div>

            <h3>{emptyTitle}</h3>
            <p>{emptyDescription}</p>

            <button
              type="button"
              className="camera-state-button primary"
              onClick={startCamera}
            >
              <Camera size={16} />
              Start Camera
            </button>
          </div>
        );
      }

      return null;
    };

    return (
      <section
        ref={containerRef}
        className={[
          "camera-view",
          isLive ? "camera-is-live" : "",
          isPaused ? "camera-is-paused" : "",
          isFullscreen ? "camera-is-fullscreen" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="camera-view-shell">
          {showHeader && <div className="camera-header">
            <div className="camera-heading">
              <div className="camera-heading-icon">
                <Camera size={17} />
                <span />
              </div>

              <div>
                <h2>{title}</h2>
                <p>{subtitle}</p>
              </div>
            </div>

            <div className="camera-header-actions">
              {showLiveBadge && (
                <div
                  className={`camera-live-badge ${
                    isLive ? "active" : "inactive"
                  }`}
                >
                  <span className="live-dot" />
                  <span>{isLive ? "LIVE" : "OFFLINE"}</span>
                </div>
              )}

              {showFullscreen && (
                <button
                  type="button"
                  className="camera-icon-button"
                  onClick={toggleFullscreen}
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
                  {isFullscreen ? (
                    <Minimize2 size={17} />
                  ) : (
                    <Maximize2 size={17} />
                  )}
                </button>
              )}
            </div>
          </div>}

          <div className="camera-stage">
            <video
              ref={videoElement}
              className={`camera-video ${
                mirrored ? "camera-video-mirrored" : ""
              }`}
              autoPlay={autoPlay}
              muted={muted}
              playsInline={playsInline}
              aria-label="Live study camera preview"
            />

            {!stream || !isLive ? (
              <div className="camera-state-layer">
                {renderContent()}
              </div>
            ) : null}

            {isPaused && (
              <div className="camera-paused-layer">
                <div className="paused-badge">
                  <PauseIcon />
                  Monitoring Paused
                </div>
              </div>
            )}

            {stream && isLive && showOverlay && (
              <>
                <FaceDetectionOverlay analysis={analysis} mirrored={mirrored} />
                <div className="camera-corner camera-corner-tl" />
                <div className="camera-corner camera-corner-tr" />
                <div className="camera-corner camera-corner-bl" />
                <div className="camera-corner camera-corner-br" />

                <div className="camera-scan-line" />

                {showLiveBadge && (
                  <div className="camera-live-overlay">
                    <span className="live-dot" />
                    <span>Monitoring</span>
                  </div>
                )}

                <div className="camera-ai-chip">
                  <span className="ai-chip-orbit">
                    <span />
                  </span>

                  <span>
                    {aiStatus?.label ||
                      aiStatus?.status ||
                      "AI Monitoring"}
                  </span>
                </div>

                {showCameraIcon && (
                  <div className="camera-bottom-watermark">
                    <Camera size={13} />
                    <span>DAILY GOAL</span>
                  </div>
                )}

                {showStatuses && (
                  <div className="camera-status-grid">
                    {statuses.map((status) => (
                      <OverlayStatus
                        key={status.key}
                        icon={status.icon}
                        label={STATUS_CONFIG[status.key].label}
                        value={status.value}
                        tone={status.tone}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {stream && isLive && showControls && (
              <div className="camera-bottom-controls">
                <button
                  type="button"
                  className="camera-control danger"
                  onClick={stopCamera}
                >
                  <CameraOff size={16} />
                  <span>Stop Camera</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }
);

CameraView.displayName = "CameraView";

function EyeIcon({ size = 18, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function TargetIcon({ size = 18, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
    </svg>
  );
}

function PostureIcon({ size = 18, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="5" r="2.5" />
      <path d="M8.5 22v-6l1.5-5h4l1.5 5v6" />
      <path d="M10 11 7 15M14 11l3 4" />
    </svg>
  );
}

function PhoneIcon({ size = 18, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M11 18h2" />
    </svg>
  );
}

function MoonIcon({ size = 18, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

export default CameraView;