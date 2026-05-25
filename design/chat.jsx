// Bot console — right rail chat

const THREADS = {
  'lab-bot': [
    { kind: 'divider', label: 'TODAY · 14:02' },
    { kind: 'msg', who: 'lab-bot', when: '14:02',
      body: [
        { p: "Morning. Cluster is mostly green — <code>aether</code> memory is sitting at 81% and has been for ~12 minutes, which is the only alert worth a second look. Want me to delegate that to <code>watch-bot</code> to confirm it's just signoz cache before we add headroom?" },
      ],
      suggestions: [
        { t: 'Yes, ping watch-bot' },
        { t: 'What\'s on aether right now?' },
        { t: 'Show me top mem consumers' },
      ] },
    { kind: 'msg', who: 'user', when: '14:03',
      body: [{ p: 'What\'s on aether right now?' }] },
    { kind: 'msg', who: 'lab-bot', when: '14:03',
      body: [{ p: 'Running query via <code>ops-bot/docker</code>:' }],
      tool: {
        name: 'docker ps · aether',
        status: 'completed in 0.4s',
        lines: [
          { k: 'NAME',    v: 'STATE     CPU    MEM' },
          { k: 'prom',    v: 'running   7%     1.6 GB' },
          { k: 'loki',    v: 'running   4%     1.2 GB' },
          { k: 'signoz',  v: 'running   3%     1.1 GB · ↑ +220 MB / 12m' },
          { k: 'grafana', v: 'running   3%     480 MB' },
          { k: 'hass',    v: 'running   6%     880 MB' },
          { k: 'unbound', v: 'updating  0%     —' },
        ],
      },
      suggestions: [
        { t: 'Restart signoz' },
        { t: 'Bump aether to 96 GB' },
      ] },
  ],
  'ops-bot': [
    { kind: 'divider', label: 'TODAY · 13:48' },
    { kind: 'msg', who: 'ops-bot', when: '13:48',
      body: [{ p: 'Compose roll on nyx complete. <code>jellyfin</code> pinned to <code>1.40.4</code>, health green for the last 18d. Pulling <code>unbound:1.21.0</code> on aether now.' }],
      tool: {
        name: 'compose · up -d --pull always',
        status: 'completed in 1.4s',
        lines: [
          { k: 'service', v: 'jellyfin' },
          { k: 'state',   v: 'up · healthy' },
          { k: 'image',   v: 'lscr.io/linuxserver/jellyfin:1.40.4' },
          { k: '+',       v: '<span class="add">+1 mount  /srv/media:/media:ro</span>' },
          { k: '-',       v: '<span class="del">-1 env    JELLYFIN_TRANSCODE_NVENC=1</span>' },
        ],
      } },
  ],
  'watch-bot': [
    { kind: 'divider', label: 'TODAY · 13:50' },
    { kind: 'msg', who: 'watch-bot', when: '13:50',
      body: [
        { p: 'aether memory has crossed the 80% threshold for the 3rd time in 7 days. <code>signoz</code> is the top mover. Trend is linear, not a leak — clickhouse compaction window.' },
        { p: 'Suggested: nudge the threshold to 85% and add a recording rule for clickhouse compactions. Or, give me approval to bounce signoz.' },
      ],
      suggestions: [
        { t: 'Bounce signoz' }, { t: 'Raise threshold to 85%' },
      ] },
  ],
  'sync-bot': [
    { kind: 'divider', label: 'TODAY · 04:02' },
    { kind: 'msg', who: 'sync-bot', when: '04:02',
      body: [{ p: 'restic snapshot complete · 14.2 TB · 312 new objects · 11m 04s. Verified, replicated to b2.' }],
      tool: {
        name: 'restic snapshot · /mnt/tank',
        status: 'completed in 11m 04s',
        lines: [
          { k: 'host',     v: 'helios' },
          { k: 'paths',    v: '/mnt/tank/media, /mnt/tank/docs' },
          { k: 'added',    v: '<span class="add">+ 312 files · 4.1 GB</span>' },
          { k: 'verified', v: 'ok · sha256 match' },
        ],
      } },
  ],
};

const BOT_BADGE = { 'lab-bot': 'concierge', 'ops-bot': 'ops', 'watch-bot': 'alerts', 'sync-bot': 'backup' };

const BotMessage = ({ m }) => {
  const isUser = m.who === 'user';
  const bot = LAB_DATA.bots.find(b => b.id === m.who);
  const name = isUser ? 'you' : (bot && bot.label) || m.who;
  return (
    <div className={`bc-msg ${isUser ? 'user' : ''}`}>
      <span className="av" {...(isUser ? {} : { 'data-id': m.who, className: 'av bot-avatar', style: { background: undefined } })}>
        {isUser ? 'me' : (bot ? bot.avatar : 'B')}
      </span>
      <div>
        <div className="bc-meta">
          <span className="n">{name}</span>
          {!isUser && <span className="badge">{BOT_BADGE[m.who] || ''}</span>}
          <span className="when">{m.when}</span>
        </div>
        <div className="bc-body">
          {m.body.map((b, i) => <p key={i} dangerouslySetInnerHTML={{ __html: b.p }} />)}
        </div>
        {m.tool && (
          <div className="bc-tool">
            <div className="bc-tool-head">
              <Icon name="zap" size={11} />
              <span>{m.tool.name}</span>
              <span className="ok">✓ {m.tool.status}</span>
            </div>
            <div className="bc-tool-body">
              {m.tool.lines.map((l, i) => (
                <div key={i}>
                  {l.k && <span className="k">{l.k.padEnd(11)}</span>}
                  <span dangerouslySetInnerHTML={{ __html: l.v }} />
                </div>
              ))}
            </div>
          </div>
        )}
        {m.suggestions && (
          <div className="bc-sugs">
            {m.suggestions.map((s, i) => (
              <button key={i} className="bc-sug">
                <Icon name="arrow" size={10} />
                {s.t}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const BotConsole = ({ onClose }) => {
  const [active, setActive] = React.useState('lab-bot');
  const [draft, setDraft] = React.useState('');
  const bots = LAB_DATA.bots;
  const thread = THREADS[active] || [];
  return (
    <aside className="bot-console">
      <header className="bc-head">
        <Pulse tone="emerald" size="sm" />
        <div className="info">
          <div className="t">Bot console</div>
          <div className="s">4 bots · one-click delegate · ⌘⏎</div>
        </div>
        <div className="actions">
          <button className="bc-ico" title="History"><Icon name="history" size={13} /></button>
          <button className="bc-ico" title="Settings"><Icon name="settings" size={13} /></button>
          <button className="bc-ico" onClick={onClose} title="Close"><Icon name="x" size={13} /></button>
        </div>
      </header>
      <div className="bc-tabs">
        {bots.map(b => (
          <button key={b.id}
            className={`bc-tab ${active === b.id ? 'active' : ''}`}
            onClick={() => setActive(b.id)}>
            <span className="n">
              <Pulse tone={b.status === 'busy' ? 'amber' : b.status === 'idle' ? 'neutral' : 'emerald'} size="xs" />
              {b.label}
            </span>
            <span className="r">{BOT_BADGE[b.id]}</span>
          </button>
        ))}
      </div>
      <div className="bc-thread">
        {thread.map((m, i) =>
          m.kind === 'divider'
            ? <div className="bc-divider" key={i}>{m.label}</div>
            : <BotMessage m={m} key={i} />
        )}
      </div>
      <div className="bc-composer">
        <div className="bc-composer-tools">
          <span className="scope">talking to <b>{bots.find(x => x.id === active)?.label}</b></span>
          <span className="pill">context</span>
          <span className="pill">/cmd</span>
        </div>
        <textarea
          rows="2"
          placeholder={`Ask ${bots.find(x => x.id === active)?.label}…  e.g. /docker ps aether`}
          value={draft}
          onChange={e => setDraft(e.target.value)} />
        <div className="bc-composer-foot">
          <kbd>⏎</kbd> send <kbd>⇧⏎</kbd> newline <kbd>/</kbd> commands
          <button className="send-btn">
            <Icon name="send" size={12} /> send
          </button>
        </div>
      </div>
    </aside>
  );
};

window.BotConsole = BotConsole;
