import React, { useEffect, useMemo, useRef, useState } from "react";
import { Activity, BarChart3, CalendarDays, ChevronDown } from "lucide-react";
import "./FocusChart.css";

const clamp = (n) => Math.max(0, Math.min(100, Number(n) || 0));
const getScore = (item) => clamp(item?.score ?? item?.value ?? item?.focusScore ?? item?.focus);
const getLabel = (item, i) => item?.label ?? item?.name ?? item?.time ?? item?.date ?? `Point ${i + 1}`;

export default function FocusChart({ data = [], chartData, period = "daily", onPeriodChange, title = "Focus Performance", subtitle = "Track your real focus activity over time.", emptyMessage = "Complete a study session or start live monitoring to build your focus trend.", score = 0 }) {
  const source = chartData ?? data;
  const [selectedPeriod, setSelectedPeriod] = useState(period);
  const [active, setActive] = useState(null);
  const svgRef = useRef(null);
  useEffect(() => setSelectedPeriod(period), [period]);

  const points = useMemo(() => {
    if (!Array.isArray(source)) return [];
    return source.map((item, index) => ({ label: getLabel(item, index), value: getScore(item) })).filter((item) => Number.isFinite(item.value));
  }, [source]);

  const livePoint = Number(score) > 0 && (!points.length || points[points.length - 1]?.label !== "Now") ? { label: "Now", value: clamp(score) } : null;
  const allPoints = livePoint ? [...points, livePoint] : points;

  const width = 900;
  const height = 320;
  const pad = { top: 28, right: 28, bottom: 48, left: 46 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const coords = useMemo(() => allPoints.map((p, i) => ({ ...p, x: pad.left + (allPoints.length === 1 ? innerW / 2 : (i / (allPoints.length - 1)) * innerW), y: pad.top + ((100 - p.value) / 100) * innerH })), [allPoints]);
  const line = coords.map((p, i) => `${i ? "L" : "M"} ${p.x} ${p.y}`).join(" ");
  const area = coords.length ? `${line} L ${coords.at(-1).x} ${height - pad.bottom} L ${coords[0].x} ${height - pad.bottom} Z` : "";

  const changePeriod = (event) => {
    const next = event.target.value;
    setSelectedPeriod(next);
    onPeriodChange?.(next);
  };

  return (
    <section className="focus-chart" ref={svgRef}>
      <header className="focus-chart__header">
        <div className="focus-chart__heading">
          <span className="focus-chart__icon"><BarChart3 size={18} /></span>
          <div><div className="focus-chart__title-row"><h2>{title}</h2>{allPoints.length > 0 && <span className="focus-chart__live-dot"><span />LIVE DATA</span>}</div><p>{subtitle}</p></div>
        </div>
        <label className="focus-chart__period"><CalendarDays size={15}/><select value={selectedPeriod} onChange={changePeriod}><option value="hourly">Hourly</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select><ChevronDown size={14}/></label>
      </header>

      {!allPoints.length ? (
        <div className="focus-chart__empty focus-chart__empty--premium">
          <div className="focus-chart__empty-visual"><span className="focus-chart__empty-ring"/><span className="focus-chart__empty-ring focus-chart__empty-ring--two"/><div><Activity size={25}/></div></div>
          <span className="focus-chart__empty-kicker">FOCUS INTELLIGENCE</span>
          <h3>No focus data yet</h3>
          <p>{emptyMessage}</p>
          <div className="focus-chart__empty-steps"><span><b>01</b><strong>Start</strong> a study session</span><span><b>02</b><strong>Monitor</strong> your focus with AI</span><span><b>03</b><strong>Return</strong> for your trend</span></div>
        </div>
      ) : (
        <div className="focus-chart__body">
          <div className="focus-chart__summary"><span>Current focus</span><strong>{Math.round(livePoint?.value ?? allPoints.at(-1)?.value ?? 0)}<small>/100</small></strong></div>
          <div className="focus-chart__canvas">
            <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Focus score trend">
              <defs><linearGradient id="dgFocusArea" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="var(--color-accent)" stopOpacity=".22"/><stop offset="1" stopColor="var(--color-accent)" stopOpacity="0"/></linearGradient><linearGradient id="dgFocusLine" x1="0" x2="1"><stop offset="0" stopColor="var(--color-primary)"/><stop offset="1" stopColor="var(--color-accent)"/></linearGradient></defs>
              {[0,25,50,75,100].map(v => { const y = pad.top + ((100-v)/100)*innerH; return <g key={v}><line x1={pad.left} x2={width-pad.right} y1={y} y2={y} className="focus-chart__grid-line"/><text x={pad.left-10} y={y+4} textAnchor="end" className="focus-chart__axis">{v}</text></g>; })}
              {coords.length > 1 && <path d={area} className="focus-chart__area" fill="url(#dgFocusArea)"/>}
              {coords.length > 1 && <path d={line} className="focus-chart__line" fill="none" stroke="url(#dgFocusLine)"/>}
              {coords.map((p, i) => <g key={`${p.label}-${i}`}><circle cx={p.x} cy={p.y} r="16" className="focus-chart__hit" onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}/><circle cx={p.x} cy={p.y} r={active===i ? 6 : 4} className="focus-chart__point"/></g>)}
            </svg>
            {active != null && <div className="focus-chart__tooltip" style={{left:`${(coords[active].x/width)*100}%`,top:`${(coords[active].y/height)*100}%`}}><strong>{coords[active].label}</strong><span>{Math.round(coords[active].value)} focus</span></div>}
          </div>
          <div className="focus-chart__labels">{coords.map((p,i)=><span key={`${p.label}-label-${i}`}>{p.label}</span>)}</div>
        </div>
      )}
    </section>
  );
}
