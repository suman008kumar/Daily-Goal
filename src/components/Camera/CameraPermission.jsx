import React, { useMemo } from "react";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  CircleAlert,
  ExternalLink,
  Loader2,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import "./CameraPermission.css";

const PERMISSION_STATES = {
  NOT_ASKED: "not_asked",
  REQUESTING: "requesting",
  GRANTED: "granted",
  DENIED: "denied",
  ERROR: "error",
  UNAVAILABLE: "unavailable",
};

const normalizeState = (state) => {
  const value = String(state || "").toLowerCase();

  if (Object.values(PERMISSION_STATES).includes(value)) {
    return value;
  }

  return PERMISSION_STATES.NOT_ASKED;
};

const STATE_CONFIG = {
  [PERMISSION_STATES.NOT_ASKED]: {
    icon: Camera,
    tone: "primary",
    eyebrow: "Camera Access",
    title: "Camera permission required",
    description:
      "Allow camera access to enable live study monitoring and AI-based focus analysis.",
  },

  [PERMISSION_STATES.REQUESTING]: {
    icon: Loader2,
    tone: "primary",
    eyebrow: "Requesting Access",
    title: "Waiting for camera permission",
    description:
      "Your browser is asking for permission to use the camera. Please allow access to continue.",
  },

  [PERMISSION_STATES.GRANTED]: {
    icon: CheckCircle2,
    tone: "success",
    eyebrow: "Camera Ready",
    title: "Camera access enabled",
    description:
      "Your camera is ready. You can now start a monitored study session.",
  },

  [PERMISSION_STATES.DENIED]: {
    icon: CameraOff,
    tone: "danger",
    eyebrow: "Access Blocked",
    title: "Camera permission was denied",
    description:
      "Camera access is blocked by your browser. Allow camera access from the browser permission settings and try again.",
  },

  [PERMISSION_STATES.ERROR]: {
    icon: CircleAlert,
    tone: "warning",
    eyebrow: "Camera Error",
    title: "Unable to access the camera",
    description:
      "Something went wrong while connecting to your camera. Check your camera connection and try again.",
  },

  [PERMISSION_STATES.UNAVAILABLE]: {
    icon: XCircle,
    tone: "danger",
    eyebrow: "Camera Unavailable",
    title: "Camera is not available",
    description:
      "This device or browser does not currently provide camera access.",
  },
};

const DEFAULT_FEATURES = [
  {
    icon: ShieldCheck,
    title: "Privacy first",
    description: "Camera processing stays inside your browser.",
  },
  {
    icon: Sparkles,
    title: "AI monitoring",
    description: "Analyze focus, attention and study activity.",
  },
  {
    icon: LockKeyhole,
    title: "Session control",
    description: "Camera access is only used during monitoring.",
  },
];

const FeatureItem = ({ feature }) => {
  const Icon = feature?.icon || ShieldCheck;

  return (
    <div className="camera-permission__feature">
      <div className="camera-permission__feature-icon">
        <Icon size={17} strokeWidth={2} />
      </div>

      <div className="camera-permission__feature-content">
        <strong>{feature?.title}</strong>
        <span>{feature?.description}</span>
      </div>
    </div>
  );
};

const PermissionIllustration = ({ tone, requesting, granted }) => {
  return (
    <div
      className={`camera-permission__visual camera-permission__visual--${tone}`}
      aria-hidden="true"
    >
      <div className="camera-permission__orbit camera-permission__orbit--one" />
      <div className="camera-permission__orbit camera-permission__orbit--two" />
      <div className="camera-permission__orbit camera-permission__orbit--three" />

      <div className="camera-permission__radar">
        <span />
        <span />
        <span />
      </div>

      <div className="camera-permission__camera">
        <div className="camera-permission__camera-lens">
          {requesting ? (
            <Loader2 className="camera-permission__spinner" size={30} />
          ) : granted ? (
            <CheckCircle2 size={30} strokeWidth={2.2} />
          ) : (
            <Camera size={30} strokeWidth={2.2} />
          )}
        </div>

        <div className="camera-permission__camera-light" />
      </div>

      <div className="camera-permission__scan-line" />
    </div>
  );
};

const CameraPermission = ({
  permissionState = PERMISSION_STATES.NOT_ASKED,
  cameraState,
  status,

  onRequestPermission,
  onRetry,
  onOpenSettings,

  title,
  description,
  requestLabel = "Allow Camera Access",
  retryLabel = "Try Again",
  grantedLabel = "Camera Ready",
  settingsLabel = "Open Browser Settings",

  features = DEFAULT_FEATURES,

  showFeatures = true,
  showPrivacyNote = true,
  showSettingsAction = true,
  showStatus = true,

  disabled = false,
  compact = false,
  className = "",
}) => {
  const normalizedState = normalizeState(
    permissionState || cameraState || status
  );

  const config = STATE_CONFIG[normalizedState] || STATE_CONFIG.NOT_ASKED;
  const Icon = config.icon;

  const isRequesting = normalizedState === PERMISSION_STATES.REQUESTING;
  const isGranted = normalizedState === PERMISSION_STATES.GRANTED;
  const isDenied = normalizedState === PERMISSION_STATES.DENIED;
  const isError = normalizedState === PERMISSION_STATES.ERROR;
  const isUnavailable = normalizedState === PERMISSION_STATES.UNAVAILABLE;

  const primaryLabel = useMemo(() => {
    if (isRequesting) return "Requesting Access";
    if (isGranted) return grantedLabel;
    if (isDenied || isError) return retryLabel;

    return requestLabel;
  }, [
    isRequesting,
    isGranted,
    isDenied,
    isError,
    grantedLabel,
    retryLabel,
    requestLabel,
  ]);

  const handlePrimaryAction = () => {
    if (disabled || isRequesting || isUnavailable) return;

    if (isGranted) return;

    if (isDenied || isError) {
      if (onRetry) {
        onRetry();
        return;
      }

      if (onRequestPermission) {
        onRequestPermission();
      }

      return;
    }

    if (onRequestPermission) {
      onRequestPermission();
    }
  };

  const handleSettings = () => {
    if (disabled) return;

    if (onOpenSettings) {
      onOpenSettings();
      return;
    }

    /*
     * Browsers do not expose a universal JavaScript API
     * that directly opens their camera permission settings.
     * Therefore this callback is intentionally optional.
     */
  };

  const rootClasses = [
    "camera-permission",
    `camera-permission--${config.tone}`,
    `camera-permission--${normalizedState}`,
    compact ? "camera-permission--compact" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const finalTitle = title || config.title;
  const finalDescription = description || config.description;

  return (
    <section
      className={rootClasses}
      aria-labelledby="camera-permission-title"
      aria-describedby="camera-permission-description"
    >
      <div className="camera-permission__ambient camera-permission__ambient--one" />
      <div className="camera-permission__ambient camera-permission__ambient--two" />

      <div className="camera-permission__inner">
        <div className="camera-permission__visual-column">
          <PermissionIllustration
            tone={config.tone}
            requesting={isRequesting}
            granted={isGranted}
          />

          {showStatus && (
            <div className="camera-permission__status">
              <span className="camera-permission__status-dot" />
              <span>
                {isRequesting
                  ? "Waiting for browser permission"
                  : isGranted
                    ? "Camera connected"
                    : isUnavailable
                      ? "Camera unavailable"
                      : "Camera access needed"}
              </span>
            </div>
          )}
        </div>

        <div className="camera-permission__content">
          <div className="camera-permission__eyebrow">
            <span className="camera-permission__eyebrow-icon">
              <Icon
                size={15}
                strokeWidth={2.2}
                className={isRequesting ? "is-spinning" : ""}
              />
            </span>

            <span>{config.eyebrow}</span>
          </div>

          <h2 id="camera-permission-title">{finalTitle}</h2>

          <p
            id="camera-permission-description"
            className="camera-permission__description"
          >
            {finalDescription}
          </p>

          {!compact && showFeatures && (
            <div className="camera-permission__features">
              {features.map((feature, index) => (
                <FeatureItem
                  key={feature?.id || feature?.title || index}
                  feature={feature}
                />
              ))}
            </div>
          )}

          <div className="camera-permission__actions">
            {!isUnavailable && (
              <button
                type="button"
                className="camera-permission__primary"
                onClick={handlePrimaryAction}
                disabled={disabled || isRequesting || isGranted}
                aria-disabled={disabled || isRequesting || isGranted}
              >
                <span className="camera-permission__button-icon">
                  {isRequesting ? (
                    <Loader2 className="is-spinning" size={18} />
                  ) : isGranted ? (
                    <CheckCircle2 size={18} />
                  ) : isDenied || isError ? (
                    <RefreshCw size={18} />
                  ) : (
                    <Camera size={18} />
                  )}
                </span>

                <span>{primaryLabel}</span>

                {!isGranted && !isRequesting && (
                  <span className="camera-permission__button-arrow">→</span>
                )}
              </button>
            )}

            {(isDenied || isError) &&
              showSettingsAction &&
              onOpenSettings && (
                <button
                  type="button"
                  className="camera-permission__secondary"
                  onClick={handleSettings}
                  disabled={disabled}
                >
                  <ExternalLink size={16} />
                  <span>{settingsLabel}</span>
                </button>
              )}
          </div>

          {showPrivacyNote && (
            <div className="camera-permission__privacy">
              <div className="camera-permission__privacy-icon">
                <LockKeyhole size={15} />
              </div>

              <div>
                <strong>Your privacy matters</strong>
                <span>
                  Camera access can be stopped anytime. No camera permission
                  is requested until you start monitoring.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="camera-permission__bottom-line" />
    </section>
  );
};

export {
  PERMISSION_STATES,
  STATE_CONFIG,
};

export default CameraPermission;