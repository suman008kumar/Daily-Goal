import { detectFaceStatus } from "./detectors/faceDetector";
import { detectEyes } from "./detectors/eyeDetector";
import { detectPhone } from "./detectors/phoneDetector";
import { detectPosture } from "./detectors/postureDetector";
import { detectAttention } from "./detectors/attentionDetector";
import { detectDrowsiness, resetDrowsiness } from "./detectors/drowsinessDetector";
import { detectObjects } from "./models/objectModel";

export const AI_MODES = { LIVE: "LIVE", DEMO: "DEMO" };

const unavailable = (type, message = "unavailable") => ({
  type,
  detected: null,
  confidence: 0,
  status: "unavailable",
  message,
  timestamp: Date.now(),
});

const safeDetect = async (fn, type) => {
  try {
    return await fn();
  } catch (error) {
    console.warn(`Daily Goal ${type} detector unavailable`, error);
    return unavailable(type, error?.message || "Detector unavailable");
  }
};

class AIEngine {
  constructor() {
    this.mode = AI_MODES.DEMO;
    this.isRunning = false;
    this.lastAnalysis = null;
    this.lastAnalysisTime = 0;
    this.analysisInterval = 420;
  }

  setMode(mode) {
    if (Object.values(AI_MODES).includes(mode)) this.mode = mode;
  }

  getMode() {
    return this.mode;
  }

  start() {
    this.isRunning = true;
  }

  stop() {
    this.isRunning = false;
    this.lastAnalysis = null;
    this.lastAnalysisTime = 0;
    resetDrowsiness();
  }

  reset() {
    this.stop();
  }

  async analyze(video) {
    if (!this.isRunning || this.mode !== AI_MODES.LIVE) return null;
    if (!video || video.readyState < 2 || !video.videoWidth || !video.videoHeight) return null;

    const now = Date.now();
    if (now - this.lastAnalysisTime < this.analysisInterval) {
      return this.lastAnalysis;
    }

    this.lastAnalysisTime = now;

    // Face/pose/object models can work from the same current video frame.
    // Keep their failures isolated so one unavailable model does not disable all live AI.
    const [face, objects, posture] = await Promise.all([
      safeDetect(() => detectFaceStatus(video), "face"),
      safeDetect(() => detectObjects(video), "objects"),
      safeDetect(() => detectPosture(video), "posture"),
    ]);

    const eyes = await safeDetect(() => detectEyes(video, face), "eyes");
    const phone = await safeDetect(() => detectPhone(video, objects), "phone");
    const attention = await safeDetect(
      () => detectAttention({ face, eyes, posture, phone }),
      "attention"
    );
    const drowsiness = await safeDetect(
      () => detectDrowsiness({ eyes, attention }),
      "drowsiness"
    );

    const result = {
      mode: this.mode,
      timestamp: Date.now(),
      face,
      eyes,
      phone,
      posture,
      attention,
      drowsiness,
      objects: {
        ...objects,
        multiplePeople: Number(objects?.personCount || 0) > 1,
      },
    };

    const detectorResults = [face, eyes, posture, attention, drowsiness, objects, phone];
    const available = detectorResults.some((item) => item?.status !== "unavailable");
    result.error = !available;
    result.errorMessage = !available ? "Live AI detectors are unavailable." : "";
    this.lastAnalysis = result;
    return result;
  }
}

export const aiEngine = new AIEngine();
export default aiEngine;
