/**
 * Daily Goal
 * Focus Score Engine
 *
 * Calculates Focus Score from AI detection results.
 *
 * Weight:
 *
 * Face         15%
 * Eyes         15%
 * Attention    25%
 * Phone        20%
 * Posture      10%
 * Drowsiness   10%
 * Desk         5%
 *
 * Total        100%
 */

export const FOCUS_WEIGHTS = {
  face: 0.15,
  eyes: 0.15,
  attention: 0.25,
  phone: 0.20,
  posture: 0.10,
  drowsiness: 0.10,
  desk: 0.05,
};

const clamp = (value, min = 0, max = 100) =>
  Math.min(Math.max(value, min), max);

const confidenceToScore = (confidence) =>
  clamp(Number(confidence || 0) * 100);

const getFaceScore = (face) => {
  if (!face || face.status === "unavailable") {
    return null;
  }

  if (face.detected === false) {
    return 0;
  }

  if (face.detected === true) {
    return confidenceToScore(face.confidence);
  }

  return null;
};

const getEyeScore = (eyes) => {
  if (!eyes || eyes.status === "unavailable") {
    return null;
  }

  if (eyes.eyesOpen === false) {
    return 0;
  }

  if (eyes.eyesOpen === true) {
    return confidenceToScore(eyes.confidence);
  }

  return null;
};

const getAttentionScore = (attention) => {
  if (
    !attention ||
    attention.status === "unavailable"
  ) {
    return null;
  }

  if (attention.focused === false) {
    return 0;
  }

  if (attention.focused === true) {
    return confidenceToScore(
      attention.confidence
    );
  }

  return null;
};

const getPhoneScore = (phone) => {
  if (!phone || phone.status === "unavailable") {
    return null;
  }

  if (phone.phoneDetected === true) {
    return 0;
  }

  if (phone.phoneDetected === false) {
    return 100;
  }

  return null;
};

const getPostureScore = (posture) => {
  if (
    !posture ||
    posture.status === "unavailable"
  ) {
    return null;
  }

  if (posture.status === "good") {
    return confidenceToScore(
      posture.confidence
    );
  }

  if (posture.status === "needs_attention") {
    return 45;
  }

  return null;
};

const getDrowsinessScore = (drowsiness) => {
  if (
    !drowsiness ||
    drowsiness.status === "unavailable"
  ) {
    return null;
  }

  if (drowsiness.drowsy === true) {
    return 0;
  }

  if (drowsiness.drowsy === false) {
    return confidenceToScore(
      drowsiness.confidence
    );
  }

  return null;
};

const getDeskScore = (analysis) => {
  if (!analysis) {
    return null;
  }

  const personCount =
    Number(
      analysis?.objects?.personCount
    );

  if (Number.isFinite(personCount)) {
    if (personCount === 1) {
      return 100;
    }

    if (personCount === 0) {
      return 0;
    }

    return 30;
  }

  if (analysis?.face?.detected === true) {
    return 100;
  }

  if (analysis?.face?.detected === false) {
    return 0;
  }

  return null;
};

const calculateWeightedScore = (scores) => {
  let weightedTotal = 0;
  let availableWeight = 0;

  Object.entries(FOCUS_WEIGHTS).forEach(
    ([key, weight]) => {
      const score = scores[key];

      if (
        typeof score === "number" &&
        Number.isFinite(score)
      ) {
        weightedTotal += score * weight;
        availableWeight += weight;
      }
    }
  );

  if (availableWeight === 0) {
    return 0;
  }

  return weightedTotal / availableWeight;
};

export const getFocusLevel = (score) => {
  if (score >= 90) {
    return {
      label: "Excellent",
      status: "excellent",
    };
  }

  if (score >= 75) {
    return {
      label: "Good",
      status: "good",
    };
  }

  if (score >= 60) {
    return {
      label: "Needs Attention",
      status: "attention",
    };
  }

  return {
    label: "Low Focus",
    status: "low",
  };
};

export const calculateFocusScore = (
  analysis = {}
) => {
  const scores = {
    face: getFaceScore(
      analysis.face
    ),

    eyes: getEyeScore(
      analysis.eyes
    ),

    attention: getAttentionScore(
      analysis.attention
    ),

    phone: getPhoneScore(
      analysis.phone
    ),

    posture: getPostureScore(
      analysis.posture
    ),

    drowsiness: getDrowsinessScore(
      analysis.drowsiness
    ),

    desk: getDeskScore(
      analysis
    ),
  };

  const rawScore =
    calculateWeightedScore(scores);

  const score = Math.round(
    clamp(rawScore)
  );

  const level =
    getFocusLevel(score);

  return {
    score,
    rawScore,
    level: level.label,
    status: level.status,
    breakdown: scores,
    weights: FOCUS_WEIGHTS,
    timestamp: Date.now(),
  };
};

export const smoothFocusScore = (
  previousScore,
  nextScore,
  smoothing = 0.2
) => {
  const previous = Number(
    previousScore
  );

  const next = Number(nextScore);

  if (!Number.isFinite(next)) {
    return Number.isFinite(previous)
      ? previous
      : 0;
  }

  if (!Number.isFinite(previous)) {
    return next;
  }

  const factor = clamp(
    smoothing,
    0,
    1
  );

  return Math.round(
    previous +
      (next - previous) * factor
  );
};

export const getFocusScoreColorStatus = (
  score
) => {
  const numericScore = clamp(
    Number(score) || 0
  );

  if (numericScore >= 90) {
    return "excellent";
  }

  if (numericScore >= 75) {
    return "good";
  }

  if (numericScore >= 60) {
    return "attention";
  }

  return "low";
};

export default calculateFocusScore;