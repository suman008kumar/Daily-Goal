import { useCallback, useEffect, useRef, useState } from "react";
import { analyzeCameraFrame, cloudAIConfig } from "../services/cloudAIService";

const INTERVAL = 6000;

export const captureFrame = (video) => {
  if (!video || video.readyState < 2 || video.videoWidth <= 0 || video.videoHeight <= 0) return null;

  const maxWidth = 640;
  const width = Math.min(maxWidth, video.videoWidth);
  const height = Math.max(1, Math.round(width * (video.videoHeight / video.videoWidth)));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return null;

  try {
    ctx.drawImage(video, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", 0.72);
  } catch (error) {
    console.warn("[Daily Goal AI] Camera frame capture failed", error);
    return null;
  }
};

export default function useCloudVisionAI({ videoRef, enabled = false, focusScore = 0, attention = "unknown" } = {}) {
  const [result, setResult] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState("");
  const busyRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const analyzeNow = useCallback(async () => {
    if (!enabled || busyRef.current || (!cloudAIConfig.hasGemini && !cloudAIConfig.hasGroq)) return null;

    const video = videoRef?.current;
    if (!video || video.readyState < 2 || video.videoWidth <= 0 || video.videoHeight <= 0) {
      if (mountedRef.current) setError("Camera frame is not ready.");
      return null;
    }

    const dataUrl = captureFrame(video);
    if (!dataUrl) {
      if (mountedRef.current) setError("Camera frame could not be captured.");
      return null;
    }

    busyRef.current = true;
    if (mountedRef.current) {
      setIsAnalyzing(true);
      setError("");
    }

    try {
      const next = await analyzeCameraFrame(dataUrl, { focusScore, attention });
      if (mountedRef.current) setResult(next);
      return next;
    } catch (e) {
      if (mountedRef.current) setError(e?.message || "AI provider temporarily unavailable.");
      return null;
    } finally {
      busyRef.current = false;
      if (mountedRef.current) setIsAnalyzing(false);
    }
  }, [attention, enabled, focusScore, videoRef]);

  useEffect(() => {
    if (!enabled) {
      busyRef.current = false;
      setIsAnalyzing(false);
      return undefined;
    }

    let cancelled = false;
    const startWhenReady = async () => {
      const video = videoRef?.current;
      if (!video) return;
      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0 && !cancelled) {
        await analyzeNow();
      }
    };

    const timer = window.setTimeout(startWhenReady, 500);
    const interval = window.setInterval(() => {
      if (!cancelled) analyzeNow();
    }, INTERVAL);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, [analyzeNow, enabled, videoRef]);

  useEffect(() => {
    if (!enabled) {
      setResult(null);
      setError("");
    }
  }, [enabled]);

  return {
    result,
    isAnalyzing,
    error,
    configured: cloudAIConfig.hasGemini || cloudAIConfig.hasGroq,
    provider: result?.provider || "",
    analyzeNow,
    intervalMs: INTERVAL,
  };
}
