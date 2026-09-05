import {
  PoseLandmarker,
  FilesetResolver,
} from "@mediapipe/tasks-vision";

/* =========================================================
   CONFIG
========================================================= */

const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

/* =========================================================
   MODEL STATE
========================================================= */

let poseModel = null;
let loadingPromise = null;

let lastVideoTime = -1;
let lastResult = null;

/*
 * MediaPipe VIDEO mode requires timestamps to be
 * strictly monotonically increasing.
 */
let lastTimestamp = 0;

let status = "unavailable";

/* =========================================================
   STATUS
========================================================= */

export const POSE_MODEL_STATUS = {
  UNAVAILABLE: "unavailable",
  LOADING: "loading",
  READY: "ready",
  ERROR: "error",
};

export const getPoseModelStatus = () => {
  return status;
};

/* =========================================================
   TIMESTAMP
========================================================= */

/**
 * Returns a timestamp that is ALWAYS greater than
 * the previous timestamp.
 *
 * MediaPipe VIDEO mode requires strictly increasing
 * timestamps.
 */
const getSafeTimestamp = () => {
  const now = Date.now();

  if (now <= lastTimestamp) {
    lastTimestamp = lastTimestamp + 1;
  } else {
    lastTimestamp = now;
  }

  return lastTimestamp;
};

/* =========================================================
   LOAD POSE MODEL
========================================================= */

export const loadPoseModel = async () => {
  /*
   * Already loaded
   */
  if (poseModel) {
    return poseModel;
  }

  /*
   * Already loading
   */
  if (loadingPromise) {
    return loadingPromise;
  }

  status = POSE_MODEL_STATUS.LOADING;

  loadingPromise = (async () => {
    try {
      /*
       * Create MediaPipe Vision resolver
       */
      const vision =
        await FilesetResolver.forVisionTasks(WASM_URL);

      /* =====================================================
         GPU
      ===================================================== */

      try {
        poseModel =
          await PoseLandmarker.createFromOptions(
            vision,
            {
              baseOptions: {
                modelAssetPath: MODEL_URL,
                delegate: "GPU",
              },

              runningMode: "VIDEO",

              numPoses: 2,

              minPoseDetectionConfidence: 0.5,
              minPosePresenceConfidence: 0.5,
              minTrackingConfidence: 0.5,
            }
          );

        status = POSE_MODEL_STATUS.READY;

        console.log(
          "Daily Goal pose model loaded with GPU"
        );

        return poseModel;
      } catch (gpuError) {
        /*
         * GPU failed.
         * Automatically fall back to CPU.
         */
        console.warn(
          "Daily Goal GPU pose model failed. Falling back to CPU.",
          gpuError
        );

        /* ===================================================
           CPU
        =================================================== */

        poseModel =
          await PoseLandmarker.createFromOptions(
            vision,
            {
              baseOptions: {
                modelAssetPath: MODEL_URL,
                delegate: "CPU",
              },

              runningMode: "VIDEO",

              numPoses: 2,

              minPoseDetectionConfidence: 0.5,
              minPosePresenceConfidence: 0.5,
              minTrackingConfidence: 0.5,
            }
          );

        status = POSE_MODEL_STATUS.READY;

        console.log(
          "Daily Goal pose model loaded with CPU"
        );

        return poseModel;
      }
    } catch (error) {
      status = POSE_MODEL_STATUS.ERROR;

      console.error(
        "Daily Goal pose model failed to load:",
        error
      );

      throw error;
    } finally {
      loadingPromise = null;
    }
  })();

  return loadingPromise;
};

/* =========================================================
   LANDMARK HELPER
========================================================= */

const point = (p) => {
  if (!p) {
    return null;
  }

  return {
    x: p.x,
    y: p.y,
    z: p.z,
    visibility: p.visibility,
  };
};

/* =========================================================
   DETECT POSE
========================================================= */

export const detectPose = async (videoElement) => {
  /*
   * Generate timestamp only when we are actually
   * going to process a video frame.
   */
  if (
    !videoElement ||
    videoElement.readyState < 2
  ) {
    return {
      detected: false,
      confidence: 0,
      status: "not_detected",
      posture: "unknown",
      headPosition: "unknown",
      landmarks: [],
      personCount: 0,
      timestamp: 0,
    };
  }

  /*
   * Load model
   */
  const model = await loadPoseModel();

  /*
   * Prevent processing the exact same video frame.
   */
  if (
    videoElement.currentTime !== lastVideoTime
  ) {
    /*
     * IMPORTANT:
     * Generate a strictly increasing MediaPipe timestamp.
     */
    const timestamp = getSafeTimestamp();

    try {
      lastResult = model.detectForVideo(
        videoElement,
        timestamp
      );

      lastVideoTime =
        videoElement.currentTime;
    } catch (error) {
      console.error(
        "Daily Goal pose detection failed:",
        error
      );

      /*
       * Do not destroy the model because of one
       * bad frame.
       */
      return {
        detected: false,
        confidence: 0,
        status: "error",
        posture: "unknown",
        headPosition: "unknown",
        landmarks: [],
        personCount: 0,
        timestamp,
        error: error?.message || "Pose detection failed",
      };
    }
  }

  /* =======================================================
     READ RESULTS
  ======================================================= */

  const poses =
    lastResult?.landmarks || [];

  const lm =
    poses[0] || [];

  /*
   * MediaPipe Pose landmark indexes
   *
   * 0  = Nose
   * 11 = Left Shoulder
   * 12 = Right Shoulder
   * 23 = Left Hip
   * 24 = Right Hip
   */

  const nose = lm[0];

  const leftShoulder =
    lm[11];

  const rightShoulder =
    lm[12];

  const leftHip =
    lm[23];

  const rightHip =
    lm[24];

  /* =======================================================
     HEAD POSITION
  ======================================================= */

  const centerX =
    nose?.x ?? 0.5;

  let headPosition = "centered";

  if (centerX < 0.38) {
    headPosition = "turned_left";
  } else if (centerX > 0.62) {
    headPosition = "turned_right";
  }

  /* =======================================================
     POSTURE
  ======================================================= */

  let posture = "unknown";

  if (
    leftShoulder &&
    rightShoulder &&
    leftHip &&
    rightHip
  ) {
    const shoulderY =
      (
        leftShoulder.y +
        rightShoulder.y
      ) / 2;

    const hipY =
      (
        leftHip.y +
        rightHip.y
      ) / 2;

    posture =
      hipY - shoulderY > 0.16
        ? "good"
        : "needs_attention";
  }

  /* =======================================================
     CONFIDENCE
  ======================================================= */

  let confidence = 0;

  if (poses.length > 0) {
    /*
     * PoseLandmarker does not always expose one simple
     * overall confidence value, so use landmark visibility
     * where available.
     */
    const visiblePoints = lm.filter(
      (p) =>
        typeof p?.visibility === "number"
    );

    if (visiblePoints.length > 0) {
      const totalVisibility =
        visiblePoints.reduce(
          (sum, p) =>
            sum + p.visibility,
          0
        );

      confidence =
        totalVisibility /
        visiblePoints.length;
    } else {
      confidence = 0.9;
    }
  }

  /* =======================================================
     RETURN
  ======================================================= */

  return {
    detected: poses.length > 0,

    confidence,

    status:
      poses.length > 0
        ? "detected"
        : "not_detected",

    posture,

    headPosition,

    landmarks:
      lm.map(point),

    personCount:
      poses.length,

    /*
     * Return current safe timestamp.
     */
    timestamp: lastTimestamp,
  };
};

/* =========================================================
   RESET MODEL
========================================================= */

export const resetPoseModel = () => {
  try {
    poseModel?.close?.();
  } catch (error) {
    console.warn(
      "Failed to close Daily Goal pose model:",
      error
    );
  }

  poseModel = null;
  loadingPromise = null;

  lastVideoTime = -1;
  lastResult = null;

  /*
   * Reset timestamp as well.
   */
  lastTimestamp = 0;

  status =
    POSE_MODEL_STATUS.UNAVAILABLE;
};