import {
  FOCUS_LEVELS,
  FOCUS_THRESHOLDS,
  SCORE_SMOOTHING,
  DEFAULT_CONFIDENCE,
} from "./constants";

/**
 * Keeps a score inside the valid 0–100 range.
 */
export const clampScore = (
  score,
  minimum = FOCUS_THRESHOLDS.minimum,
  maximum = FOCUS_THRESHOLDS.maximum
) => {
  const value = Number(score);

  if (!Number.isFinite(value)) {
    return minimum;
  }

  return Math.min(
    maximum,
    Math.max(minimum, value)
  );
};

/**
 * Converts a confidence value into a 0–100 percentage.
 *
 * Supports:
 * 0.94 -> 94
 * 94   -> 94
 */
export const confidenceToPercentage = (
  confidence = DEFAULT_CONFIDENCE
) => {
  const value = Number(confidence);

  if (!Number.isFinite(value)) {
    return 0;
  }

  const normalized = value <= 1
    ? value * 100
    : value;

  return clampScore(normalized);
};

/**
 * Converts percentage into normalized 0–1 confidence.
 */
export const percentageToConfidence = (
  percentage = 0
) => {
  return clampScore(percentage) / 100;
};

/**
 * Returns focus level from score.
 */
export const getFocusLevel = (score = 0) => {
  const value = clampScore(score);

  if (value >= FOCUS_THRESHOLDS.excellent) {
    return FOCUS_LEVELS.EXCELLENT;
  }

  if (value >= FOCUS_THRESHOLDS.good) {
    return FOCUS_LEVELS.GOOD;
  }

  if (value >= FOCUS_THRESHOLDS.needsAttention) {
    return FOCUS_LEVELS.NEEDS_ATTENTION;
  }

  return FOCUS_LEVELS.LOW;
};

/**
 * Returns a machine-readable focus status.
 */
export const getFocusStatus = (score = 0) => {
  const value = clampScore(score);

  if (value >= FOCUS_THRESHOLDS.excellent) {
    return "excellent";
  }

  if (value >= FOCUS_THRESHOLDS.good) {
    return "good";
  }

  if (value >= FOCUS_THRESHOLDS.needsAttention) {
    return "needs_attention";
  }

  return "low";
};

/**
 * Returns a complete focus-score description.
 */
export const getFocusScoreMeta = (score = 0) => {
  const normalizedScore = clampScore(score);

  return {
    score: normalizedScore,
    level: getFocusLevel(normalizedScore),
    status: getFocusStatus(normalizedScore),
    percentage: normalizedScore,
    isExcellent:
      normalizedScore >= FOCUS_THRESHOLDS.excellent,
    isGood:
      normalizedScore >= FOCUS_THRESHOLDS.good,
    needsAttention:
      normalizedScore < FOCUS_THRESHOLDS.good &&
      normalizedScore >= FOCUS_THRESHOLDS.needsAttention,
    isLow:
      normalizedScore < FOCUS_THRESHOLDS.needsAttention,
  };
};

/**
 * Smooths a changing score to avoid UI jumping.
 *
 * factor:
 * 0 = keep previous score
 * 1 = immediately use current score
 */
export const smoothScore = (
  previousScore = 0,
  currentScore = 0,
  factor = SCORE_SMOOTHING.defaultFactor
) => {
  const safePrevious = clampScore(previousScore);
  const safeCurrent = clampScore(currentScore);

  const safeFactor = Math.min(
    SCORE_SMOOTHING.maximumFactor,
    Math.max(
      SCORE_SMOOTHING.minimumFactor,
      Number(factor) || 0
    )
  );

  return safePrevious +
    (safeCurrent - safePrevious) * safeFactor;
};

/**
 * Calculates weighted score.
 *
 * Example:
 * {
 *   face: 1,
 *   eyes: 1,
 *   attention: 0.8
 * }
 *
 * weights:
 * {
 *   face: 0.15,
 *   eyes: 0.15,
 *   attention: 0.70
 * }
 */
export const calculateWeightedScore = (
  values = {},
  weights = {}
) => {
  const entries = Object.entries(weights);

  if (!entries.length) {
    return 0;
  }

  let weightedTotal = 0;
  let totalWeight = 0;

  entries.forEach(([key, weight]) => {
    const numericWeight = Number(weight);

    if (
      !Number.isFinite(numericWeight) ||
      numericWeight <= 0
    ) {
      return;
    }

    const rawValue = Number(values[key]);

    if (!Number.isFinite(rawValue)) {
      return;
    }

    const normalizedValue =
      rawValue > 1
        ? clampScore(rawValue) / 100
        : Math.max(0, Math.min(1, rawValue));

    weightedTotal += normalizedValue * numericWeight;
    totalWeight += numericWeight;
  });

  if (totalWeight <= 0) {
    return 0;
  }

  return clampScore(
    (weightedTotal / totalWeight) * 100
  );
};

/**
 * Calculates average score from an array.
 */
export const calculateAverageScore = (
  scores = []
) => {
  if (!Array.isArray(scores) || scores.length === 0) {
    return 0;
  }

  const validScores = scores
    .map(Number)
    .filter(Number.isFinite)
    .map(clampScore);

  if (!validScores.length) {
    return 0;
  }

  const total = validScores.reduce(
    (sum, score) => sum + score,
    0
  );

  return total / validScores.length;
};

/**
 * Calculates score change.
 */
export const calculateScoreChange = (
  currentScore = 0,
  previousScore = 0
) => {
  return clampScore(currentScore) -
    clampScore(previousScore);
};

/**
 * Returns score trend.
 */
export const getScoreTrend = (
  currentScore = 0,
  previousScore = 0
) => {
  const difference = calculateScoreChange(
    currentScore,
    previousScore
  );

  if (difference > 0) {
    return "up";
  }

  if (difference < 0) {
    return "down";
  }

  return "stable";
};

/**
 * Converts score into a rounded integer.
 */
export const roundScore = (score = 0) => {
  return Math.round(clampScore(score));
};

/**
 * Calculates percentage from completed and target values.
 */
export const calculatePercentage = (
  completed = 0,
  target = 0
) => {
  const safeCompleted = Math.max(0, Number(completed) || 0);
  const safeTarget = Math.max(0, Number(target) || 0);

  if (safeTarget <= 0) {
    return 0;
  }

  return clampScore(
    (safeCompleted / safeTarget) * 100
  );
};

/**
 * Calculates remaining amount.
 */
export const calculateRemaining = (
  target = 0,
  completed = 0
) => {
  return Math.max(
    0,
    (Number(target) || 0) -
      (Number(completed) || 0)
  );
};

/**
 * Calculates activity percentage.
 */
export const calculateActivityPercentage = (
  value = 0,
  total = 0
) => {
  const safeValue = Math.max(0, Number(value) || 0);
  const safeTotal = Math.max(0, Number(total) || 0);

  if (safeTotal <= 0) {
    return 0;
  }

  return clampScore(
    (safeValue / safeTotal) * 100
  );
};

/**
 * Converts an analysis status into a score.
 *
 * Useful for AI detector output.
 */
export const statusToScore = (
  status,
  scoreMap = {}
) => {
  if (
    status &&
    Object.prototype.hasOwnProperty.call(scoreMap, status)
  ) {
    return clampScore(scoreMap[status]);
  }

  return 0;
};

/**
 * Safely gets detector confidence.
 */
export const getDetectorConfidence = (
  detector = {}
) => {
  return confidenceToPercentage(
    detector?.confidence ?? DEFAULT_CONFIDENCE
  );
};

/**
 * Creates score information suitable for cards/charts.
 */
export const createScoreSummary = (
  score = 0
) => {
  const meta = getFocusScoreMeta(score);

  return {
    ...meta,
    rounded: roundScore(meta.score),
    label: meta.level,
  };
};

/**
 * Creates a trend object for dashboard UI.
 */
export const createScoreTrend = (
  currentScore = 0,
  previousScore = 0
) => {
  const current = clampScore(currentScore);
  const previous = clampScore(previousScore);
  const change = current - previous;

  return {
    current,
    previous,
    change,
    roundedChange: Math.round(change),
    direction: getScoreTrend(current, previous),
  };
};

export default {
  clampScore,
  confidenceToPercentage,
  percentageToConfidence,
  getFocusLevel,
  getFocusStatus,
  getFocusScoreMeta,
  smoothScore,
  calculateWeightedScore,
  calculateAverageScore,
  calculateScoreChange,
  getScoreTrend,
  roundScore,
  calculatePercentage,
  calculateRemaining,
  calculateActivityPercentage,
  statusToScore,
  getDetectorConfidence,
  createScoreSummary,
  createScoreTrend,
};