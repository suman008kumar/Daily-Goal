import { useCallback, useEffect, useRef, useState } from "react";
import aiEngine, { AI_MODES } from "../ai/AIEngine";
import { calculateFocusScore, smoothFocusScore } from "../ai/focusScore";

const LIVE_INTERVAL = 450;
const DEMO_INTERVAL = 1200;

const randomBetween = (min, max) => Math.round(Math.random() * (max - min) + min);

const createDemoAnalysis = () => {
  const now = Date.now();
  const phoneDetected = Math.random() < 0.06;
  const eyesClosed = Math.random() < 0.05;
  const lookingAway = Math.random() < 0.08;
  const drowsy = Math.random() < 0.035;
  const faceMissing = Math.random() < 0.025;
  const postureNeedsAttention = Math.random() < 0.12;
  const multiplePeople = Math.random() < 0.015;
  const faceDetected = !faceMissing;

  return {
    mode: AI_MODES.DEMO,
    timestamp: now,
    face: { type: "FACE", detected: faceDetected, confidence: faceDetected ? randomBetween(92, 99) / 100 : 0, status: faceDetected ? "detected" : "not_detected", timestamp: now },
    eyes: { type: "EYES", detected: faceDetected, eyesOpen: faceDetected ? !eyesClosed : null, confidence: faceDetected ? randomBetween(90, 98) / 100 : 0, status: !faceDetected ? "not_detected" : eyesClosed ? "closed" : "open", timestamp: now },
    phone: { type: "PHONE", detected: phoneDetected, phoneDetected, confidence: phoneDetected ? randomBetween(88, 98) / 100 : 0, status: phoneDetected ? "detected" : "not_detected", timestamp: now },
    posture: { type: "POSTURE", detected: faceDetected, confidence: faceDetected ? randomBetween(84, 96) / 100 : 0, posture: faceDetected ? (postureNeedsAttention ? "needs_attention" : "good") : "unknown", headPosition: faceDetected ? (lookingAway ? "turned" : "centered") : "unknown", status: faceDetected ? (postureNeedsAttention ? "needs_attention" : "good") : "not_detected", timestamp: now },
    attention: { type: "ATTENTION", focused: faceDetected && !eyesClosed && !lookingAway && !phoneDetected, confidence: faceDetected ? randomBetween(86, 97) / 100 : 0, status: !faceDetected ? "not_detected" : lookingAway ? "looking_away" : phoneDetected ? "distracted" : "focused", timestamp: now },
    drowsiness: { type: "DROWSINESS", drowsy: faceDetected ? drowsy : null, confidence: faceDetected ? randomBetween(86, 97) / 100 : 0, status: !faceDetected ? "not_detected" : drowsy ? "drowsy" : "normal", timestamp: now },
    objects: { personCount: multiplePeople ? 2 : faceDetected ? 1 : 0, multiplePeople, timestamp: now, status: "detected" },
  };
};

export const useAI = ({ videoRef, enabled = true, initialMode = AI_MODES.DEMO } = {}) => {
  const [mode, setModeState] = useState(initialMode);
  const [analysis, setAnalysis] = useState(null);
  const [focusScore, setFocusScore] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const previousScoreRef = useRef(0);
  const mountedRef = useRef(true);
  const analyzingRef = useRef(false);

  const setMode = useCallback((nextMode) => {
    if (!Object.values(AI_MODES).includes(nextMode)) return;
    setModeState(nextMode);
    aiEngine.setMode(nextMode);
    previousScoreRef.current = 0;
  }, []);

  const analyze = useCallback(async () => {
    if (!enabled || !mountedRef.current || analyzingRef.current) return;
    analyzingRef.current = true;
    setIsAnalyzing(true);

    try {
      let result = null;
      if (mode === AI_MODES.DEMO) {
        result = createDemoAnalysis();
      } else {
        result = await aiEngine.analyze(videoRef?.current);
      }

      if (!result) return;

      const calculated = calculateFocusScore(result);
      const nextScore = smoothFocusScore(previousScoreRef.current, calculated.score, 0.28);
      previousScoreRef.current = nextScore;

      if (mountedRef.current) {
        setAnalysis(result);
        setFocusScore(nextScore);
        setError(result.error ? result.errorMessage : "");
      }
    } catch (aiError) {
      console.warn("Daily Goal AI error:", aiError);
      if (mountedRef.current) setError("AI analysis is temporarily unavailable.");
    } finally {
      analyzingRef.current = false;
      if (mountedRef.current) setIsAnalyzing(false);
    }
  }, [enabled, mode, videoRef]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    aiEngine.setMode(mode);
    if (!enabled) {
      aiEngine.stop();
      return undefined;
    }

    aiEngine.start();
    analyze();
    const interval = window.setInterval(analyze, mode === AI_MODES.LIVE ? LIVE_INTERVAL : DEMO_INTERVAL);

    return () => {
      window.clearInterval(interval);
      aiEngine.stop();
      analyzingRef.current = false;
    };
  }, [enabled, mode, analyze]);

  const reset = useCallback(() => {
    setAnalysis(null);
    setFocusScore(0);
    setError("");
    previousScoreRef.current = 0;
    aiEngine.reset();
  }, []);

  return {
    mode,
    setMode,
    analysis,
    focusScore,
    isAnalyzing,
    error,
    isDemoMode: mode === AI_MODES.DEMO,
    isLiveMode: mode === AI_MODES.LIVE,
    analyze,
    reset,
  };
};

export default useAI;
