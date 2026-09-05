import React, {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
} from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  XCircle,
} from "lucide-react";
import "./Modal.css";

const MODAL_VARIANTS = {
  default: {
    icon: null,
    tone: "default",
  },
  info: {
    icon: Info,
    tone: "info",
  },
  success: {
    icon: CheckCircle2,
    tone: "success",
  },
  warning: {
    icon: AlertTriangle,
    tone: "warning",
  },
  danger: {
    icon: XCircle,
    tone: "danger",
  },
};

const Modal = forwardRef(
  (
    {
      open = false,
      isOpen,
      onClose,

      title,
      subtitle,
      children,

      variant = "default",
      icon,
      showIcon = false,

      size = "md",
      position = "center",

      showClose = true,
      closeOnOverlay = true,
      closeOnEscape = true,

      footer,
      actions,

      primaryAction,
      secondaryAction,

      loading = false,
      loadingText,

      showHeader = true,
      showFooter = true,

      scrollable = true,
      preventBodyScroll = true,

      animation = true,
      backdropBlur = true,

      className = "",
      overlayClassName = "",
      contentClassName = "",

      ariaLabel,
      ariaDescribedBy,

      childrenClassName,

      ...rest
    },
    ref
  ) => {
    const generatedTitleId = useId();
    const generatedDescriptionId = useId();
    const modalRef = useRef(null);
    const previousActiveElement = useRef(null);

    const visible = typeof isOpen === "boolean" ? isOpen : open;

    const titleId = `daily-goal-modal-title-${generatedTitleId}`;
    const descriptionId = `daily-goal-modal-description-${generatedDescriptionId}`;

    const variantConfig =
      MODAL_VARIANTS[variant] || MODAL_VARIANTS.default;

    const VariantIcon = variantConfig.icon;

    const resolvedIcon = icon || (showIcon ? <VariantIcon /> : null);

    const modalClasses = useMemo(
      () =>
        [
          "dg-modal",
          `dg-modal--${size}`,
          `dg-modal--${position}`,
          `dg-modal--${variantConfig.tone}`,
          animation ? "dg-modal--animated" : "",
          scrollable ? "dg-modal--scrollable" : "",
          className,
        ]
          .filter(Boolean)
          .join(" "),
      [
        size,
        position,
        variantConfig.tone,
        animation,
        scrollable,
        className,
      ]
    );

    const handleClose = useCallback(() => {
      if (loading) return;
      onClose?.();
    }, [loading, onClose]);

    /* =====================================================
       ESCAPE KEY
    ===================================================== */

    useEffect(() => {
      if (!visible || !closeOnEscape) return undefined;

      const handleKeyDown = (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          handleClose();
        }
      };

      document.addEventListener("keydown", handleKeyDown);

      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    }, [visible, closeOnEscape, handleClose]);

    /* =====================================================
       BODY SCROLL LOCK
    ===================================================== */

    useEffect(() => {
      if (!visible || !preventBodyScroll) return undefined;

      const body = document.body;
      const html = document.documentElement;

      const previousBodyOverflow = body.style.overflow;
      const previousBodyPaddingRight = body.style.paddingRight;
      const previousHtmlOverflow = html.style.overflow;

      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;

      body.style.overflow = "hidden";

      if (scrollbarWidth > 0) {
        body.style.paddingRight = `${scrollbarWidth}px`;
      }

      html.style.overflow = "hidden";

      return () => {
        body.style.overflow = previousBodyOverflow;
        body.style.paddingRight = previousBodyPaddingRight;
        html.style.overflow = previousHtmlOverflow;
      };
    }, [visible, preventBodyScroll]);

    /* =====================================================
       FOCUS RESTORE
    ===================================================== */

    useEffect(() => {
      if (!visible) return undefined;

      previousActiveElement.current = document.activeElement;

      const timer = window.setTimeout(() => {
        modalRef.current?.focus();
      }, 30);

      return () => {
        window.clearTimeout(timer);
      };
    }, [visible]);

    useEffect(() => {
      if (visible) return;

      const previous = previousActiveElement.current;

      if (
        previous &&
        typeof previous.focus === "function" &&
        document.contains(previous)
      ) {
        window.setTimeout(() => {
          previous.focus();
        }, 20);
      }
    }, [visible]);

    /* =====================================================
       OVERLAY CLICK
    ===================================================== */

    const handleOverlayClick = (event) => {
      if (!closeOnOverlay || loading) return;

      if (event.target === event.currentTarget) {
        handleClose();
      }
    };

    /* =====================================================
       PRIMARY ACTION
    ===================================================== */

    const handlePrimaryAction = (event) => {
      if (!primaryAction || loading) return;

      primaryAction.onClick?.(event);
    };

    /* =====================================================
       SECONDARY ACTION
    ===================================================== */

    const handleSecondaryAction = (event) => {
      if (!secondaryAction || loading) return;

      if (secondaryAction.closeOnClick) {
        handleClose();
      }

      secondaryAction.onClick?.(event);
    };

    /* =====================================================
       ACTION RENDERER
    ===================================================== */

    const renderAction = (action, actionType) => {
      if (!action) return null;

      const {
        label,
        children: actionChildren,
        onClick,
        variant: actionVariant,
        disabled = false,
        loading: actionLoading = false,
        loadingText: actionLoadingText,
        icon: actionIcon,
        iconPosition = "left",
        className: actionClassName = "",
        type = "button",
        ...actionProps
      } = action;

      const text =
        actionLoading && actionLoadingText
          ? actionLoadingText
          : actionChildren || label;

      return (
        <button
          type={type}
          className={[
            "dg-modal__action",
            `dg-modal__action--${
              actionVariant ||
              (actionType === "primary" ? "primary" : "secondary")
            }`,
            actionClassName,
          ]
            .filter(Boolean)
            .join(" ")}
          disabled={disabled || actionLoading || loading}
          onClick={(event) => {
            if (actionType === "secondary" && action.closeOnClick) {
              handleClose();
            }

            onClick?.(event);
          }}
          {...actionProps}
        >
          {actionLoading ? (
            <span className="dg-modal__action-loader" aria-hidden="true" />
          ) : (
            <>
              {iconPosition === "left" && actionIcon}
            </>
          )}

          <span>{text}</span>

          {!actionLoading && iconPosition === "right" && actionIcon}
        </button>
      );
    };

    /* =====================================================
       FOOTER
    ===================================================== */

    const hasFooter =
      footer ||
      actions ||
      primaryAction ||
      secondaryAction;

    /* =====================================================
       NOT OPEN
    ===================================================== */

    if (!visible) {
      return null;
    }

    return (
      <div
        className={[
          "dg-modal-overlay",
          backdropBlur ? "dg-modal-overlay--blur" : "",
          overlayClassName,
        ]
          .filter(Boolean)
          .join(" ")}
        role="presentation"
        onMouseDown={handleOverlayClick}
      >
        <div
          ref={(node) => {
            modalRef.current = node;

            if (typeof ref === "function") {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
          }}
          className={modalClasses}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          aria-describedby={
            ariaDescribedBy ||
            (subtitle ? descriptionId : undefined)
          }
          aria-label={!title ? ariaLabel : undefined}
          tabIndex={-1}
          onMouseDown={(event) => event.stopPropagation()}
          {...rest}
        >
          {/* =================================================
              DECORATIVE ELEMENTS
          ================================================= */}

          <div
            className="dg-modal__ambient dg-modal__ambient--one"
            aria-hidden="true"
          />

          <div
            className="dg-modal__ambient dg-modal__ambient--two"
            aria-hidden="true"
          />

          <div
            className="dg-modal__scan"
            aria-hidden="true"
          />

          {/* =================================================
              HEADER
          ================================================= */}

          {showHeader && (title || subtitle || resolvedIcon) && (
            <header className="dg-modal__header">
              <div className="dg-modal__heading">
                {resolvedIcon && (
                  <div className="dg-modal__icon">
                    {resolvedIcon}
                  </div>
                )}

                <div className="dg-modal__heading-text">
                  {title && (
                    <h2 id={titleId}>
                      {title}
                    </h2>
                  )}

                  {subtitle && (
                    <p id={descriptionId}>
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>

              {showClose && (
                <button
                  type="button"
                  className="dg-modal__close"
                  onClick={handleClose}
                  disabled={loading}
                  aria-label="Close modal"
                  title="Close"
                >
                  <X size={18} />
                </button>
              )}
            </header>
          )}

          {/* =================================================
              CONTENT
          ================================================= */}

          <div
            className={[
              "dg-modal__content",
              scrollable ? "dg-modal__content--scrollable" : "",
              contentClassName,
              childrenClassName || "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {children}
          </div>

          {/* =================================================
              FOOTER
          ================================================= */}

          {showFooter && hasFooter && (
            <footer className="dg-modal__footer">
              {footer && (
                <div className="dg-modal__custom-footer">
                  {footer}
                </div>
              )}

              {actions && (
                <div className="dg-modal__actions">
                  {actions}
                </div>
              )}

              {(secondaryAction || primaryAction) && (
                <div className="dg-modal__actions">
                  {secondaryAction &&
                    renderAction(
                      secondaryAction,
                      "secondary"
                    )}

                  {primaryAction &&
                    renderAction(
                      primaryAction,
                      "primary"
                    )}
                </div>
              )}
            </footer>
          )}
        </div>
      </div>
    );
  }
);

Modal.displayName = "Modal";

export default Modal;