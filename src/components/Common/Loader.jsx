import React, { memo } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";
import "./Loader.css";

const SIZE_CONFIG = {
  xs: {
    spinner: 18,
    icon: 11,
    stroke: 2.5,
  },
  sm: {
    spinner: 28,
    icon: 14,
    stroke: 2.8,
  },
  md: {
    spinner: 44,
    icon: 18,
    stroke: 3,
  },
  lg: {
    spinner: 64,
    icon: 24,
    stroke: 3.5,
  },
  xl: {
    spinner: 88,
    icon: 32,
    stroke: 4,
  },
};

const Loader = memo(
  ({
    loading = true,
    size = "md",
    variant = "spinner",
    text = "",
    subtext = "",
    progress,
    showProgress = false,
    showIcon = false,
    icon,
    overlay = false,
    fullscreen = false,
    centered = true,
    blur = true,
    animated = true,
    className = "",
    ariaLabel = "Loading",
  }) => {
    if (!loading) return null;

    const normalizedSize = SIZE_CONFIG[size] ? size : "md";
    const config = SIZE_CONFIG[normalizedSize];

    const hasProgress =
      showProgress &&
      typeof progress === "number" &&
      Number.isFinite(progress);

    const safeProgress = hasProgress
      ? Math.min(100, Math.max(0, progress))
      : 0;

    const wrapperClasses = [
      "dg-loader",
      `dg-loader--${normalizedSize}`,
      `dg-loader--${variant}`,
      overlay ? "dg-loader--overlay" : "",
      fullscreen ? "dg-loader--fullscreen" : "",
      centered ? "dg-loader--centered" : "",
      blur ? "dg-loader--blur" : "",
      animated ? "dg-loader--animated" : "dg-loader--static",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    const renderSpinner = () => {
      if (variant === "dots") {
        return (
          <div className="dg-loader__dots" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        );
      }

      if (variant === "pulse") {
        return (
          <div className="dg-loader__pulse" aria-hidden="true">
            <span className="dg-loader__pulse-core">
              {showIcon &&
                (icon || (
                  <Sparkles
                    size={config.icon}
                    strokeWidth={2.2}
                  />
                ))}
            </span>
          </div>
        );
      }

      if (variant === "orbit") {
        return (
          <div className="dg-loader__orbit" aria-hidden="true">
            <span className="dg-loader__orbit-ring dg-loader__orbit-ring--one" />
            <span className="dg-loader__orbit-ring dg-loader__orbit-ring--two" />
            <span className="dg-loader__orbit-dot dg-loader__orbit-dot--one" />
            <span className="dg-loader__orbit-dot dg-loader__orbit-dot--two" />

            <span className="dg-loader__orbit-core">
              {showIcon &&
                (icon || (
                  <Sparkles
                    size={config.icon}
                    strokeWidth={2.2}
                  />
                ))}
            </span>
          </div>
        );
      }

      if (variant === "progress") {
        return (
          <div className="dg-loader__progress-wrapper">
            <div className="dg-loader__progress-ring">
              <svg
                viewBox="0 0 100 100"
                role="presentation"
              >
                <circle
                  className="dg-loader__progress-track"
                  cx="50"
                  cy="50"
                  r="42"
                />

                <circle
                  className="dg-loader__progress-value"
                  cx="50"
                  cy="50"
                  r="42"
                  pathLength="100"
                  style={{
                    strokeDashoffset: 100 - safeProgress,
                  }}
                />
              </svg>

              <span className="dg-loader__progress-number">
                {Math.round(safeProgress)}%
              </span>
            </div>
          </div>
        );
      }

      return (
        <div
          className="dg-loader__spinner"
          aria-hidden="true"
        >
          <LoaderCircle
            size={config.spinner}
            strokeWidth={config.stroke}
          />

          {showIcon && (
            <span className="dg-loader__spinner-icon">
              {icon || (
                <Sparkles
                  size={config.icon}
                  strokeWidth={2.2}
                />
              )}
            </span>
          )}
        </div>
      );
    };

    return (
      <div
        className={wrapperClasses}
        role="status"
        aria-live="polite"
        aria-label={ariaLabel}
      >
        <div className="dg-loader__ambient" />

        <div className="dg-loader__content">
          {renderSpinner()}

          {(text || subtext || hasProgress) && (
            <div className="dg-loader__copy">
              {text && (
                <div className="dg-loader__text">
                  {text}
                  <span className="dg-loader__text-dots">
                    <span>.</span>
                    <span>.</span>
                    <span>.</span>
                  </span>
                </div>
              )}

              {subtext && (
                <div className="dg-loader__subtext">
                  {subtext}
                </div>
              )}

              {hasProgress && variant !== "progress" && (
                <div className="dg-loader__linear-progress">
                  <div className="dg-loader__linear-track">
                    <span
                      className="dg-loader__linear-value"
                      style={{
                        width: `${safeProgress}%`,
                      }}
                    />
                  </div>

                  <span className="dg-loader__linear-number">
                    {Math.round(safeProgress)}%
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
);

Loader.displayName = "Loader";

export default Loader;