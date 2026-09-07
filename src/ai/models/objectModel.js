import {
  ObjectDetector,
  FilesetResolver,
} from "@mediapipe/tasks-vision";

/*
 * MediaPipe Tasks Vision WASM files.
 *
 * IMPORTANT:
 * Do NOT use:
 * new URL("@mediapipe/tasks-vision/wasm", import.meta.url)
 *
 * Vite cannot resolve "./wasm" from the package exports.
 */
const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float32/1/efficientdet_lite0.tflite";

let objectModel = null;
let loadingPromise = null;

let lastVideoTime = -1;
let lastResult = null;

let status = "unavailable";

export const OBJECT_MODEL_STATUS = {
  UNAVAILABLE: "unavailable",
  LOADING: "loading",
  READY: "ready",
  ERROR: "error",
};

export const getObjectModelStatus = () => {
  return status;
};

/**
 * Load MediaPipe Object Detector
 */
export const loadObjectModel = async () => {
  // Already loaded
  if (objectModel) {
    return objectModel;
  }

  // Already loading
  if (loadingPromise) {
    return loadingPromise;
  }

  status = OBJECT_MODEL_STATUS.LOADING;

  loadingPromise = (async () => {
    try {
      /*
       * Create MediaPipe Vision resolver
       */
      const vision = await FilesetResolver.forVisionTasks(WASM_URL);

      /*
       * First try GPU
       */
      try {
        objectModel = await ObjectDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: "GPU",
          },

          runningMode: "VIDEO",
          maxResults: 10,
          scoreThreshold: 0.35,
        });

        status = OBJECT_MODEL_STATUS.READY;

        console.log("Daily Goal object model loaded with GPU");

        return objectModel;
      } catch (gpuError) {
        /*
         * GPU failed.
         * Try CPU instead.
         */
        console.warn(
          "Daily Goal GPU object detector failed. Falling back to CPU.",
          gpuError
        );

        objectModel = await ObjectDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_URL,
            delegate: "CPU",
          },

          runningMode: "VIDEO",
          maxResults: 10,
          scoreThreshold: 0.35,
        });

        status = OBJECT_MODEL_STATUS.READY;

        console.log("Daily Goal object model loaded with CPU");

        return objectModel;
      }
    } catch (error) {
      status = OBJECT_MODEL_STATUS.ERROR;

      console.error(
        "Daily Goal object model failed to load:",
        error
      );

      throw error;
    } finally {
      loadingPromise = null;
    }
  })();

  return loadingPromise;
};

/**
 * Detect objects from video
 */
export const detectObjects = async (videoElement) => {
  const timestamp = Date.now();

  /*
   * Video not ready
   */
  if (
    !videoElement ||
    videoElement.readyState < 2
  ) {
    return {
      detected: false,
      confidence: 0,
      objects: [],
      personCount: 0,
      phoneDetected: false,
      status: "not_detected",
      timestamp,
    };
  }

  /*
   * Load model
   */
  const model = await loadObjectModel();

  /*
   * Only run detection when video frame changes.
   */
  if (videoElement.currentTime !== lastVideoTime) {
    lastResult = model.detectForVideo(
      videoElement,
      timestamp
    );

    lastVideoTime = videoElement.currentTime;
  }

  /*
   * Convert MediaPipe detections
   * into a simpler structure.
   */
  const objects = (lastResult?.detections || []).map(
    (detection) => {
      const category = detection.categories?.[0];

      return {
        label:
          category?.categoryName ||
          "object",

        confidence:
          category?.score ||
          0,

        box: (() => {
          const box = detection.boundingBox;
          if (!box) return null;
          const vw = videoElement.videoWidth || 1;
          const vh = videoElement.videoHeight || 1;
          return {
            x: (box.originX || 0) / vw,
            y: (box.originY || 0) / vh,
            width: (box.width || 0) / vw,
            height: (box.height || 0) / vh,
          };
        })(),
      };
    }
  );

  /*
   * Detect persons
   */
  const persons = objects.filter(
    (object) =>
      object.label.toLowerCase() === "person"
  );

  /*
   * Detect mobile phones
   */
  const phones = objects.filter((object) => {
    const label = object.label.toLowerCase();

    return (
      label === "cell phone" ||
      label === "mobile phone" ||
      label === "phone"
    );
  });

  return {
    detected: objects.length > 0,

    confidence:
      objects[0]?.confidence || 0,

    objects,

    personCount: persons.length,

    phoneDetected: phones.length > 0,

    status: "detected",

    timestamp,
  };
};

/**
 * Reset / close object detector
 */
export const resetObjectModel = () => {
  try {
    objectModel?.close?.();
  } catch (error) {
    console.warn(
      "Failed to close Daily Goal object model:",
      error
    );
  }

  objectModel = null;
  loadingPromise = null;

  lastVideoTime = -1;
  lastResult = null;

  status = OBJECT_MODEL_STATUS.UNAVAILABLE;
};