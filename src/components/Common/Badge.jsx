import React, { forwardRef, memo } from "react";
import {
  Check,
  CircleAlert,
  CircleCheck,
  Info,
  Clock3,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  X,
  Zap,
} from "lucide-react";
import "./Badge.css";

const VARIANT_ICONS = {
  default: Info,
  primary: Sparkles,
  secondary: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleAlert,
  info: Info,
  accent: Zap,
  active: Zap,
  inactive: X,
  pending: Clock3,
  live: CircleCheck,
  ai: Sparkles,
  verified: ShieldCheck,
};

const SIZE_CONFIG = {
  xs: {
    icon: 10,
    dot: 5,
  },
  sm: {
    icon: 12,
    dot: 6,
  },
  md: {
    icon: 14,
    dot: 7,
  },
  lg: {
    icon: 16,
    dot: 8,
  },
};

const normalizeValue = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const resolveVariant = (variant, status) => {
  const normalizedStatus = normalizeValue(status);

  if (variant && variant !== "auto") {
    return variant;
  }

  const statusMap = {
    success: "success",
    completed: "success",
    complete: "success",
    good: "success",
    excellent: "success",

    active: "active",
    live: "live",
    running: "live",

    warning: "warning",
    attention: "warning",
    needs_attention: "warning",

    pending: "pending",
    paused: "pending",

    info: "info",

    inactive: "inactive",
    disabled: "inactive",

    cancelled: "danger",
    canceled: "danger",
    error: "danger",
    failed: "danger",
    critical: "danger",
    danger: "danger",
    low: "danger",

    ai: "ai",
    demo: "ai",

    verified: "verified",
  };

  return statusMap[normalizedStatus] || "default";
};

const getIcon = (variant, customIcon) => {
  if (customIcon) {
    return customIcon;
  }

  const IconComponent =
    VARIANT_ICONS[variant] || VARIANT_ICONS.default;

  return <IconComponent />;
};

const Badge = forwardRef(
  (
    {
      children,
      label,
      text,
      status,

      variant = "default",
      size = "md",

      icon,
      showIcon = false,
      iconPosition = "left",

      dot = false,
      pulse = false,
      glow = false,

      outlined = false,
      soft = true,

      removable = false,
      onRemove,

      loading = false,
      loadingText = "Loading",

      clickable = false,
      disabled = false,
      onClick,

      rounded = "pill",
      uppercase = false,

      title,
      ariaLabel,

      className = "",
      ...rest
    },
    ref
  ) => {
    const safeSize = SIZE_CONFIG[size]
      ? size
      : "md";

    const resolvedVariant = resolveVariant(
      variant,
      status
    );

    const content =
      children ?? label ?? text ?? status ?? "";

    const config = SIZE_CONFIG[safeSize];

    const classes = [
      "dg-badge",
      `dg-badge--${safeSize}`,
      `dg-badge--${resolvedVariant}`,
      `dg-badge--rounded-${rounded}`,

      soft ? "dg-badge--soft" : "",
      outlined ? "dg-badge--outlined" : "",

      showIcon || icon || loading
        ? "dg-badge--has-icon"
        : "",

      iconPosition === "right"
        ? "dg-badge--icon-right"
        : "",

      dot ? "dg-badge--has-dot" : "",
      pulse ? "dg-badge--pulse" : "",
      glow ? "dg-badge--glow" : "",
      uppercase ? "dg-badge--uppercase" : "",

      clickable && !disabled
        ? "dg-badge--clickable"
        : "",

      disabled ? "dg-badge--disabled" : "",

      className,
    ]
      .filter(Boolean)
      .join(" ");

    const handleClick = (event) => {
      if (
        disabled ||
        loading ||
        typeof onClick !== "function"
      ) {
        return;
      }

      onClick(event);
    };

    const handleRemove = (event) => {
      event.stopPropagation();

      if (
        disabled ||
        loading ||
        typeof onRemove !== "function"
      ) {
        return;
      }

      onRemove(event);
    };

    const renderIcon = () => {
      if (loading) {
        return (
          <LoaderCircle
            className="dg-badge__loading-icon"
            size={config.icon}
            strokeWidth={2.5}
            aria-hidden="true"
          />
        );
      }

      if (showIcon || icon) {
        return (
          <span
            className="dg-badge__icon"
            aria-hidden="true"
          >
            {getIcon(resolvedVariant, icon)}
          </span>
        );
      }

      return null;
    };

    const renderDot = () => {
      if (!dot) {
        return null;
      }

      return (
        <span
          className="dg-badge__dot"
          aria-hidden="true"
        />
      );
    };

    const renderRemove = () => {
      if (!removable) {
        return null;
      }

      return (
        <button
          type="button"
          className="dg-badge__remove"
          onClick={handleRemove}
          disabled={disabled || loading}
          aria-label="Remove badge"
          title="Remove"
        >
          <X
            size={config.icon}
            strokeWidth={2.4}
          />
        </button>
      );
    };

    const badgeContent = (
      <>
        {iconPosition !== "right" && renderIcon()}

        {renderDot()}

        <span className="dg-badge__content">
          {loading ? loadingText : content}
        </span>

        {iconPosition === "right" && renderIcon()}

        {renderRemove()}
      </>
    );

    if (clickable && !disabled) {
      return (
        <button
          ref={ref}
          type="button"
          className={classes}
          onClick={handleClick}
          title={title}
          aria-label={ariaLabel}
          disabled={disabled}
          {...rest}
        >
          {badgeContent}
        </button>
      );
    }

    return (
      <span
        ref={ref}
        className={classes}
        role={clickable ? "button" : undefined}
        tabIndex={
          clickable && !disabled ? 0 : undefined
        }
        onClick={clickable ? handleClick : undefined}
        title={title}
        aria-label={ariaLabel}
        {...rest}
      >
        {badgeContent}
      </span>
    );
  }
);

Badge.displayName = "Badge";

export default memo(Badge);