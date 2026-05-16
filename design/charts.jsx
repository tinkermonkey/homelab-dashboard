// Charts — small inline SVG sparklines + line charts
// Pure functions over arrays of numbers; render at fixed viewBox sizes.

function sparkPaths(values, width = 84, height = 22, pad = 1.5) {
  if (!values || values.length === 0) return { line: '', fill: '' };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const step = innerW / (values.length - 1 || 1);
  const pts = values.map((v, i) => {
    const x = pad + step * i;
    const y = pad + innerH - ((v - min) / range) * innerH;
    return [x, y];
  });
  const line = pts.map((p, i) => (i === 0 ? `M${p[0].toFixed(1)} ${p[1].toFixed(1)}` : `L${p[0].toFixed(1)} ${p[1].toFixed(1)}`)).join(' ');
  const fill = `${line} L${pts[pts.length-1][0].toFixed(1)} ${height-pad} L${pts[0][0].toFixed(1)} ${height-pad} Z`;
  return { line, fill };
}

function Sparkline({ data, width = 84, height = 22, color }) {
  const { line, fill } = sparkPaths(data, width, height);
  return (
    <svg className="m-spark" data-color={color} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" width={width} height={height}>
      <path className="fill" d={fill} />
      <path className="line" d={line} />
    </svg>
  );
}

// Full-size line chart with axis labels for the gateway
function GwChart({ series, height = 88, color = 'cyan', yFmt = (v) => v, yMaxOverride, fillKey = 'f-down', lineKey = 'l-down' }) {
  // series = [{ key, values, line, fill }]
  const allVals = series.flatMap(s => s.values);
  const min = 0; // anchor to zero for traffic/ping
  const max = yMaxOverride != null ? yMaxOverride : Math.max(...allVals) * 1.1 || 1;
  const W = 280;
  const H = height;
  const padL = 28, padR = 6, padT = 6, padB = 16;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const xAt = (i, n) => padL + (innerW * i) / (n - 1 || 1);
  const yAt = (v) => padT + innerH - ((v - min) / (max - min || 1)) * innerH;

  const buildPath = (vals) => {
    const pts = vals.map((v, i) => [xAt(i, vals.length), yAt(v)]);
    const line = pts.map((p, i) => (i === 0 ? `M${p[0].toFixed(1)} ${p[1].toFixed(1)}` : `L${p[0].toFixed(1)} ${p[1].toFixed(1)}`)).join(' ');
    const fill = `${line} L${pts[pts.length-1][0].toFixed(1)} ${padT + innerH} L${pts[0][0].toFixed(1)} ${padT + innerH} Z`;
    return { line, fill };
  };

  // y axis labels (3 lines: max, mid, 0)
  const yTicks = [0, max / 2, max];

  return (
    <svg className="gw-chart-svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" width="100%" height={height}>
      <g className="grid">
        {yTicks.map((t, i) => (
          <line key={i} x1={padL} x2={W - padR} y1={yAt(t)} y2={yAt(t)} />
        ))}
      </g>
      <g className="axis">
        {yTicks.map((t, i) => (
          <text key={i} x={padL - 4} y={yAt(t) + 3} textAnchor="end">{yFmt(t)}</text>
        ))}
        <text x={padL} y={H - 3} textAnchor="start">-24h</text>
        <text x={W - padR} y={H - 3} textAnchor="end">now</text>
      </g>
      {series.map((s, i) => {
        const { line, fill } = buildPath(s.values);
        return (
          <g key={i}>
            <path className={`fill ${s.fillKey || fillKey}`} d={fill} />
            <path className={`line ${s.lineKey || lineKey}`} d={line} />
          </g>
        );
      })}
    </svg>
  );
}

window.Sparkline = Sparkline;
window.GwChart = GwChart;
