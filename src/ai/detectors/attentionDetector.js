export const detectAttention = async ({ face, eyes, posture, phone } = {}) => {
  const timestamp = Date.now();
  if (!face?.detected) {
    return { type: "ATTENTION", focused: false, confidence: 0, status: "face_missing", timestamp };
  }

  const head = String(posture?.headPosition || "unknown").toLowerCase();
  const away = ["turned_left", "turned_right", "turned"].includes(head);
  const phoneDetected = phone?.phoneDetected === true;
  const eyesKnown = typeof eyes?.eyesOpen === "boolean";
  const focused = eyesKnown && eyes.eyesOpen && !away && !phoneDetected;

  const signals = [
    Number(face?.confidence) || 0,
    eyesKnown ? Number(eyes?.confidence) || 0 : 0,
    Number(posture?.confidence) || 0,
  ].filter((value) => value > 0);
  const confidence = signals.length
    ? Math.min(1, signals.reduce((sum, value) => sum + value, 0) / signals.length)
    : 0;

  return {
    type: "ATTENTION",
    focused,
    confidence,
    status: phoneDetected ? "distracted" : away ? "looking_away" : focused ? "focused" : "distracted",
    timestamp,
  };
};
export default detectAttention;
