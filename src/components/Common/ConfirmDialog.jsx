import React, { useEffect, useMemo, useRef } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  ShieldAlert,
  X,
} from "lucide-react";
import "./ConfirmDialog.css";

const VARIANTS = {
  danger: {
    icon: ShieldAlert,
    iconClass: "danger",
    defaultTitle: "Are you sure?",
    defaultConfirm: "Confirm",
  },

  warning: {
    icon: AlertTriangle,
    iconClass: "warning",
    defaultTitle: "Please confirm",
    defaultConfirm: "Continue",
  },

  success: {
    icon: CheckCircle2,
    iconClass: "success",
    defaultTitle: "Confirm action",
    defaultConfirm: "Confirm",
  },

  info: {
    icon: Info,
    iconClass: "info",
    defaultTitle: "Confirm action",
    defaultConfirm: "Continue",
  },
};

const normalizeVariant = (variant) =>
  VARIANTS[variant] ? variant : "danger";

const ConfirmDialog = ({
  open = false,
  isOpen,

  title,
  message,
  description,

  variant = "danger",

  confirmLabel,
  cancelLabel = "Cancel",

  onConfirm,
  onCancel,
  onClose,

  loading = false,
  loadingLabel = "Processing...",

  disabled = false,

  icon,
  showIcon = true,

  showClose = true,
  closeOnOverlay = true,
  closeOnEscape = true,

  destructive = false,

  confirmButtonClassName = "",
  cancelButtonClassName = "",
  className = "",

  size = "md",

  autoFocus = true,

  preventBodyScroll = true,

  children,

  confirmButton,
  cancelButton,

  ariaLabel,
  ariaDescribedBy,

  closeAfterConfirm = false,

  ...rest
}) => {
  const dialogRef = useRef(null);
  const confirmRef = useRef(null);
  const previousActiveElementRef = useRef(null);

  const visible =
    isOpen !== undefined ? isOpen : open;

  const normalizedVariant =
    normalizeVariant(variant);

  const config = VARIANTS[normalizedVariant];

  const Icon =
    icon ||
    config.icon;

  const finalTitle =
    title || config.defaultTitle;

  const finalConfirmLabel =
    confirmLabel ||
    config.defaultConfirm;

  const finalMessage =
    message || description;

  const safeSize = [
    "sm",
    "md",
    "lg",
  ].includes(size)
    ? size
    : "md";

  const dialogId = useMemo(
    () =>
      `dg-confirm-${Math.random()
        .toString(36)
        .slice(2, 10)}`,
    []
  );

  useEffect(() => {
    if (!visible) return undefined;

    previousActiveElementRef.current =
      document.activeElement;

    if (preventBodyScroll) {
      const previousOverflow =
        document.body.style.overflow;

      document.body.style.overflow = "hidden";

      return () => {
        document.body.style.overflow =
          previousOverflow;
      };
    }

    return undefined;
  }, [visible, preventBodyScroll]);

  useEffect(() => {
    if (!visible) return undefined;

    const timer = window.setTimeout(() => {
      if (autoFocus) {
        confirmRef.current?.focus();
      } else {
        dialogRef.current?.focus();
      }
    }, 50);

    return () => {
      window.clearTimeout(timer);
    };
  }, [visible, autoFocus]);

  useEffect(() => {
    if (visible) return undefined;

    previousActiveElementRef.current?.focus?.();

    return undefined;
  }, [visible]);

  useEffect(() => {
    if (!visible || !closeOnEscape) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (loading) return;

        onCancel?.();
        onClose?.();
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    visible,
    closeOnEscape,
    loading,
    onCancel,
    onClose,
  ]);

  const handleOverlayClick = (event) => {
    if (!closeOnOverlay || loading) return;

    if (
      event.target === event.currentTarget
    ) {
      onCancel?.();
      onClose?.();
    }
  };

  const handleCancel = () => {
    if (loading) return;

    onCancel?.();
    onClose?.();
  };

  const handleConfirm = async () => {
    if (
      loading ||
      disabled
    ) {
      return;
    }

    await onConfirm?.();

    if (closeAfterConfirm) {
      onClose?.();
    }
  };

  const handleDialogKeyDown = (event) => {
    if (event.key !== "Tab") return;

    const focusableElements =
      dialogRef.current?.querySelectorAll(
        [
          "button:not([disabled])",
          "[href]",
          "input:not([disabled])",
          "select:not([disabled])",
          "textarea:not([disabled])",
          "[tabindex]:not([tabindex='-1'])",
        ].join(",")
      );

    if (!focusableElements?.length) {
      event.preventDefault();
      return;
    }

    const first =
      focusableElements[0];

    const last =
      focusableElements[
        focusableElements.length - 1
      ];

    if (
      event.shiftKey &&
      document.activeElement === first
    ) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      document.activeElement === last
    ) {
      event.preventDefault();
      first.focus();
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <div
      className={[
        "dg-confirm",
        `dg-confirm--${normalizedVariant}`,
        `dg-confirm--${safeSize}`,
        loading
          ? "dg-confirm--loading"
          : "",
        destructive
          ? "dg-confirm--destructive"
          : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      onMouseDown={handleOverlayClick}
      role="presentation"
      {...rest}
    >
      <div
        className="dg-confirm__backdrop"
        aria-hidden="true"
      >
        <span className="dg-confirm__backdrop-glow" />
        <span className="dg-confirm__backdrop-grid" />
      </div>

      <div
        ref={dialogRef}
        id={dialogId}
        className="dg-confirm__dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`${dialogId}-title`}
        aria-describedby={
          ariaDescribedBy ||
          `${dialogId}-description`
        }
        aria-label={
          ariaLabel ||
          finalTitle
        }
        tabIndex="-1"
        onKeyDown={handleDialogKeyDown}
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        {/* Decorative effects */}
        <span className="dg-confirm__ambient dg-confirm__ambient--one" />
        <span className="dg-confirm__ambient dg-confirm__ambient--two" />
        <span className="dg-confirm__scanline" />

        {showClose ? (
          <button
            type="button"
            className="dg-confirm__close"
            onClick={handleCancel}
            disabled={loading}
            aria-label="Close confirmation dialog"
            title="Close"
          >
            <X size={17} />
          </button>
        ) : null}

        <div className="dg-confirm__body">

          {showIcon ? (
            <div
              className={[
                "dg-confirm__icon-wrapper",
                `dg-confirm__icon-wrapper--${config.iconClass}`,
              ].join(" ")}
            >
              <span className="dg-confirm__icon-ring dg-confirm__icon-ring--one" />
              <span className="dg-confirm__icon-ring dg-confirm__icon-ring--two" />

              <span className="dg-confirm__icon">
                {loading ? (
                  <span className="dg-confirm__spinner" />
                ) : (
                  <Icon size={27} strokeWidth={2.1} />
                )}
              </span>
            </div>
          ) : null}

          <div className="dg-confirm__content">

            <div className="dg-confirm__eyebrow">
              {normalizedVariant === "danger"
                ? "Confirmation required"
                : "Please confirm"}
            </div>

            <h2
              id={`${dialogId}-title`}
              className="dg-confirm__title"
            >
              {finalTitle}
            </h2>

            {finalMessage ? (
              <p
                id={`${dialogId}-description`}
                className="dg-confirm__message"
              >
                {finalMessage}
              </p>
            ) : null}

            {children ? (
              <div className="dg-confirm__extra">
                {children}
              </div>
            ) : null}

          </div>
        </div>

        <div className="dg-confirm__footer">

          {cancelButton ? (
            cancelButton
          ) : (
            <button
              type="button"
              className={[
                "dg-confirm__button",
                "dg-confirm__button--cancel",
                cancelButtonClassName,
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={handleCancel}
              disabled={loading}
            >
              {cancelLabel}
            </button>
          )}

          {confirmButton ? (
            confirmButton
          ) : (
            <button
              ref={confirmRef}
              type="button"
              className={[
                "dg-confirm__button",
                "dg-confirm__button--confirm",
                `dg-confirm__button--${normalizedVariant}`,
                confirmButtonClassName,
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={handleConfirm}
              disabled={
                loading ||
                disabled
              }
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <span className="dg-confirm__button-spinner" />
                  <span>
                    {loadingLabel}
                  </span>
                </>
              ) : (
                <>
                  <span>
                    {finalConfirmLabel}
                  </span>

                  <span className="dg-confirm__button-arrow">
                    →
                  </span>
                </>
              )}
            </button>
          )}

        </div>

        <div className="dg-confirm__footer-glow" />
      </div>
    </div>
  );
};

export default ConfirmDialog;