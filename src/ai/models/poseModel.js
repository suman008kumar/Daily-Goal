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

/*
 * MediaPipe detectForVideo() expects a timestamp in milliseconds.
 *
 * DO NOT use Date.now() here.
 * Date.now() is an epoch timestamp and can become too large
 * for MediaPipe's internal timestamp range.
 *
 * performance.now() is monotonic and starts from a small value.
 */
const getNowMs = () => performance.now();

/* =========================================================
   MODEL STATE
========================================================= */

let poseModel = null;
let loadingPromise = null;

let lastVideoTime = -1;
let lastResult = null;

/*
 * Last timestamp sent to MediaPipe.
 *
 * Start at -1 so the first timestamp is always valid.
 */
let lastTimestamp = -1;

/*
 * Prevent two detectForVideo() calls from hitting the
 * same MediaPipe graph simultaneously.
 */
let detectionInProgress = false;

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

export const getPoseModelStatus = () => status;

/* =========================================================
   SAFE TIMESTAMP
========================================================= */

const getSafeTimestamp = () => {
  let timestamp = Math.floor(getNowMs());

  /*
   * MediaPipe VIDEO mode requires strictly increasing
   * timestamps.
   */
  if (timestamp <= lastTimestamp) {
    timestamp = lastTimestamp + 1;
  }

  lastTimestamp = timestamp;

  return timestamp;
};

/* =========================================================
   EMPTY RESULT
========================================================= */

const createEmptyResult = ({
  status: resultStatus = "not_detected",
  timestamp = lastTimestamp,
  error = "",
} = {}) => ({
  detected: false,
  confidence: 0,
  status: resultStatus,
  posture: "unknown",
  headPosition: "unknown",
  landmarks: [],
  personCount: 0,
  timestamp,
  ...(error ? { error } : {}),
});

/* =========================================================
   LOAD POSE MODEL
========================================================= */

export const loadPoseModel = async () => {
  /*
   * Already loaded.
   */
  if (poseModel) {
    return poseModel;
  }

  /*
   * Already loading.
   */
  if (loadingPromise) {
    return loadingPromise;
  }

  status = POSE_MODEL_STATUS.LOADING;

  loadingPromise = (async () => {
    let vision = null;

    try {
      /*
       * Create MediaPipe Vision resolver.
       */
      vision =
        await FilesetResolver.forVisionTasks(
          WASM_URL
        );

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

        status =
          POSE_MODEL_STATUS.READY;

        console.log(
          "Daily Goal pose model loaded with GPU"
        );

        return poseModel;
      } catch (gpuError) {
        /*
         * GPU failed.
         *
         * Close any partially-created GPU instance
         * before creating CPU instance.
         */
        console.warn(
          "Daily Goal GPU pose model failed. Falling back to CPU.",
          gpuError
        );

        try {
          poseModel?.close?.();
        } catch {
          // Ignore cleanup failure.
        }

        poseModel = null;

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

        status =
          POSE_MODEL_STATUS.READY;

        console.log(
          "Daily Goal pose model loaded with CPU"
        );

        return poseModel;
      }
    } catch (error) {
      status =
        POSE_MODEL_STATUS.ERROR;

      poseModel = null;

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
   READ POSE RESULT
========================================================= */

const buildPoseResult = (
  result,
  timestamp
) => {
  const poses =
    result?.landmarks || [];

  const lm =
    poses[0] || [];

  /*
   * MediaPipe Pose landmark indexes:
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

  let headPosition =
    "centered";

  if (centerX < 0.38) {
    headPosition =
      "turned_left";
  } else if (centerX > 0.62) {
    headPosition =
      "turned_right";
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
    const visiblePoints =
      lm.filter(
        (p) =>
          typeof p?.visibility ===
          "number"
      );

    if (visiblePoints.length > 0) {
      const totalVisibility =
        visiblePoints.reduce(
          (sum, p) =>
            sum +
            p.visibility,
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
    detected:
      poses.length > 0,

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

    timestamp,
  };
};

/* =========================================================
   DETECT POSE
========================================================= */

export const detectPose = async (
  videoElement
) => {
  /*
   * Validate video.
   */
  if (
    !videoElement ||
    videoElement.readyState < 2 ||
    !videoElement.videoWidth ||
    !videoElement.videoHeight
  ) {
    return createEmptyResult({
      status: "not_detected",
    });
  }

  /*
   * Prevent duplicate concurrent calls.
   */
  if (detectionInProgress) {
    if (lastResult) {
      return lastResult;
    }

    return createEmptyResult({
      status: "processing",
    });
  }

  /*
   * Load model.
   */
  let model;

  try {
    model =
      await loadPoseModel();
  } catch (error) {
    return createEmptyResult({
      status: "error",
      error:
        error?.message ||
        "Pose model failed to load.",
    });
  }

  /*
   * Model may have been closed while loading.
   */
  if (!model) {
    return createEmptyResult({
      status: "unavailable",
      error:
        "Pose model is unavailable.",
    });
  }

  /*
   * Prevent processing the exact same video frame.
   *
   * currentTime can remain unchanged between camera frames,
   * so don't send the same frame repeatedly.
   */
  const currentVideoTime =
    Number(videoElement.currentTime);

  if (
    Number.isFinite(currentVideoTime) &&
    currentVideoTime === lastVideoTime &&
    lastResult
  ) {
    return lastResult;
  }

  /*
   * Mark detection as busy BEFORE calling MediaPipe.
   */
  detectionInProgress = true;

  /*
   * Generate timestamp only for the frame actually
   * sent to MediaPipe.
   */
  const timestamp =
    getSafeTimestamp();

  try {
    /*
     * IMPORTANT:
     *
     * detectForVideo() is synchronous in the current
     * MediaPipe Tasks Vision API.
     *
     * Do NOT add Promise.all around this call.
     */
    const result =
      model.detectForVideo(
        videoElement,
        timestamp
      );

    /*
     * Only mark this video frame as processed after
     * MediaPipe successfully accepted it.
     */
    lastVideoTime =
      currentVideoTime;

    lastResult =
      buildPoseResult(
        result,
        timestamp
      );

    return lastResult;
  } catch (error) {
    console.error(
      "Daily Goal pose detection failed:",
      error
    );

    /*
     * If MediaPipe graph fails, don't keep returning
     * the broken result forever.
     *
     * We allow the next analysis cycle to try again.
     */
    lastVideoTime = -1;

    return createEmptyResult({
      status: "error",
      timestamp,
      error:
        error?.message ||
        "Pose detection failed.",
    });
  } finally {
    detectionInProgress = false;
  }
};

/* =========================================================
   RESET MODEL
========================================================= */

export const resetPoseModel = () => {
  /*
   * Prevent any stale detection state from surviving
   * camera/session restart.
   */
  detectionInProgress = false;

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
   * IMPORTANT:
   * performance.now() starts from a small monotonic value,
   * so reset back to -1.
   */
  lastTimestamp = -1;

  status =
    POSE_MODEL_STATUS.UNAVAILABLE;
};

/* =========================================================
   OPTIONAL DEBUG INFO
========================================================= */

export const getPoseDebugState = () => ({
  loaded: Boolean(poseModel),

  loading: Boolean(loadingPromise),

  detectionInProgress,

  lastVideoTime,

  lastTimestamp,

  status,
});