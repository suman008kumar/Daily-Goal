import { detectPose } from "../models/poseModel";

export const detectPosture = async (
  video
) => {
  const result =
    await detectPose(video);

  let status = "unknown";

  if (
    result?.status ===
    "unavailable"
  ) {
    status = "unavailable";
  } else if (
    result?.status === "error"
  ) {
    status = "unavailable";
  } else if (
    result?.posture === "good"
  ) {
    status = "good";
  } else if (
    result?.posture ===
    "needs_attention"
  ) {
    status = "needs_attention";
  } else {
    status = "unknown";
  }

  return {
    type: "POSTURE",

    detected:
      result?.detected ?? false,

    confidence:
      Number(result?.confidence) || 0,

    posture:
      result?.posture || "unknown",

    headPosition:
      result?.headPosition || "unknown",

    status,

    timestamp:
      result?.timestamp || 0,
  };
};

export default detectPosture;