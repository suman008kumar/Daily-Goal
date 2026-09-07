import React, { forwardRef, memo } from "react";
import {
  Activity,
  AlertCircle,
  Archive,
  BarChart3,
  Bell,
  Camera,
  CheckCircle2,
  ClipboardList,
  FileSearch,
  Inbox,
  Search,
  ShieldCheck,
  Sparkles,
  Timer,
  Users,
} from "lucide-react";
import Button from "./Button";
import "./EmptyState.css";

const ICON_MAP = {
  activity: Activity,
  alerts: Bell,
  analytics: BarChart3,
  archive: Archive,
  camera: Camera,
  check: CheckCircle2,
  clipboard: ClipboardList,
  search: Search,
  sessions: Timer,
  users: Users,
  security: ShieldCheck,
  sparkles: Sparkles,
  inbox: Inbox,
  error: AlertCircle,
  file: FileSearch,
};

const SIZE_CONFIG = {
  sm: {
    icon: 24,
    illustration: 76,
  },
  md: {
    icon: 32,
    illustration: 104,
  },
  lg: {
    icon: 42,
    illustration: 132,
  },
};

const EmptyState = forwardRef(
  (
    {
      title = "Nothing here yet",
      description = "",
      message = "",

      icon,
      iconKey = "inbox",
      illustration,

      size = "md",
      variant = "default",

      action,
      secondaryAction,
      actions,

      showIcon = true,
      showDecoration = true,
      animated = true,

      compact = false,
      bordered = false,

      className = "",
      children,

      ariaLabel,
    },
    ref
  ) => {
    const safeSize = SIZE_CONFIG[size]
      ? size
      : "md";

    const config = SIZE_CONFIG[safeSize];

    const IconComponent =
      ICON_MAP[iconKey] || ICON_MAP.inbox;

    const primaryAction = action || actions?.primary;
    const fallbackSecondary =
      secondaryAction || actions?.secondary;

    const renderAction = (
      actionConfig,
      fallbackVariant
    ) => {
      if (!actionConfig) return null;

      if (React.isValidElement(actionConfig)) {
        return actionConfig;
      }

      if (
        typeof actionConfig === "string"
      ) {
        return (
          <Button
            variant={fallbackVariant}
            size={compact ? "sm" : "md"}
            onClick={() => {}}
          >
            {actionConfig}
          </Button>
        );
      }

      const {
        label,
        children: actionChildren,
        variant: actionVariant =
          fallbackVariant,
        icon: actionIcon,
        iconPosition,
        loading,
        disabled,
        onClick,
        ...rest
      } = actionConfig;

      return (
        <Button
          variant={actionVariant}
          size={compact ? "sm" : "md"}
          icon={actionIcon}
          iconPosition={iconPosition}
          loading={loading}
          disabled={disabled}
          onClick={onClick}
          {...rest}
        >
          {label || actionChildren}
        </Button>
      );
    };

    const contentDescription =
      description || message;

    const classes = [
      "dg-empty-state",
      `dg-empty-state--${safeSize}`,
      `dg-empty-state--${variant}`,
      compact
        ? "dg-empty-state--compact"
        : "",
      bordered
        ? "dg-empty-state--bordered"
        : "",
      animated
        ? "dg-empty-state--animated"
        : "dg-empty-state--static",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <section
        ref={ref}
        className={classes}
        aria-label={ariaLabel}
      >
        {showDecoration && (
          <>
            <span
              className="dg-empty-state__orb dg-empty-state__orb--one"
              aria-hidden="true"
            />
            <span
              className="dg-empty-state__orb dg-empty-state__orb--two"
              aria-hidden="true"
            />

            <span
              className="dg-empty-state__grid"
              aria-hidden="true"
            />
          </>
        )}

        <div className="dg-empty-state__content">
          {showIcon && (
            <div
              className="dg-empty-state__visual"
              aria-hidden="true"
            >
              <div className="dg-empty-state__halo" />

              <div className="dg-empty-state__ring dg-empty-state__ring--outer" />
              <div className="dg-empty-state__ring dg-empty-state__ring--inner" />

              <div className="dg-empty-state__icon">
                {illustration || (
                  <IconComponent
                    size={config.icon}
                    strokeWidth={1.8}
                  />
                )}
              </div>

              <span className="dg-empty-state__spark dg-empty-state__spark--one">
                <Sparkles size={12} />
              </span>

              <span className="dg-empty-state__spark dg-empty-state__spark--two">
                <Sparkles size={9} />
              </span>

              <span className="dg-empty-state__dot dg-empty-state__dot--one" />
              <span className="dg-empty-state__dot dg-empty-state__dot--two" />
            </div>
          )}

          <div className="dg-empty-state__copy">
            <h3 className="dg-empty-state__title">
              {title}
            </h3>

            {contentDescription && (
              <p className="dg-empty-state__description">
                {contentDescription}
              </p>
            )}
          </div>

          {children && (
            <div className="dg-empty-state__children">
              {children}
            </div>
          )}

          {(primaryAction || fallbackSecondary) && (
            <div className="dg-empty-state__actions">
              {renderAction(
                primaryAction,
                "primary"
              )}

              {renderAction(
                fallbackSecondary,
                "outline"
              )}
            </div>
          )}
        </div>
      </section>
    );
  }
);

EmptyState.displayName = "EmptyState";

export default memo(EmptyState);