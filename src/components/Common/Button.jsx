import React, { forwardRef, useMemo } from "react";
import { Loader2 } from "lucide-react";
import "./Button.css";

const Button = forwardRef(
  (
    {
      children,
      type = "button",
      variant = "primary",
      size = "md",
      width = "auto",
      icon,
      iconPosition = "left",
      loading = false,
      loadingText,
      disabled = false,
      fullWidth = false,
      rounded = "md",
      elevated = false,
      glow = false,
      animated = true,
      ripple = true,
      ariaLabel,
      title,
      className = "",
      onClick,
      ...rest
    },
    ref
  ) => {
    const buttonClasses = useMemo(
      () =>
        [
          "dg-button",
          `dg-button--${variant}`,
          `dg-button--${size}`,
          `dg-button--width-${width}`,
          `dg-button--rounded-${rounded}`,
          fullWidth ? "dg-button--full" : "",
          elevated ? "dg-button--elevated" : "",
          glow ? "dg-button--glow" : "",
          animated ? "dg-button--animated" : "",
          loading ? "dg-button--loading" : "",
          disabled || loading ? "dg-button--disabled" : "",
          className,
        ]
          .filter(Boolean)
          .join(" "),
      [
        variant,
        size,
        width,
        rounded,
        fullWidth,
        elevated,
        glow,
        animated,
        loading,
        disabled,
        className,
      ]
    );

    const handleClick = (event) => {
      if (disabled || loading) {
        event.preventDefault();
        return;
      }

      if (ripple && animated) {
        const button = event.currentTarget;
        const rect = button.getBoundingClientRect();

        const rippleElement = document.createElement("span");

        const sizeValue = Math.max(rect.width, rect.height);

        rippleElement.className = "dg-button__ripple";
        rippleElement.style.width = `${sizeValue}px`;
        rippleElement.style.height = `${sizeValue}px`;
        rippleElement.style.left = `${
          event.clientX - rect.left - sizeValue / 2
        }px`;
        rippleElement.style.top = `${
          event.clientY - rect.top - sizeValue / 2
        }px`;

        button.appendChild(rippleElement);

        window.setTimeout(() => {
          rippleElement.remove();
        }, 650);
      }

      onClick?.(event);
    };

    const content = loading ? loadingText || children : children;

    const iconElement = loading ? (
      <Loader2
        className="dg-button__loader"
        size={size === "sm" ? 15 : size === "lg" ? 19 : 17}
        aria-hidden="true"
      />
    ) : (
      icon
    );

    return (
      <button
        ref={ref}
        type={type}
        className={buttonClasses}
        disabled={disabled || loading}
        aria-label={ariaLabel}
        aria-busy={loading || undefined}
        title={title}
        onClick={handleClick}
        {...rest}
      >
        <span className="dg-button__shine" aria-hidden="true" />

        <span className="dg-button__content">
          {iconPosition === "left" && iconElement && (
            <span className="dg-button__icon" aria-hidden="true">
              {iconElement}
            </span>
          )}

          {content !== undefined && content !== null && (
            <span className="dg-button__text">{content}</span>
          )}

          {iconPosition === "right" && iconElement && (
            <span className="dg-button__icon" aria-hidden="true">
              {iconElement}
            </span>
          )}
        </span>
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;