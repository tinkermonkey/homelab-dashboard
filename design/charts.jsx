// Sparkline utilities — pure functions from arrays of numbers
function sparkPaths(values, w, h, padY = 2) {
  if (!values || values.length === 0) return { line: '', area: '' };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = (max - min) || 1;
  const step = w / Math.max(1, values.length - 1);
  let line = '';
  let area = `M 0 ${h}`;
  values.forEach((v, i) => {
    const x = +(i * step).toFixed(2);
    const y = +(h - padY - ((v - min) / range) * (h - padY * 2)).toFixed(2);
    line += (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
    area += ` L ${x} ${y}`;
  });
  area += ` L ${w} ${h} Z`;
  return { line, area };
}

const Spark = ({ values, w = 92, h = 20, tone = 'cyan' }) => {
  const { line, area } = sparkPaths(values, w, h);
  const stroke = `var(--status-${tone})`;
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <path d={area} style={{ fill: stroke, fillOpacity: 0.12 }} />
      <path d={line} style={{ stroke, fill: 'none' }} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// Bigger area chart with axis grid
const AreaChart = ({ values, h = 72, color = 'var(--status-amber)', dashed = false,
                    secondValues = null, secondColor = 'var(--status-violet)' }) => {
  const w = 480;
  const all = secondValues ? [...values, ...secondValues] : values;
  const min = 0;
  const max = Math.max(...all) * 1.1;
  const range = max - min || 1;
  const padY = 14, padX = 4;
  const usableW = w - padX * 2;
  const usableH = h - padY * 2;
  const toPath = (vals) => {
    const step = usableW / Math.max(1, vals.length - 1);
    let line = '';
    let area = `M ${padX} ${h - padY}`;
    vals.forEach((v, i) => {
      const x = +(padX + i * step).toFixed(2);
      const y = +(h - padY - ((v - min) / range) * usableH).toFixed(2);
      line += (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
      area += ` L ${x} ${y}`;
    });
    area += ` L ${w - padX} ${h - padY} Z`;
    return { line, area };
  };
  const a = toPath(values);
  const b = secondValues ? toPath(secondValues) : null;
  const gridLines = [0.25, 0.5, 0.75];
  return (
    <svg className="gw-chart-svg" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      {gridLines.map((p, i) => (
        <line key={i} x1={padX} x2={w - padX} y1={padY + usableH * p} y2={padY + usableH * p}
          stroke="currentColor" strokeOpacity="0.10" strokeDasharray="2 3" />
      ))}
      <path d={a.area} style={{ fill: color, fillOpacity: 0.14 }} />
      <path d={a.line} style={{ stroke: color, fill: 'none' }} strokeWidth="1.5"
        strokeDasharray={dashed ? '4 3' : '0'} strokeLinecap="round" strokeLinejoin="round" />
      {b && <>
        <path d={b.area} style={{ fill: secondColor, fillOpacity: 0.10 }} />
        <path d={b.line} style={{ stroke: secondColor, fill: 'none' }} strokeWidth="1.5"
          strokeDasharray="4 3" strokeLinecap="round" strokeLinejoin="round" />
      </>}
      <text className="gw-axis" x={padX} y={h - 2}>-24h</text>
      <text className="gw-axis" x={w - padX} y={h - 2} textAnchor="end">now</text>
    </svg>
  );
};

window.Spark = Spark;
window.AreaChart = AreaChart;
window.sparkPaths = sparkPaths;
