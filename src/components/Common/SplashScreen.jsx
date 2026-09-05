import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  BrainCircuit,
  Camera,
  Check,
  Eye,
  Focus,
  Sparkles,
  Target,
} from "lucide-react";
import "./SplashScreen.css";

const DEFAULT_STEPS = [
  {
    id: "interface",
    label: "Preparing your workspace",
    icon: Sparkles,
  },
  {
    id: "focus",
    label: "Initializing focus system",
    icon: Focus,
  },
  {
    id: "ai",
    label: "Preparing AI monitoring",
    icon: BrainCircuit,
  },
  {
    id: "camera",
    label: "Checking camera environment",
    icon: Camera,
  },
  {
    id: "goal",
    label: "Setting up your Daily Goal",
    icon: Target,
  },
];

const clamp = (value, min, max) =>
  Math.min(Math.max(value, min), max);

const normalizeSteps = (steps) => {
  if (!Array.isArray(steps) || steps.length === 0) {
    return DEFAULT_STEPS;
  }

  return steps.map((step, index) => ({
    id: step?.id ?? `step-${index}`,
    label: step?.label ?? `Preparing step ${index + 1}`,
    icon: step?.icon ?? Sparkles,
  }));
};

const SplashScreen = ({
  open = true,

  logo = null,
  logoAlt = "Daily Goal",

  brandName = "DAILY GOAL",
  tagline = "Study Smarter. Stay Focused. Grow Every Day.",

  steps = DEFAULT_STEPS,

  duration = 2600,
  minimumDuration = 1600,

  autoComplete = true,
  showProgress = true,
  showStatus = true,
  showSteps = true,
  showSkip = false,

  skipLabel = "Skip",
  loadingLabel = "Getting things ready",

  onComplete,
  onSkip,

  className = "",

  animated = true,
  particles = true,
  showOrbit = true,
  showRadar = true,

  theme = "default",
}) => {
  const normalizedSteps = useMemo(
    () => normalizeSteps(steps),
    [steps]
  );

  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [exiting, setExiting] = useState(false);
  const [completed, setCompleted] = useState(false);

  const startTimeRef = useRef(null);
  const animationFrameRef = useRef(null);
  const completionTimerRef = useRef(null);
  const exitTimerRef = useRef(null);
  const completedRef = useRef(false);

  const finish = useCallback(
    (reason = "complete") => {
      if (completedRef.current) return;

      completedRef.current = true;

      setCompleted(true);
      setProgress(100);
      setCurrentStep(normalizedSteps.length - 1);

      setExiting(true);

      exitTimerRef.current = window.setTimeout(() => {
        onComplete?.(reason);
      }, 650);
    },
    [normalizedSteps.length, onComplete]
  );

  useEffect(() => {
    if (!open) return undefined;

    completedRef.current = false;

    setProgress(0);
    setCurrentStep(0);
    setExiting(false);
    setCompleted(false);

    startTimeRef.current = performance.now();

    if (!animated) {
      setProgress(100);

      if (autoComplete) {
        completionTimerRef.current = window.setTimeout(() => {
          finish("complete");
        }, Math.max(0, minimumDuration));
      }

      return () => {
        if (completionTimerRef.current) {
          clearTimeout(completionTimerRef.current);
        }

        if (exitTimerRef.current) {
          clearTimeout(exitTimerRef.current);
        }
      };
    }

    const totalDuration = Math.max(
      minimumDuration,
      duration
    );

    const animate = (now) => {
      const elapsed = now - startTimeRef.current;

      const rawProgress = clamp(
        elapsed / totalDuration,
        0,
        1
      );

      /*
       * Smooth ease-out curve:
       * fast start → controlled middle → soft finish.
       */
      const easedProgress =
        1 - Math.pow(1 - rawProgress, 3);

      const nextProgress = Math.round(
        easedProgress * 100
      );

      setProgress(nextProgress);

      const stepIndex = clamp(
        Math.floor(
          (nextProgress / 100) *
            normalizedSteps.length
        ),
        0,
        normalizedSteps.length - 1
      );

      setCurrentStep(stepIndex);

      if (rawProgress < 1) {
        animationFrameRef.current =
          requestAnimationFrame(animate);
      } else if (autoComplete) {
        finish("complete");
      }
    };

    animationFrameRef.current =
      requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(
          animationFrameRef.current
        );
      }

      if (completionTimerRef.current) {
        clearTimeout(completionTimerRef.current);
      }

      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
      }
    };
  }, [
    open,
    duration,
    minimumDuration,
    autoComplete,
    animated,
    normalizedSteps.length,
    finish,
  ]);

  const handleSkip = () => {
    onSkip?.();

    finish("skip");
  };

  if (!open) {
    return null;
  }

  const activeStep =
    normalizedSteps[
      clamp(
        currentStep,
        0,
        normalizedSteps.length - 1
      )
    ];

  const ActiveIcon =
    activeStep?.icon || Sparkles;

  const classes = [
    "dg-splash",
    exiting ? "dg-splash--exiting" : "",
    completed ? "dg-splash--completed" : "",
    !animated ? "dg-splash--static" : "",
    theme !== "default"
      ? `dg-splash--${theme}`
      : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section
      className={classes}
      aria-label="Daily Goal loading screen"
      aria-busy={!completed}
    >
      {/* =================================================
          BACKGROUND
         ================================================= */}

      <div className="dg-splash__background">
        <div className="dg-splash__gradient dg-splash__gradient--one" />
        <div className="dg-splash__gradient dg-splash__gradient--two" />
        <div className="dg-splash__gradient dg-splash__gradient--three" />

        <div className="dg-splash__grid" />
        <div className="dg-splash__noise" />

        {showRadar ? (
          <div className="dg-splash__radar">
            <span />
            <span />
            <span />
          </div>
        ) : null}
      </div>

      {/* =================================================
          PARTICLES
         ================================================= */}

      {particles ? (
        <div className="dg-splash__particles" aria-hidden="true">
          {Array.from({ length: 18 }).map((_, index) => (
            <span
              key={index}
              className="dg-splash__particle"
              style={{
                "--particle-index": index,
              }}
            />
          ))}
        </div>
      ) : null}

      {/* =================================================
          MAIN CONTENT
         ================================================= */}

      <div className="dg-splash__content">

        {/* Brand */}
        <div className="dg-splash__brand">
          <div className="dg-splash__brand-mark">

            {logo ? (
              <img
                src={logo}
                alt={logoAlt}
                className="dg-splash__logo"
              />
            ) : (
              <div className="dg-splash__logo-fallback">
                <span className="dg-splash__logo-d">
                  D
                </span>

                <span className="dg-splash__logo-target">
                  <Target size={26} />
                </span>
              </div>
            )}

            <span className="dg-splash__logo-glow" />

            <span className="dg-splash__logo-ring dg-splash__logo-ring--one" />
            <span className="dg-splash__logo-ring dg-splash__logo-ring--two" />

          </div>

          <div className="dg-splash__brand-text">

            <h1 className="dg-splash__title">
              {brandName}
            </h1>

            <p className="dg-splash__tagline">
              {tagline}
            </p>

          </div>

        </div>

        {/* =================================================
            AI ORBIT
           ================================================= */}

        {showOrbit ? (
          <div
            className="dg-splash__orbit-system"
            aria-hidden="true"
          >
            <div className="dg-splash__orbit dg-splash__orbit--outer" />
            <div className="dg-splash__orbit dg-splash__orbit--middle" />
            <div className="dg-splash__orbit dg-splash__orbit--inner" />

            <div className="dg-splash__orbit-dot dg-splash__orbit-dot--one" />
            <div className="dg-splash__orbit-dot dg-splash__orbit-dot--two" />
            <div className="dg-splash__orbit-dot dg-splash__orbit-dot--three" />

            <div className="dg-splash__core">
              <div className="dg-splash__core-inner">
                <Eye size={25} />
              </div>
            </div>
          </div>
        ) : null}

        {/* =================================================
            STATUS
           ================================================= */}

        {showStatus ? (
          <div className="dg-splash__status">

            <span className="dg-splash__status-icon">
              {completed ? (
                <Check size={15} />
              ) : (
                <ActiveIcon size={15} />
              )}
            </span>

            <span className="dg-splash__status-text">
              {completed
                ? "Ready to focus"
                : activeStep?.label || loadingLabel}
            </span>

            {!completed ? (
              <span className="dg-splash__status-dots">
                <i />
                <i />
                <i />
              </span>
            ) : null}

          </div>
        ) : null}

        {/* =================================================
            PROGRESS
           ================================================= */}

        {showProgress ? (
          <div className="dg-splash__progress-section">

            <div className="dg-splash__progress-header">

              <span>
                {loadingLabel}
              </span>

              <strong>
                {progress}%
              </strong>

            </div>

            <div
              className="dg-splash__progress"
              role="progressbar"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow={progress}
              aria-label={loadingLabel}
            >
              <span
                className="dg-splash__progress-value"
                style={{
                  transform: `scaleX(${progress / 100})`,
                }}
              />

              <span className="dg-splash__progress-glow" />
            </div>

          </div>
        ) : null}

        {/* =================================================
            STEP INDICATORS
           ================================================= */}

        {showSteps ? (
          <div className="dg-splash__steps">

            {normalizedSteps.map((step, index) => {
              const StepIcon =
                step.icon || Sparkles;

              const isActive =
                index === currentStep &&
                !completed;

              const isComplete =
                completed ||
                index < currentStep;

              return (
                <div
                  key={step.id}
                  className={[
                    "dg-splash__step",
                    isActive
                      ? "is-active"
                      : "",
                    isComplete
                      ? "is-complete"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span className="dg-splash__step-icon">
                    {isComplete ? (
                      <Check size={12} />
                    ) : (
                      <StepIcon size={12} />
                    )}
                  </span>

                  <span className="dg-splash__step-line" />
                </div>
              );
            })}

          </div>
        ) : null}

        {/* =================================================
            SKIP
           ================================================= */}

        {showSkip && !completed ? (
          <button
            type="button"
            className="dg-splash__skip"
            onClick={handleSkip}
          >
            {skipLabel}
          </button>
        ) : null}

      </div>

      {/* Bottom decorative line */}
      <div className="dg-splash__bottom-line">
        <span />
      </div>
    </section>
  );
};

export default SplashScreen;