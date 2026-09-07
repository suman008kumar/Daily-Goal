import React, { useMemo } from "react";
import "./FaceDetectionOverlay.css";

const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

export default function FaceDetectionOverlay({ analysis, mirrored = true }) {
  const face = analysis?.face;
  const landmarks = face?.landmarks || [];
  const objects = analysis?.objects?.objects || [];

  const box = useMemo(() => {
    if (!landmarks.length) return null;
    const xs = landmarks.map((p) => clamp01(p?.x));
    const ys = landmarks.map((p) => clamp01(p?.y));
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const padX = Math.min(0.04, Math.max(0.012, (maxX - minX) * 0.08));
    const padY = Math.min(0.05, Math.max(0.018, (maxY - minY) * 0.10));
    return {
      x: Math.max(0, minX - padX),
      y: Math.max(0, minY - padY),
      w: Math.min(1, maxX + padX) - Math.max(0, minX - padX),
      h: Math.min(1, maxY + padY) - Math.max(0, minY - padY),
    };
  }, [landmarks]);

  const phoneBoxes = objects.filter((item) => {
    const label = String(item?.label || "").toLowerCase();
    return ["cell phone", "mobile phone", "phone"].includes(label) && item?.box;
  });

  if (!face?.detected && !phoneBoxes.length) return null;

  return (
    <svg
      className="dg-face-overlay"
      viewBox="0 0 1 1"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <filter id="dgFaceGlow">
          <feGaussianBlur stdDeviation="0.008" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {box && (
        <g className="dg-face-box" filter="url(#dgFaceGlow)">
          <rect x={mirrored ? 1 - box.x - box.w : box.x} y={box.y} width={box.w} height={box.h} rx="0.012" />
          <circle cx={mirrored ? 1 - (box.x + box.w / 2) : box.x + box.w / 2} cy={box.y} r="0.006" />
        </g>
      )}

      {landmarks.filter((_, index) => index % 8 === 0).map((point, index) => (
        <circle
          key={index}
          className="dg-face-point"
          cx={mirrored ? 1 - clamp01(point.x) : clamp01(point.x)}
          cy={clamp01(point.y)}
          r="0.0032"
        />
      ))}

      {phoneBoxes.map((item, index) => {
        const b = item.box;
        return (
          <rect
            key={`phone-${index}`}
            className="dg-phone-box"
            x={mirrored ? 1 - Number(b.x || 0) - Number(b.width || 0) : Number(b.x || 0)}
            y={Number(b.y || 0)}
            width={Number(b.width || 0)}
            height={Number(b.height || 0)}
            rx="0.01"
          />
        );
      })}
    </svg>
  );
}
