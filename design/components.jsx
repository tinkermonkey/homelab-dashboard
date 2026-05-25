// Shared primitives for the Heimdall homelab dashboard

const Pulse = ({ tone = 'emerald', size = 'md' }) => (
  <span className={`pulse ${tone} ${size === 'sm' ? 'sm' : size === 'xs' ? 'xs' : ''}`} />
);

const Chip = ({ tone, mono, children, dot = true }) => (
  <span className={`chip ${tone || ''} ${mono ? 'mono' : ''}`}>
    {dot && <span className="dot" />}
    {children}
  </span>
);

const IdTag = ({ children }) => <span className="mono-id-tag">{children}</span>;

const Button = ({ variant = 'default', size, icon, children, onClick, ...rest }) => {
  const cls = `btn ${variant === 'primary' ? 'primary' : variant === 'ghost' ? 'ghost' : ''} ${size === 'sm' ? 'sm' : ''}`;
  return (
    <button className={cls.trim()} onClick={onClick} {...rest}>
      {icon && <Icon name={icon} size={14} />}
      {children}
    </button>
  );
};

const Panel = ({ title, sub, eyebrow, icon, actions, children, flush = false }) => (
  <section className="panel">
    {(title || actions) && (
      <header className="panel-head">
        <div className="panel-title">
          {icon && <Icon name={icon} size={16} />}
          {title}
          {sub && <span className="panel-sub">{sub}</span>}
        </div>
        {actions}
      </header>
    )}
    <div className={`panel-body ${flush ? 'flush' : ''}`}>{children}</div>
  </section>
);

const StatTile = ({ tone, label, value, unit, meta, sparkValues }) => (
  <div className="stat" data-color={tone}>
    <div className="label">{label}</div>
    <div className="num">
      {value}{unit && <span className="unit">{unit}</span>}
    </div>
    {meta && <div className="meta">{meta}</div>}
    {sparkValues && (
      <div className="stat-spark">
        <Spark values={sparkValues} w={92} h={26} tone={tone} />
      </div>
    )}
  </div>
);

const RoleMark = ({ role, mark, size = 'md' }) => (
  <span className={`role-mark ${size === 'lg' ? 'lg' : ''}`} data-role={role}>{mark}</span>
);

// Tones derived from value or explicit override
function metricTone(metric, v) {
  if (metric === 'CPU') return v >= 85 ? 'rose' : v >= 75 ? 'amber' : 'cyan';
  if (metric === 'MEM') return v >= 90 ? 'rose' : v >= 78 ? 'amber' : 'violet';
  if (metric === 'DISK') return v >= 92 ? 'rose' : v >= 85 ? 'amber' : 'emerald';
  if (metric === 'NET') return 'cyan';
  if (metric === 'GPU') return v >= 90 ? 'rose' : 'amber';
  return 'cyan';
}

const MetricRow = ({ metric, v, value, hist, scale = (x) => Math.min(100, x) }) => {
  const tone = metricTone(metric, v);
  const pct = scale(v);
  return (
    <div className="metric-row">
      <div className="mk">{metric}</div>
      <div className="bar-track">
        <div className="bar-fill" data-tone={tone} style={{ width: `${pct}%` }} />
      </div>
      <div className="mv">{value}</div>
      <Spark values={hist} tone={tone} />
    </div>
  );
};

// State pill (running/degraded/failed/...)
const StatePill = ({ s }) => {
  const label = String(s || '').toUpperCase();
  return (
    <span className="state-pill" data-s={s}>
      <span className="dot" />
      {label}
    </span>
  );
};

// Mini badge (used inline for container state/health)
const MiniBadge = ({ s }) => (
  <span className="mini-badge" data-s={s}>{s}</span>
);

Object.assign(window, {
  Pulse, Chip, IdTag, Button, Panel, StatTile, RoleMark, MetricRow, StatePill, MiniBadge, metricTone
});
