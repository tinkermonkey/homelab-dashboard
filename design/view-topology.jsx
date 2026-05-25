// View — Topology (/cluster/asgard/topology)

const ROLE_MARK = { nyx: 'NX', helios: 'HS', aether: 'AE', vega: 'VG' };
const ROLE_NAME = { nyx: 'compute', helios: 'storage', aether: 'k8s', vega: 'gpu' };
const HOST_LABEL = { nyx: 'compute · nyx.lab.local', helios: 'storage · helios.lab.local',
                     aether: 'k8s · aether.lab.local', vega: 'gpu · vega.lab.local' };

// Bot positions in the stage (relative to .topo-canvas)
const BOT_POS = {
  'lab-bot':   { x: 30,  y: 16  },
  'ops-bot':   { x: 30,  y: 370 },
  'sync-bot':  { x: 320, y: 16  },
  'watch-bot': { x: 610, y: 16  },
};

const BotCard = ({ bot, selected, onSelect }) => (
  <div
    className={`bot-card ${selected ? 'selected' : ''}`}
    style={{ left: BOT_POS[bot.id].x, top: BOT_POS[bot.id].y }}
    onClick={() => onSelect(bot.id)}>
    <div className="head">
      <span className="bot-avatar" data-id={bot.id}>{bot.avatar}</span>
      <div>
        <div className="name">{bot.label}</div>
        <div className="role">{bot.role}</div>
      </div>
      <Pulse tone={bot.status === 'busy' ? 'amber' : bot.status === 'idle' ? 'neutral' : 'emerald'} size="sm" />
    </div>
    <div className="desc">{bot.desc}</div>
    <div className="model-pill">
      <span className="dot" />
      {bot.model}
    </div>
    <div className="bot-section-eyebrow">
      MCP sidecars
      <span className="ct">{bot.mcps.length}</span>
    </div>
    <div className="mcp-pills">
      {bot.mcps.map(m => (
        <span key={m.id} className={`mcp-pill ${m.kind === 'remote' ? 'remote' : ''}`}>
          <span className="dot" />
          {m.label}
        </span>
      ))}
    </div>
    {bot.delegates.length > 0 && (
      <>
        <div className="bot-section-eyebrow">
          Delegates to
          <span className="ct">{bot.delegates.length}</span>
        </div>
        <div className="proj-pills">
          {bot.delegates.map(d => (
            <span key={d} className="proj-pill delegate">
              <span className="dot" />
              {d}
            </span>
          ))}
        </div>
      </>
    )}
    <div className="bot-section-eyebrow">
      Manages
      <span className="ct">{bot.manages.length}</span>
    </div>
    <div className="proj-pills">
      {bot.manages.slice(0, 6).map((p, i) => (
        <span key={i} className="proj-pill" data-host={p.host}>
          <span className="dot" />
          {p.name}
          <span className="port">:{p.port}</span>
        </span>
      ))}
    </div>
  </div>
);

// SVG edges from lab-bot to each delegate
const EdgeLayer = () => {
  // lab-bot card is at (30, 16), size 230x~variable; anchor right edge centre
  // delegates are at sync-bot (320,16), watch-bot (610,16), ops-bot (30,370)
  // anchor coords from card top-left (assume avg card height ~360)
  const startX = 30 + 230;
  const startY = 16 + 70;  // upper area of lab-bot
  const edges = [
    { id: 'sync',  x2: 320, y2: 16 + 70, label: 'delegates' },
    { id: 'watch', x2: 610, y2: 16 + 70, label: 'delegates' },
    // ops-bot is below lab-bot in same column; route down-out-right-in
    { id: 'ops',   x2: 30 + 115, y2: 370, label: 'delegates', vertical: true },
  ];
  return (
    <svg className="edges" viewBox="0 0 1100 760" preserveAspectRatio="none">
      <defs>
        <marker id="arrowhead" viewBox="0 0 10 10" refX="8" refY="5"
          markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill="#FBBF24" />
        </marker>
      </defs>
      {edges.map((e, i) => {
        let d, midX, midY;
        if (e.vertical) {
          const sx = 30 + 115, sy = 16 + 360;
          d = `M ${sx} ${sy} C ${sx} ${sy + 5}, ${e.x2} ${e.y2 - 5}, ${e.x2} ${e.y2}`;
          midX = sx;
          midY = (sy + e.y2) / 2;
        } else {
          d = `M ${startX} ${startY} C ${startX + 60} ${startY}, ${e.x2 - 60} ${e.y2}, ${e.x2} ${e.y2}`;
          midX = (startX + e.x2) / 2;
          midY = startY;
        }
        return (
          <g key={i}>
            <path d={d} stroke="#FBBF24" strokeOpacity="0.75" strokeWidth="1.5"
              strokeDasharray="5 4" fill="none" />
            <g transform={`translate(${midX}, ${midY})`}>
              <rect x="-32" y="-9" width="64" height="18" rx="9"
                fill="#FFFBEB" stroke="rgba(245,158,11,0.40)" strokeWidth="1" />
              <text x="0" y="3.5" fontFamily="var(--font-mono)" fontSize="9.5"
                textAnchor="middle" fill="#92400E" style={{ letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {e.label}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
};

const TopologyInspector = ({ bot }) => {
  if (!bot) return null;
  return (
    <div className="inspector">
      <header className="inspector-head">
        <span className="bot-avatar" data-id={bot.id} style={{ width: 36, height: 36, fontSize: 13 }}>{bot.avatar}</span>
        <div className="main">
          <div className="t">{bot.label}</div>
          <div className="s">{bot.role} · {bot.host}</div>
        </div>
      </header>
      <div className="inspector-section">
        <p style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--canvas-fg-2)' }}>{bot.desc}</p>
      </div>
      <div className="inspector-section">
        <div className="kv">
          <div className="k">Model</div><div className="v">{bot.model}</div>
          <div className="k">Host</div><div className="v">{bot.host}.lab.local</div>
          <div className="k">Status</div><div className="v">
            <Pulse tone={bot.status === 'busy' ? 'amber' : bot.status === 'idle' ? 'neutral' : 'emerald'} size="sm" />
            &nbsp;{bot.status}
          </div>
          <div className="k">MCPs</div><div className="v">{bot.mcps.length}</div>
          <div className="k">Manages</div><div className="v">{bot.manages.length} projects</div>
          {bot.delegates.length > 0 && <><div className="k">Delegates</div><div className="v">{bot.delegates.length} bots</div></>}
        </div>
      </div>
      <div className="inspector-section">
        <div className="inspector-section-head">
          MCP sidecars
          <span className="ct" style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{bot.mcps.length}</span>
        </div>
        {bot.mcps.map(m => (
          <div className="mcp-mini" key={m.id}>
            <div className={`n ${m.kind === 'remote' ? 'remote' : ''}`}>
              <span className="dot" />
              {m.label}
            </div>
            <div className="m">v{m.ver} · {m.kind}</div>
            <div className="d">{m.desc}</div>
          </div>
        ))}
      </div>
      <div className="inspector-section">
        <div className="inspector-section-head">
          Managed projects
          <span className="ct" style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{bot.manages.length}</span>
        </div>
        <div className="proj-pills">
          {bot.manages.map((p, i) => (
            <span key={i} className="proj-pill" data-host={p.host}>
              <span className="dot" />
              {p.name}
              <span className="port">:{p.port}</span>
            </span>
          ))}
        </div>
      </div>
      {bot.delegates.length > 0 && (
        <div className="inspector-section">
          <div className="inspector-section-head">
            Delegates to
            <span className="ct" style={{ fontFamily: 'var(--font-mono)', fontSize: 10 }}>{bot.delegates.length}</span>
          </div>
          <div className="proj-pills">
            {bot.delegates.map(d => (
              <span key={d} className="proj-pill delegate">
                <span className="dot" />
                {d}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const TopologyView = () => {
  const [selected, setSelected] = React.useState('lab-bot');
  const bots = TOPOLOGY_DATA.bots;
  const selBot = bots.find(b => b.id === selected);

  // Per-host bot count
  const botCountByHost = bots.reduce((m, b) => { m[b.host] = (m[b.host] || 0) + 1; return m; }, {});

  return (
    <>
      <PageHead
        eyebrow={<>
          <Chip tone="violet">topology · 4 bots</Chip>
          <span className="muted" style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>
            bots · sidecar mcp servers · managed projects
          </span>
        </>}
        title="Bot topology"
        idTag="/cluster/asgard/topology"
        subtitle="Per-host agent layout, the MCP sidecars each bot exposes, and the project surface each one manages."
        actions={<>
          <Button variant="ghost" icon="refresh">Refresh</Button>
          <Button variant="ghost" icon="download">Export DOT</Button>
        </>}
      />
      <div className="topo-stage-wrap">
        <div className="topo-stage">
          <div className="topo-host-row">
            {TOPOLOGY_DATA.hosts.map(h => (
              <div className={`topo-host-col ${h === 'vega' ? 'empty' : ''}`} key={h}>
                <RoleMark role={ROLE_NAME[h]} mark={ROLE_MARK[h]} />
                <div className="info">
                  <div className="n">{h}</div>
                  <div className="s">{HOST_LABEL[h]}</div>
                </div>
                <span className="badge">
                  {botCountByHost[h] ? `${botCountByHost[h]} bot${botCountByHost[h] > 1 ? 's' : ''}` : 'no bot'}
                </span>
              </div>
            ))}
          </div>
          <div className="topo-canvas">
            <EdgeLayer />
            {bots.map(b => (
              <BotCard key={b.id} bot={b}
                selected={selected === b.id}
                onSelect={setSelected} />
            ))}
            <div className="topo-empty" style={{ left: 900, top: 16 }}>
              <div className="l">No bot on vega</div>
              <div className="d">GPU workloads are launched here by ops-bot via ssh-mcp; no resident agent.</div>
            </div>
            <div className="topo-legend">
              <div className="row"><span className="seg-line" /><span>delegation</span></div>
              <div className="row"><span className="seg-line mcp" /><span>MCP sidecar</span></div>
              <div className="hr" style={{ width: '100%', background: 'rgba(166,177,189,0.20)' }} />
              <div className="row"><span className="dot" style={{ background: 'var(--status-cyan)' }} /><span>nyx</span></div>
              <div className="row"><span className="dot" style={{ background: 'var(--status-emerald)' }} /><span>helios</span></div>
              <div className="row"><span className="dot" style={{ background: 'var(--status-violet)' }} /><span>aether</span></div>
              <div className="row"><span className="dot" style={{ background: 'var(--status-amber)' }} /><span>vega</span></div>
            </div>
          </div>
        </div>
        <TopologyInspector bot={selBot} />
      </div>
    </>
  );
};

window.TopologyView = TopologyView;
