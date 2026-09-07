import {
  detectFaceStatus,
} from "./detectors/faceDetector";

import {
  detectEyes,
} from "./detectors/eyeDetector";

import {
  detectPhone,
} from "./detectors/phoneDetector";

import {
  detectPosture,
} from "./detectors/postureDetector";

import {
  detectAttention,
} from "./detectors/attentionDetector";

import {
  detectDrowsiness,
  resetDrowsiness,
} from "./detectors/drowsinessDetector";

import {
  detectObjects,
  getObjectModelStatus,
} from "./models/objectModel";

import {
  getFaceModelStatus,
} from "./models/faceModel";

import {
  getPoseModelStatus,
} from "./models/poseModel";

/* =========================================================
   AI MODES
========================================================= */

export const AI_MODES = {
  LIVE: "LIVE",
  DEMO: "DEMO",
};

/* =========================================================
   UNAVAILABLE RESULT
========================================================= */

const unavailable = (
  type,
  message = "unavailable"
) => ({
  type,

  detected: null,

  confidence: 0,

  status: "unavailable",

  message,

  timestamp: Date.now(),
});

/* =========================================================
   SAFE DETECTOR
========================================================= */

const safeDetect = async (
  fn,
  type
) => {
  try {
    const result =
      await fn();

    return (
      result || {
        ...unavailable(type),
      }
    );
  } catch (error) {
    console.warn(
      `Daily Goal ${type} detector unavailable`,
      error
    );

    return unavailable(
      type,
      error?.message ||
        "Detector unavailable"
    );
  }
};

/* =========================================================
   AI ENGINE
========================================================= */

class AIEngine {
  constructor() {
    this.mode =
      AI_MODES.DEMO;

    this.isRunning = false;

    this.lastAnalysis = null;

    this.lastAnalysisTime = 0;

    /*
     * Target approximately 2-3 analyses per second.
     *
     * Individual MediaPipe models can take longer,
     * so use the busy flag below as an additional guard.
     */
    this.analysisInterval = 450;

    /*
     * Prevent overlapping analyze() calls.
     */
    this.analysisInProgress = false;
  }

  /* =======================================================
     MODE
  ======================================================= */

  setMode(mode) {
    if (
      Object.values(AI_MODES).includes(
        mode
      )
    ) {
      /*
       * If mode changes, invalidate the old
       * analysis timing.
       */
      if (this.mode !== mode) {
        this.lastAnalysis = null;
        this.lastAnalysisTime = 0;
      }

      this.mode = mode;
    }
  }

  getMode() {
    return this.mode;
  }

  /* =======================================================
     HEALTH
  ======================================================= */

  getHealth() {
    return {
      face:
        getFaceModelStatus(),

      posture:
        getPoseModelStatus(),

      objects:
        getObjectModelStatus(),
    };
  }

  /* =======================================================
     START
  ======================================================= */

  start() {
    this.isRunning = true;
  }

  /* =======================================================
     STOP
  ======================================================= */

  stop() {
    this.isRunning = false;

    this.lastAnalysis = null;

    this.lastAnalysisTime = 0;

    this.analysisInProgress = false;

    resetDrowsiness();
  }

  /* =======================================================
     RESET
  ======================================================= */

  reset() {
    this.stop();
  }

  /* =======================================================
     ANALYZE
  ======================================================= */

  async analyze(video) {
    /*
     * Engine must be running.
     */
    if (
      !this.isRunning ||
      this.mode !== AI_MODES.LIVE
    ) {
      return null;
    }

    /*
     * Validate video.
     */
    if (
      !video ||
      video.readyState < 2 ||
      !video.videoWidth ||
      !video.videoHeight
    ) {
      return null;
    }

    /*
     * Prevent overlapping analysis cycles.
     */
    if (this.analysisInProgress) {
      return this.lastAnalysis;
    }

    const now =
      Date.now();

    /*
     * Rate limit.
     */
    if (
      now -
        this.lastAnalysisTime <
      this.analysisInterval
    ) {
      return this.lastAnalysis;
    }

    /*
     * Lock immediately.
     */
    this.analysisInProgress =
      true;

    this.lastAnalysisTime =
      now;

    try {
      /*
       * Face, object and posture detectors can operate
       * independently.
       *
       * Pose detector itself has an internal lock, so
       * MediaPipe will never receive overlapping pose
       * frames.
       */
      const [
        face,
        objects,
        posture,
      ] = await Promise.all([
        safeDetect(
          () =>
            detectFaceStatus(
              video
            ),
          "face"
        ),

        safeDetect(
          () =>
            detectObjects(
              video
            ),
          "objects"
        ),

        safeDetect(
          () =>
            detectPosture(
              video
            ),
          "posture"
        ),
      ]);

      /*
       * Eye analysis uses face result.
       */
      const eyes =
        await safeDetect(
          () =>
            detectEyes(
              video,
              face
            ),
          "eyes"
        );

      /*
       * Phone detection uses object result.
       */
      const phone =
        await safeDetect(
          () =>
            detectPhone(
              video,
              objects
            ),
          "phone"
        );

      /*
       * Attention uses local detector results.
       */
      const attention =
        await safeDetect(
          () =>
            detectAttention({
              face,
              eyes,
              posture,
              phone,
            }),
          "attention"
        );

      /*
       * Drowsiness uses eye + attention results.
       */
      const drowsiness =
        await safeDetect(
          () =>
            detectDrowsiness({
              eyes,
              attention,
            }),
          "drowsiness"
        );

      /*
       * Make final result.
       */
      const result = {
        mode: this.mode,

        timestamp:
          Date.now(),

        face,

        eyes,

        phone,

        posture,

        attention,

        drowsiness,

        objects: {
          ...(objects || {}),

          multiplePeople:
            Number(
              objects?.personCount || 0
            ) > 1,
        },
      };

      /*
       * Determine whether at least one detector
       * is working.
       */
      const detectorResults = [
        face,
        eyes,
        posture,
        attention,
        drowsiness,
        objects,
        phone,
      ];

      const available =
        detectorResults.some(
          (item) =>
            item?.status !==
            "unavailable"
        );

      result.error =
        !available;

      result.errorMessage =
        !available
          ? "Live AI detectors are unavailable."
          : "";

      /*
       * Save final result.
       */
      this.lastAnalysis =
        result;

      return result;
    } catch (error) {
      /*
       * The whole AI engine should never crash because
       * of one detector.
       */
      console.warn(
        "Daily Goal AI engine analysis failed:",
        error
      );

      return (
        this.lastAnalysis || {
          mode: this.mode,

          timestamp:
            Date.now(),

          error: true,

          errorMessage:
            "Live AI analysis is temporarily unavailable.",
        }
      );
    } finally {
      /*
       * ALWAYS release the analysis lock.
       */
      this.analysisInProgress =
        false;
    }
  }
}

/* =========================================================
   SINGLETON
========================================================= */

export const aiEngine =
  new AIEngine();

export default aiEngine;