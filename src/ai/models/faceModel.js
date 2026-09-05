import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

let landmarker = null;
let loadingPromise = null;
let lastVideoTime = -1;
let lastResult = null;

export const FACE_MODEL_STATUS = { UNAVAILABLE:"unavailable", LOADING:"loading", READY:"ready", ERROR:"error" };
let status = FACE_MODEL_STATUS.UNAVAILABLE;

const confidenceFromLandmarks = (landmarks) => {
  if (!Array.isArray(landmarks) || !landmarks.length) return 0;
  const valid = landmarks.filter((point) => Number.isFinite(point?.x) && Number.isFinite(point?.y));
  if (!valid.length) return 0;
  const completeness = Math.min(1, valid.length / 468);
  const xs = valid.map((point) => point.x);
  const ys = valid.map((point) => point.y);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  const geometryQuality = Math.min(1, Math.max(0, Math.min(width / 0.45, height / 0.55)));
  return Math.min(0.99, 0.55 * completeness + 0.45 * geometryQuality);
};

export const getFaceModelStatus = () => status;

export const loadFaceModel = async () => {
  if (landmarker) return landmarker;
  if (loadingPromise) return loadingPromise;
  status = FACE_MODEL_STATUS.LOADING;
  loadingPromise = (async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(WASM_URL);
      landmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
        runningMode: "VIDEO",
        numFaces: 2,
        minFaceDetectionConfidence: 0.55,
        minFacePresenceConfidence: 0.55,
        minTrackingConfidence: 0.55,
        outputFaceBlendshapes: true,
      });
      status = FACE_MODEL_STATUS.READY;
      return landmarker;
    } catch (gpuError) {
      try {
        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
          runningMode: "VIDEO",
          numFaces: 2,
          minFaceDetectionConfidence: 0.55,
          minFacePresenceConfidence: 0.55,
          minTrackingConfidence: 0.55,
          outputFaceBlendshapes: true,
        });
        status = FACE_MODEL_STATUS.READY;
        return landmarker;
      } catch (error) {
        status = FACE_MODEL_STATUS.ERROR;
        console.warn("Daily Goal face model failed to load", error);
        throw error;
      }
    } finally { loadingPromise = null; }
  })();
  return loadingPromise;
};

export const detectFace = async (videoElement) => {
  const timestamp = Date.now();
  if (!videoElement || videoElement.readyState < 2) return { detected:false, confidence:0, status:"not_detected", landmarks:[], faceCount:0, timestamp };
  const model = await loadFaceModel();
  if (videoElement.currentTime !== lastVideoTime) {
    lastResult = model.detectForVideo(videoElement, timestamp);
    lastVideoTime = videoElement.currentTime;
  }
  const faces = lastResult?.faceLandmarks || [];
  return { detected:faces.length>0, confidence:confidenceFromLandmarks(faces[0]), status:faces.length>0?"detected":"not_detected", landmarks:faces[0]||[], faceCount:faces.length, blendshapes:lastResult?.faceBlendshapes?.[0]?.categories||[], timestamp };
};

export const resetFaceModel = () => { landmarker?.close?.(); landmarker=null; loadingPromise=null; lastVideoTime=-1; lastResult=null; status=FACE_MODEL_STATUS.UNAVAILABLE; };
