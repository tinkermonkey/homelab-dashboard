// Bot topology view — servers as columns, bots as nodes with
// MCP sidecars + managed projects inline. SVG overlay for
// delegation curves between lab-bot and other bots.

const { useState: useState_t } = React;

// Stage dimensions and bot positions (centers)
const TP_STAGE_W = 1240;
const TP_STAGE_H = 800;
const TP_COL_X = { nyx: 30, helios: 330, aether: 630, vega: 930 };
const TP_BOT_W = 270;

// Position each bot inside its host's column
const TP_BOT_LAYOUT = {
  'lab-bot':   { x: 30,  y: 88,  host: 'nyx' },
  'ops-bot':   { x: 30,  y: 408, host: 'nyx' },
  'sync-bot':  { x: 330, y: 88,  host: 'helios' },
  'watch-bot': { x: 630, y: 88,  host: 'aether' },
};

const HOST_ROLE = { nyx: 'compute', helios: 'storage', aether: 'k8s', vega: 'gpu' };
const HOST_SUB = {
  nyx: 'compute · 24c / 128GB',
  helios: 'storage · zfs · 90 TB',
  aether: 'k3s · 64 GB',
  vega: 'gpu · 2× rtx 4090',
};

function TpServerHeader({ id, isEmpty, botCount }) {
  return (
    <div className={'tp-server' + (isEmpty ? ' empty' : '')}>
      <div className="mk" data-role={HOST_ROLE[id]}>{id.slice(0,2).toUpperCase()}</div>
      <div className="info">
        <div className="n">{id}</div>
        <div className="sub">{HOST_SUB[id]}</div>
      </div>
      <div className="badge">
        {isEmpty ? '— no bot —' : <><b>{botCount}</b> bot{botCount > 1 ? 's' : ''}</>}
      </div>
    </div>
  );
}

function TpBot({ bot, selected, onSelect }) {
  const pos = TP_BOT_LAYOUT[bot.id];
  return (
    <div
      className={'tp-bot' + (selected ? ' selected' : '')}
      data-bot={bot.id}
      data-status={bot.status}
      style={{ left: pos.x, top: pos.y, width: TP_BOT_W }}
      onClick={() => onSelect(bot.id)}
    >
      <div className="tp-bot-head">
        <div className="tp-bot-av">{bot.avatar}</div>
        <div>
          <div className="n">{bot.label}</div>
          <div className="role">{bot.role}</div>
        </div>
        <div className="pulse-state"></div>
      </div>
      <div className="desc">{bot.desc}</div>
      <div className="model"><span className="dot"></span>{bot.model}</div>

      <div className="tp-section">
        MCP sidecars <span className="ct">{bot.mcps.length}</span>
      </div>
      <div className="tp-mcp-list">
        {bot.mcps.map(m => (
          <span key={m.id} className={'tp-mcp' + (m.kind === 'remote' ? ' remote' : '')} title={`${m.label} v${m.ver} — ${m.desc}`}>
            <span className="dot"></span>{m.label}
          </span>
        ))}
      </div>

      {bot.manages.length > 0 && (
        <>
          <div className="tp-section">
            Manages <span className="ct">{bot.manages.length}</span>
          </div>
          <div className="tp-project-list">
            {bot.manages.map(p => (
              <span key={p.name} className="tp-project" data-host={p.host} title={`${p.name} on ${p.host}:${p.port}`}>
                <span className="host-dot"></span>{p.name}
                <span className="port">:{p.port}</span>
              </span>
            ))}
          </div>
        </>
      )}
      {bot.delegates && bot.delegates.length > 0 && (
        <>
          <div className="tp-section">
            Delegates to <span className="ct">{bot.delegates.length}</span>
          </div>
          <div className="tp-mcp-list">
            {bot.delegates.map(d => (
              <span key={d} className="tp-project" data-host="orchestrator" style={{borderColor:'color-mix(in oklab, var(--accent-cyan) 35%, transparent)', background:'color-mix(in oklab, var(--accent-cyan) 8%, transparent)', color:'var(--accent-cyan-deep)'}}>
                <span className="host-dot" style={{background:'var(--accent-cyan)'}}></span>{d}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Bezier helper for SVG curves
function bezier(x1, y1, x2, y2, curvature = 0.35) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  // Perpendicular offset
  const dist = Math.hypot(dx, dy);
  const nx = -dy / (dist || 1);
  const ny = dx / (dist || 1);
  const off = Math.min(120, dist * curvature);
  return `M ${x1} ${y1} Q ${mx + nx * off} ${my + ny * off} ${x2} ${y2}`;
}

function TpEdges({ bots }) {
  // For lab-bot, draw curves to each delegate
  const lab = bots.find(b => b.id === 'lab-bot');
  if (!lab || !lab.delegates) return null;
  const labPos = TP_BOT_LAYOUT['lab-bot'];
  // start from right edge of lab-bot card (approximately)
  const startX = labPos.x + TP_BOT_W;
  const startY = labPos.y + 38; // around the head

  const paths = lab.delegates.map((targetId) => {
    const tp = TP_BOT_LAYOUT[targetId];
    if (!tp) return null;
    // end at left edge of target (or top if it's below)
    let endX, endY;
    if (targetId === 'ops-bot') {
      // ops-bot is below lab-bot — curve goes down through nyx column
      // end at top center of ops-bot
      endX = tp.x + 50;
      endY = tp.y;
    } else {
      endX = tp.x;
      endY = tp.y + 38;
    }
    return {
      id: targetId,
      d: bezier(startX, startY, endX, endY, targetId === 'ops-bot' ? 0.18 : 0.18),
      midX: (startX + endX) / 2,
      midY: (startY + endY) / 2,
    };
  }).filter(Boolean);

  return (
    <svg className="tp-edges" viewBox={`0 0 ${TP_STAGE_W} ${TP_STAGE_H}`} preserveAspectRatio="none">
      <defs>
        <marker id="tp-arrow-cyan" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent-cyan)"/>
        </marker>
      </defs>
      {paths.map(p => (
        <g key={p.id}>
          <path className="delegate" d={p.d} markerEnd="url(#tp-arrow-cyan)" />
        </g>
      ))}
      {paths.map(p => (
        <g key={'lbl-' + p.id}>
          <rect
            x={p.midX - 28} y={p.midY - 8}
            width={56} height={16} rx={3}
            fill="var(--canvas-card)"
            stroke="color-mix(in oklab, var(--accent-cyan) 30%, transparent)"
          />
          <text x={p.midX} y={p.midY + 3.5} textAnchor="middle" fill="var(--accent-cyan-deep)">delegates</text>
        </g>
      ))}
    </svg>
  );
}

function TpInspector({ bot }) {
  if (!bot) return (
    <div className="tp-inspector">
      <div style={{textAlign:'center', color:'var(--canvas-fg-3)', fontSize:12, padding:'24px 0', fontFamily:'var(--mono)'}}>
        Select a bot to inspect.
      </div>
    </div>
  );
  const D = window.LAB_DATA;
  return (
    <div className="tp-inspector">
      <div className="tp-i-head" data-bot={bot.id}>
        <div className="av">{bot.avatar}</div>
        <div>
          <div className="nm">{bot.label}</div>
          <div className="rl">{bot.role} · on {bot.host}</div>
        </div>
      </div>
      <div style={{fontSize:12.5, color:'var(--canvas-fg-2)', lineHeight:1.5}}>{bot.desc}</div>
      <dl className="tp-i-kv">
        <dt>model</dt><dd>{bot.model}</dd>
        <dt>host</dt><dd>{bot.host}.lab.local</dd>
        <dt>status</dt><dd style={{color: bot.status === 'busy' ? 'var(--accent-amber)' : bot.status === 'idle' ? 'var(--canvas-fg-3)' : 'var(--accent-emerald)'}}>● {bot.status}</dd>
        <dt>mcps</dt><dd>{bot.mcps.length} attached</dd>
        <dt>manages</dt><dd>{bot.manages.length} project{bot.manages.length === 1 ? '' : 's'}</dd>
        {bot.delegates && <><dt>delegates</dt><dd>{bot.delegates.length} bot{bot.delegates.length === 1 ? '' : 's'}</dd></>}
      </dl>

      <div>
        <div className="tp-i-section">MCP sidecars · {bot.mcps.length}</div>
        <div className="tp-i-mcp-list">
          {bot.mcps.map(m => (
            <div key={m.id} className="tp-i-mcp">
              <div className="top">
                <span className={'name' + (m.kind === 'remote' ? ' remote' : '')}>
                  <span className="dot"></span>{m.label}
                </span>
                <span className="ver">v{m.ver} · {m.kind}</span>
              </div>
              <div className="d">{m.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {bot.manages.length > 0 && (
        <div>
          <div className="tp-i-section">Managed projects · {bot.manages.length}</div>
          <div className="tp-project-list">
            {bot.manages.map(p => (
              <span key={p.name} className="tp-project" data-host={p.host}>
                <span className="host-dot"></span>{p.name}
                <span className="port">{p.host}:{p.port}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {bot.delegates && bot.delegates.length > 0 && (
        <div>
          <div className="tp-i-section">Delegates to · {bot.delegates.length}</div>
          <div className="tp-project-list">
            {bot.delegates.map(d => (
              <span key={d} className="tp-project" style={{borderColor:'color-mix(in oklab, var(--accent-cyan) 35%, transparent)', background:'color-mix(in oklab, var(--accent-cyan) 10%, transparent)', color:'var(--accent-cyan-deep)'}}>
                <span className="host-dot" style={{background:'var(--accent-cyan)'}}></span>{d}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TopologyView() {
  const T = window.TOPOLOGY_DATA;
  const [selectedId, setSelectedId] = useState_t('lab-bot');
  const selected = T.bots.find(b => b.id === selectedId);

  const botsByHost = T.hosts.reduce((acc, h) => {
    acc[h] = T.bots.filter(b => b.host === h);
    return acc;
  }, {});

  return (
    <div className="canvas-inner lab-canvas-inner">
      <div className="page-head" style={{marginBottom:16, paddingBottom:14}}>
        <div>
          <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:6}}>
            <span className="chip violet"><span className="dot"></span>topology · {T.bots.length} bots</span>
            <span className="muted mono" style={{fontSize:11}}>bots · sidecar mcp servers · managed projects</span>
          </div>
          <h1>Bot topology <span className="id-tag">/cluster/asgard/bots</span></h1>
          <div className="subtitle">Where each bot runs, what MCP sidecars it brings, and which projects it manages. Curves show delegation between bots — the orchestrator fans out to specialists.</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-ghost"><Icon name="refresh" size={13}/> Refresh</button>
          <button className="btn btn-ghost"><Icon name="ext" size={13}/> Export DOT</button>
        </div>
      </div>

      <div className="tp-stage-wrap full">
        <div className="tp-stage" style={{minHeight: TP_STAGE_H}}>
          <div className="tp-grid"></div>

          <div className="tp-server-row">
            {T.hosts.map(h => (
              <TpServerHeader key={h} id={h} isEmpty={botsByHost[h].length === 0} botCount={botsByHost[h].length} />
            ))}
          </div>

          <TpEdges bots={T.bots} />

          {T.bots.map(b => (
            <TpBot key={b.id} bot={b} selected={selectedId === b.id} onSelect={setSelectedId} />
          ))}

          {/* empty vega placeholder */}
          <div className="tp-empty" style={{left: TP_COL_X.vega, top: 88, width: TP_BOT_W}}>
            <b>No bot on vega</b>
            GPU workloads are launched here by <span style={{color:'var(--canvas-fg-1)'}}>ops-bot</span> via <code style={{fontFamily:'var(--mono)', fontSize:10, background:'var(--canvas-bg-2)', padding:'1px 4px', borderRadius:3}}>ssh-mcp</code>; no resident agent.
          </div>

          <div className="tp-legend">
            <div className="row"><span className="ln dashed"></span>delegation (orchestrator → specialist)</div>
            <div className="row"><span className="ln mcp" style={{height:6, borderRadius:2}}></span>MCP sidecar</div>
            <div className="row"><span style={{width:8, height:8, borderRadius:999, background:'var(--accent-cyan)', display:'inline-block'}}></span>nyx · compute</div>
            <div className="row"><span style={{width:8, height:8, borderRadius:999, background:'var(--accent-emerald)', display:'inline-block'}}></span>helios · storage</div>
            <div className="row"><span style={{width:8, height:8, borderRadius:999, background:'var(--accent-violet)', display:'inline-block'}}></span>aether · k8s</div>
            <div className="row"><span style={{width:8, height:8, borderRadius:999, background:'var(--accent-amber)', display:'inline-block'}}></span>vega · gpu</div>
          </div>
        </div>
        <TpInspector bot={selected} />
      </div>
    </div>
  );
}

window.TopologyView = TopologyView;
