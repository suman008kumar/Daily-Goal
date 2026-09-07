import React, {
  cloneElement,
  isValidElement,
  useId,
  useRef,
  useState,
} from "react";
import "./Tooltip.css";

const POSITIONS = {
  top: "top",
  bottom: "bottom",
  left: "left",
  right: "right",
};

const normalizePosition = (position) =>
  POSITIONS[position] || POSITIONS.top;

const Tooltip = ({
  children,
  content,
  text,

  position = "top",
  side,
  align = "center",

  delay = 250,
  hideDelay = 80,

  disabled = false,
  interactive = false,

  showArrow = true,
  showIcon = false,
  icon = null,

  maxWidth = 280,

  trigger = "hover",
  open: controlledOpen,
  defaultOpen = false,
  onOpen,
  onClose,

  className = "",
  tooltipClassName = "",

  id,
  ariaLabel,

  offset = 10,

  animation = "smooth",

  childrenClassName = "",

  ...rest
}) => {
  const generatedId = useId();
  const tooltipId = id || `tooltip-${generatedId.replace(/:/g, "")}`;

  const triggerRef = useRef(null);
  const openTimerRef = useRef(null);
  const closeTimerRef = useRef(null);

  const [internalOpen, setInternalOpen] = useState(defaultOpen);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const tooltipContent = content ?? text;

  const finalPosition = normalizePosition(side || position);

  const clearTimers = () => {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }

    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const updateOpenState = (nextOpen) => {
    if (!isControlled) {
      setInternalOpen(nextOpen);
    }

    if (nextOpen) {
      onOpen?.();
    } else {
      onClose?.();
    }
  };

  const openTooltip = () => {
    if (disabled || !tooltipContent) return;

    clearTimers();

    openTimerRef.current = setTimeout(() => {
      updateOpenState(true);
    }, Math.max(0, Number(delay) || 0));
  };

  const closeTooltip = () => {
    clearTimers();

    closeTimerRef.current = setTimeout(() => {
      updateOpenState(false);
    }, Math.max(0, Number(hideDelay) || 0));
  };

  const toggleTooltip = () => {
    if (disabled || !tooltipContent) return;

    clearTimers();
    updateOpenState(!isOpen);
  };

  const handleKeyDown = (event) => {
    if (disabled) return;

    if (event.key === "Escape") {
      clearTimers();
      updateOpenState(false);
      triggerRef.current?.focus?.();
    }

    if (
      trigger === "click" &&
      (event.key === "Enter" || event.key === " ")
    ) {
      event.preventDefault();
      toggleTooltip();
    }
  };

  const triggerHandlers = {};

  if (!disabled) {
    if (trigger === "hover" || trigger === "both") {
      triggerHandlers.onMouseEnter = openTooltip;
      triggerHandlers.onMouseLeave = closeTooltip;
    }

    if (trigger === "focus" || trigger === "both") {
      triggerHandlers.onFocus = openTooltip;
      triggerHandlers.onBlur = closeTooltip;
    }

    if (trigger === "click" || trigger === "both") {
      triggerHandlers.onClick = toggleTooltip;
    }
  }

  const handleTooltipMouseEnter = () => {
    if (interactive) {
      clearTimers();
      updateOpenState(true);
    }
  };

  const handleTooltipMouseLeave = () => {
    if (interactive) {
      closeTooltip();
    }
  };

  const child = isValidElement(children)
    ? children
    : (
      <span className="dg-tooltip__default-trigger">
        {children}
      </span>
    );

  const mergedClassName = [
    child.props?.className,
    childrenClassName,
  ]
    .filter(Boolean)
    .join(" ");

  const triggerProps = {
    ...triggerHandlers,
    ref: triggerRef,
    className: mergedClassName || undefined,
    "aria-describedby": isOpen ? tooltipId : undefined,
    "aria-label": ariaLabel || child.props?.["aria-label"],
    tabIndex:
      child.props?.tabIndex !== undefined
        ? child.props.tabIndex
        : disabled
          ? undefined
          : 0,
    onKeyDown: (event) => {
      child.props?.onKeyDown?.(event);
      handleKeyDown(event);
    },
    ...rest,
  };

  const wrappedChild = cloneElement(child, triggerProps);

  if (disabled || !tooltipContent) {
    return wrappedChild;
  }

  return (
    <span
      className={[
        "dg-tooltip",
        `dg-tooltip--${finalPosition}`,
        `dg-tooltip--align-${align}`,
        isOpen ? "is-open" : "",
        disabled ? "is-disabled" : "",
        interactive ? "is-interactive" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {wrappedChild}

      <span
        id={tooltipId}
        role="tooltip"
        aria-hidden={!isOpen}
        className={[
          "dg-tooltip__content",
          `dg-tooltip__content--${animation}`,
          tooltipClassName,
        ]
          .filter(Boolean)
          .join(" ")}
        style={{
          "--tooltip-max-width": `${Math.max(
            120,
            Number(maxWidth) || 280
          )}px`,
          "--tooltip-offset": `${Math.max(
            0,
            Number(offset) || 0
          )}px`,
        }}
        onMouseEnter={handleTooltipMouseEnter}
        onMouseLeave={handleTooltipMouseLeave}
      >
        <span className="dg-tooltip__ambient" />
        <span className="dg-tooltip__shine" />

        <span className="dg-tooltip__inner">
          {showIcon && icon ? (
            <span className="dg-tooltip__icon" aria-hidden="true">
              {icon}
            </span>
          ) : null}

          <span className="dg-tooltip__text">
            {tooltipContent}
          </span>
        </span>

        {showArrow ? (
          <span
            className="dg-tooltip__arrow"
            aria-hidden="true"
          />
        ) : null}
      </span>
    </span>
  );
};

export default Tooltip;