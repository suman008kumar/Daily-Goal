import { detectFace } from "../models/faceModel";

export const detectFaceStatus = async (videoElement) => {
  const result = await detectFace(videoElement);

  return {
    type: "FACE",
    detected: result.detected,
    confidence: result.confidence,
    status: result.status,
    timestamp: result.timestamp,
    landmarks: result.landmarks || [],
    faceCount: result.faceCount || 0,
    blendshapes: result.blendshapes || [],
  };
};

export default detectFaceStatus;