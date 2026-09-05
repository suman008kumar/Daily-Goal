import React, {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation } from "react-router-dom";
import "./PageTransition.css";

const TRANSITION_MODES = {
  cinematic: "cinematic",
  fade: "fade",
  slide: "slide",
  zoom: "zoom",
  blur: "blur",
  reveal: "reveal",
};

const DIRECTIONS = {
  forward: "forward",
  backward: "backward",
  up: "up",
  down: "down",
  none: "none",
};

const normalizeValue = (value, allowed, fallback) =>
  allowed[value] || fallback;

const getPathKey = (location) =>
  `${location.pathname}${location.search}${location.hash}`;

const PageTransition = ({
  children,

  mode = "fade",
  direction = "forward",

  duration = 360,
  delay = 0,

  stagger = true,
  staggerDelay = 28,

  animateChildren = true,

  appear = true,
  exit = false,

  loading = false,

  onEnter,
  onEntered,
  onExit,
  onExited,

  className = "",
  pageClassName = "",

  routeAware = true,

  locationKey,
  triggerKey,

  disabled = false,

  keepMounted = true,

  ...rest
}) => {
  const routerLocation = useLocation();

  const activeLocationKey =
    locationKey ||
    (routeAware ? getPathKey(routerLocation) : triggerKey || "page");

  const previousKeyRef = useRef(activeLocationKey);
  const firstRenderRef = useRef(true);

  const [transitionKey, setTransitionKey] =
    useState(activeLocationKey);

  const [phase, setPhase] = useState(
    disabled ? "entered" : appear ? "entering" : "entered"
  );

  const [mounted, setMounted] = useState(true);

  const normalizedMode = normalizeValue(
    mode,
    TRANSITION_MODES,
    TRANSITION_MODES.cinematic
  );

  const normalizedDirection = normalizeValue(
    direction,
    DIRECTIONS,
    DIRECTIONS.forward
  );

  const safeDuration = Math.max(
    0,
    Number(duration) || 0
  );

  const safeDelay = Math.max(
    0,
    Number(delay) || 0
  );

  const safeStaggerDelay = Math.max(
    0,
    Number(staggerDelay) || 0
  );

  const childArray = useMemo(
    () => Children.toArray(children),
    [children]
  );

  useEffect(() => {
    if (disabled) {
      setPhase("entered");
      return undefined;
    }

    if (firstRenderRef.current) {
      firstRenderRef.current = false;

      if (!appear) {
        setPhase("entered");
        return undefined;
      }

      onEnter?.();

      const timer = window.setTimeout(() => {
        setPhase("entered");
        onEntered?.();
      }, safeDuration + safeDelay);

      return () => window.clearTimeout(timer);
    }

    if (previousKeyRef.current === activeLocationKey) {
      return undefined;
    }

    previousKeyRef.current = activeLocationKey;

    let enterTimer;
    let exitTimer;

    const runTransition = () => {
      onExit?.();

      setPhase(exit ? "exiting" : "entering");

      if (exit) {
        exitTimer = window.setTimeout(() => {
          if (!keepMounted) {
            setMounted(false);
          }

          onExited?.();

          setTransitionKey(activeLocationKey);
          setMounted(true);
          setPhase("entering");

          enterTimer = window.setTimeout(() => {
            setPhase("entered");
            onEntered?.();
          }, safeDuration + safeDelay);
        }, safeDuration);
      } else {
        setTransitionKey(activeLocationKey);
        setPhase("entering");

        enterTimer = window.setTimeout(() => {
          setPhase("entered");
          onEntered?.();
        }, safeDuration + safeDelay);
      }
    };

    if (safeDelay > 0) {
      const delayTimer = window.setTimeout(
        runTransition,
        safeDelay
      );

      return () => {
        window.clearTimeout(delayTimer);
        window.clearTimeout(exitTimer);
        window.clearTimeout(enterTimer);
      };
    }

    runTransition();

    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(enterTimer);
    };
  }, [
    activeLocationKey,
    disabled,
    appear,
    exit,
    keepMounted,
    safeDelay,
    safeDuration,
    onEnter,
    onEntered,
    onExit,
    onExited,
  ]);

  useEffect(() => {
    if (!loading && phase === "entering") {
      const timer = window.setTimeout(() => {
        setPhase("entered");
        onEntered?.();
      }, safeDuration);

      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [
    loading,
    phase,
    safeDuration,
    onEntered,
  ]);

  const wrapperClasses = [
    "dg-page-transition",
    `dg-page-transition--${normalizedMode}`,
    `dg-page-transition--${normalizedDirection}`,
    `dg-page-transition--${phase}`,
    stagger && animateChildren
      ? "dg-page-transition--stagger"
      : "",
    loading
      ? "dg-page-transition--loading"
      : "",
    disabled
      ? "dg-page-transition--disabled"
      : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const renderedChildren = animateChildren
    ? childArray.map((child, index) => {
        if (!isValidElement(child)) {
          return child;
        }

        return cloneElement(child, {
          className: [
            child.props.className,
            "dg-page-transition__item",
          ]
            .filter(Boolean)
            .join(" "),
          style: {
            ...child.props.style,
            "--page-item-index": index,
            "--page-item-delay": `${
              safeDelay +
              index * safeStaggerDelay
            }ms`,
          },
        });
      })
    : children;

  if (!mounted && !keepMounted) {
    return null;
  }

  return (
    <div
      key={transitionKey}
      className={wrapperClasses}
      style={{
        "--page-transition-duration": `${safeDuration}ms`,
        "--page-transition-delay": `${safeDelay}ms`,
        "--page-stagger-delay": `${safeStaggerDelay}ms`,
      }}
      data-page-transition={normalizedMode}
      data-transition-phase={phase}
      {...rest}
    >
      <div
        className={[
          "dg-page-transition__viewport",
          pageClassName,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="dg-page-transition__ambient" />

        <div className="dg-page-transition__scanline" />

        <div className="dg-page-transition__content">
          {renderedChildren}
        </div>

        {loading ? (
          <div
            className="dg-page-transition__loading"
            aria-hidden="true"
          >
            <span className="dg-page-transition__loading-ring" />
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default PageTransition;