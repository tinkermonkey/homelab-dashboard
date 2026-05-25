// View — Network (/cluster/asgard/network)

const SUBSYSTEMS = [
  { id: 'wan',    name: 'WAN',         sub: 'gw.lab.local', state: 'ok',   val: 'online · 412↓/88↑ Mbps', icon: 'globe' },
  { id: 'dns',    name: 'DNS',         sub: 'pihole + unbound', state: 'ok',  val: '1,421 q · 18% blocked', icon: 'shield' },
  { id: 'vpn',    name: 'VPN',         sub: 'wireguard',    state: 'ok',   val: '2/4 peers · 41s hs',    icon: 'shieldCheck' },
  { id: 'proxy',  name: 'Reverse proxy', sub: 'traefik',    state: 'warn', val: '32 routes · 1 503',     icon: 'share' },
  { id: 'switch', name: 'L3 switch',   sub: 'mikrotik',     state: 'ok',   val: '24p · 0 errs · 0.16% util', icon: 'network' },
];

const TOP_TALKERS = [
  { rank: 1, name: 'helios.lab.local',    meta: 'minio · backups · TrueNAS', val: '202 Mbps ↑', pct: 100, label: '↑ 202' },
  { rank: 2, name: 'nyx.lab.local',       meta: 'jellyfin · sonarr · radarr', val: '124 Mbps ↓', pct: 62,  label: '↓ 124' },
  { rank: 3, name: 'vega.lab.local',      meta: 'ollama · open-webui',       val: '46 Mbps ↓',  pct: 23,  label: '↓ 46'  },
  { rank: 4, name: 'aether.lab.local',    meta: 'home-assistant · iot ingest', val: '38 Mbps ↓', pct: 19,  label: '↓ 38'  },
  { rank: 5, name: '192.168.1.142',       meta: 'workstation · backup peer', val: '22 Mbps ↑',  pct: 11,  label: '↑ 22'  },
  { rank: 6, name: '192.168.1.31',        meta: 'apple-tv · roon endpoint',  val: '14 Mbps ↓',  pct: 7,   label: '↓ 14'  },
];

const CLIENT_BREAKDOWN = [
  { cat: 'Servers',     count: 4,  share: 78, color: 'cyan' },
  { cat: 'IoT devices', count: 38, share: 9,  color: 'amber' },
  { cat: 'Workstations', count: 5, share: 8,  color: 'violet' },
  { cat: 'Mobile',      count: 7,  share: 3,  color: 'emerald' },
  { cat: 'Other',       count: 4,  share: 2,  color: 'rose' },
];

const NETWORK_EVENTS = [
  { sev: 'WARN', who: 'traefik',  txt: '503 on grafana.lab.local · 1 occurrence',     when: '14:01' },
  { sev: 'INFO', who: 'pihole',   txt: 'blocklist refreshed · 2 new sources',          when: '13:55' },
  { sev: 'OK',   who: 'wg-vpn',   txt: 'handshake from peer austin-laptop',            when: '13:42' },
  { sev: 'WARN', who: 'wan',      txt: 'jitter spike · 6.2ms · cleared in 14s',         when: '13:08' },
  { sev: 'INFO', who: 'unbound',  txt: 'cache hit ratio 78% · 1.2k queries in 5m',     when: '12:59' },
  { sev: 'OK',   who: 'switch',   txt: 'spanning-tree converged on vlan 30',           when: '12:41' },
  { sev: 'ERR',  who: 'traefik',  txt: 'upstream redis:6379 connection refused',        when: '12:17' },
  { sev: 'INFO', who: 'dhcp',     txt: 'lease renewed · 14 endpoints',                 when: '12:02' },
];

const SubsystemStrip = () => (
  <div className="subsys-strip">
    {SUBSYSTEMS.map(s => (
      <div className={`subsys ${s.state}`} key={s.id}>
        <span className="ico"><Icon name={s.icon} size={16} /></span>
        <div className="info">
          <div className="n">{s.name}</div>
          <div className="s">{s.sub}</div>
          <div className="v">{s.val}</div>
        </div>
      </div>
    ))}
  </div>
);

const TopTalkersPanel = () => (
  <Panel icon="activity" title="Top talkers · 5m" sub="elastiflow · ntopng" flush
    actions={<Chip tone="emerald">live</Chip>}>
    <div className="talkers">
      {TOP_TALKERS.map(t => (
        <div className="talker-row" key={t.rank}>
          <div className="rank">{t.rank}</div>
          <div>
            <div className="name">{t.name}</div>
            <div className="meta">{t.meta}</div>
          </div>
          <div className="talker-bar"><div style={{ width: `${t.pct}%` }} /></div>
          <div className="val">{t.val}</div>
        </div>
      ))}
    </div>
  </Panel>
);

const ClientBreakdownPanel = () => {
  const total = CLIENT_BREAKDOWN.reduce((s, c) => s + c.count, 0);
  return (
    <Panel icon="cpu" title="Client breakdown" sub={`${total} devices on lab.local`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {CLIENT_BREAKDOWN.map((c, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
              <span className="row-flex">
                <span className="dot" style={{ width: 7, height: 7, borderRadius: '50%', background: `var(--status-${c.color})` }} />
                <span style={{ color: 'var(--canvas-fg-1)', fontWeight: 500 }}>{c.cat}</span>
              </span>
              <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--canvas-fg-3)' }}>
                {c.count} · {c.share}% bw
              </span>
            </div>
            <div className="talker-bar">
              <div style={{ width: `${c.share}%`, background: `var(--status-${c.color})` }} />
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
};

const NetworkEventsPanel = () => (
  <Panel icon="history" title="Network events · 24h" sub="alertmanager + traefik logs" flush>
    <div>
      {NETWORK_EVENTS.map((e, i) => (
        <div className="evt-row" key={i}>
          <span className={`d ${e.sev.toLowerCase()}`} />
          <span className={`sev ${e.sev.toLowerCase()}`}>{e.sev}</span>
          <span><b style={{ fontWeight: 500, color: 'var(--canvas-fg-1)' }}>{e.who}</b> &nbsp;<span style={{ color: 'var(--canvas-fg-3)' }}>{e.txt}</span></span>
          <span className="when">{e.when}</span>
        </div>
      ))}
    </div>
  </Panel>
);

const NetworkView = () => {
  const gw = LAB_DATA.gateway;
  return (
    <>
      <PageHead
        eyebrow={<>
          <Chip tone="cyan">network · lab.local</Chip>
          <span className="muted" style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>
            elastiflow · ntopng · metricbeat
          </span>
        </>}
        title="Network"
        idTag="/cluster/asgard/network"
        subtitle="WAN, DNS, VPN, reverse proxy, and L3 switch health alongside flow records and client breakdown."
        actions={<>
          <Button variant="ghost" icon="refresh">Refresh</Button>
          <Button variant="ghost" icon="copy">Copy public IP</Button>
          <Button variant="primary" icon="zap">Run speedtest</Button>
        </>}
      />
      <Panel flush title="Subsystems" sub="5 monitored services" icon="network">
        <SubsystemStrip />
      </Panel>
      <GatewayPanel gw={gw} />
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
        <TopTalkersPanel />
        <ClientBreakdownPanel />
      </div>
      <NetworkEventsPanel />
    </>
  );
};

window.NetworkView = NetworkView;
