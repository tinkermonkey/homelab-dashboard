// chat-rail.jsx — right-dock bot console built from the real Heimdall chat
// stack: ChatContainer, ChatMessage, ChatComposer, ChatSuggestions, ChatDivider.

const BOT_TAB_STATUS = { ok: 'healthy', busy: 'busy', idle: 'idle', error: 'error' };

const SEED = {
  'lab-bot': [
    { role: 'bot', body: 'Morning. asgard is healthy — 2 warnings open. Want the digest?', badge: 'concierge' },
    { role: 'user', body: 'yes, summarize' },
    { role: 'bot', body: 'aether memory is at 81% (sustained 12m) and nextcloud on helios is unhealthy — redis exited. I routed the redis issue to sync-bot.',
      tool: { name: 'cluster.digest', status: 'success', output: [{ key: 'hosts', value: '4/4 up' }, { key: 'alerts', value: '2 warn · 0 error' }] } },
  ],
  'ops-bot': [
    { role: 'bot', body: 'Standing by. I can deploy, restart, or roll back anything across the four engines.', badge: 'ops' },
  ],
  'watch-bot': [
    { role: 'bot', body: 'Watching 142 series. The only firing rule is HostMemHigh on aether.', badge: 'alerts',
      tool: { name: 'promql.query', status: 'success', output: [{ key: 'node_memory', value: '81.4%' }] } },
  ],
  'sync-bot': [
    { role: 'bot', body: 'Last restic run finished 04:00 (2.4 GB). Investigating the nextcloud redis dependency now.', badge: 'backup' },
  ],
};

const SUGGEST = {
  'lab-bot': ['What changed today?', 'Show GPU utilization', 'Any failing services?'],
  'ops-bot': ['Restart nextcloud', 'Pull latest images', 'Drain aether'],
  'watch-bot': ['Silence HostMemHigh 1h', 'Top memory consumers', 'Open Grafana'],
  'sync-bot': ['Run backup now', 'Verify last snapshot', 'Replication status'],
};

const fmtTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function BotConsole({ onClose }) {
  const [activeBot, setActiveBot] = React.useState('lab-bot');
  const [threads, setThreads] = React.useState(() => {
    const t = {};
    Object.keys(SEED).forEach(k => { t[k] = SEED[k].map((m, i) => ({ ...m, id: k + i, ts: '09:1' + i })); });
    return t;
  });
  const [draft, setDraft] = React.useState('');

  const bot = LAB_DATA.bots.find(b => b.id === activeBot);
  const tabs = LAB_DATA.bots.map(b => ({ id: b.id, label: b.label, role: b.role, status: BOT_TAB_STATUS[b.status] || 'idle' }));
  const thread = threads[activeBot] || [];

  const send = (text) => {
    const v = (text || '').trim();
    if (!v) return;
    setThreads(prev => {
      const cur = (prev[activeBot] || []).slice();
      cur.push({ id: activeBot + 'u' + Date.now(), role: 'user', body: v, ts: fmtTime() });
      return { ...prev, [activeBot]: cur };
    });
    setDraft('');
    setTimeout(() => {
      setThreads(prev => {
        const cur = (prev[activeBot] || []).slice();
        cur.push({ id: activeBot + 'b' + Date.now(), role: 'bot', body: `On it — acting on “${v}” against ${bot.label}.`, ts: fmtTime(),
          tool: { name: bot.role + '.dispatch', status: 'running', output: [] } });
        return { ...prev, [activeBot]: cur };
      });
    }, 650);
  };

  const composer = (
    <ChatComposer value={draft} onChange={setDraft} onSubmit={(v) => send(v)}
      scopeLabel={bot.label} placeholder={`Message ${bot.label}…`} />
  );

  return (
    <div className="lab-chat">
      <div className="lab-chat__head">
        <span className="t"><Icon name="bot" size={16} />Bot console</span>
        <button className="x" onClick={onClose} aria-label="Close console"><Icon name="x" size={16} /></button>
      </div>
      <ChatContainer bots={tabs} activeBotId={activeBot} onBotChange={setActiveBot} composer={composer}>
        <ChatDivider label="today" />
        {thread.map(m => (
          <ChatMessage key={m.id} role={m.role}
            senderName={m.role === 'user' ? 'you' : bot.label}
            avatar={m.role === 'user' ? 'YOU' : bot.avatar}
            badge={m.role === 'bot' ? m.badge : undefined}
            timestamp={m.ts} body={m.body} toolBlock={m.tool} />
        ))}
        <ChatSuggestions suggestions={SUGGEST[activeBot] || []} onSelect={(s) => send(s)} />
      </ChatContainer>
    </div>
  );
}

window.BotConsole = BotConsole;
