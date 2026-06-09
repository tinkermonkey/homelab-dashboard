// view-topology.jsx — /cluster/asgard/topology
// Flagship use of the real Heimdall graph stack: GraphCanvas (pan/zoom +
// force layout), TopologyNode for every node, GraphInspector side panel.

const BOT_STATUS = { ok: 'ok', busy: 'warning', idle: 'idle', error: 'error' };
const HOST_META = {};
LAB_DATA.servers.forEach(s => { HOST_META[s.id] = s; });

function buildGraph() {
  const T = TOPOLOGY_DATA;
  const nodes = [];
  const edges = [];

  // host nodes
  T.hosts.forEach(hid => {
    const s = HOST_META[hid];
    nodes.push({ id: 'host:' + hid, label: hid, kind: 'host', domainColor: ROLE_COLOR[s.role] });
  });
  // bot nodes
  T.bots.forEach(b => nodes.push({ id: 'bot:' + b.id, label: b.label, kind: 'bot', domainColor: 'amber' }));

  // delegation edges
  T.bots.forEach(b => (b.delegates || []).forEach(d =>
    edges.push({ id: `del:${b.id}:${d}`, sourceId: 'bot:' + b.id, targetId: 'bot:' + d, label: 'delegates', variant: 'hot' })));

  // manage edges (bot -> distinct host, labelled with count)
  T.bots.forEach(b => {
    const byHost = {};
    (b.manages || []).forEach(m => { byHost[m.host] = (byHost[m.host] || 0) + 1; });
    Object.keys(byHost).forEach(h =>
      edges.push({ id: `mng:${b.id}:${h}`, sourceId: 'bot:' + b.id, targetId: 'host:' + h, label: String(byHost[h]) }));
  });

  return { nodes, edges };
}

function inspectFor(id) {
  if (!id) return { node: null, rels: [] };
  const T = TOPOLOGY_DATA;
  if (id.startsWith('bot:')) {
    const b = T.bots.find(x => 'bot:' + x.id === id);
    const rels = [];
    (b.delegates || []).forEach(d => rels.push({ id: 'r' + d, target: 'bot:' + d, targetTitle: d, targetDomain: 'software', predicate: 'delegates', direction: 'out' }));
    const byHost = {}; (b.manages || []).forEach(m => { byHost[m.host] = (byHost[m.host] || 0) + 1; });
    Object.keys(byHost).forEach(h => rels.push({ id: 'rh' + h, target: 'host:' + h, targetTitle: h + ' · ' + byHost[h] + ' svc', predicate: 'manages', direction: 'out' }));
    T.bots.forEach(o => (o.delegates || []).includes(b.id) && rels.push({ id: 'ri' + o.id, target: 'bot:' + o.id, targetTitle: o.label, predicate: 'delegates to', direction: 'in' }));
    return {
      node: { id: b.id, title: b.label, kind: 'agent', domain: 'software', description: b.desc,
        metadata: { model: b.model, host: b.host, status: b.status, mcp_servers: (b.mcps || []).length, manages: (b.manages || []).length } },
      rels,
    };
  }
  const hid = id.slice(5);
  const s = HOST_META[hid];
  const T2 = TOPOLOGY_DATA;
  const rels = [];
  T2.bots.forEach(b => { if ((b.manages || []).some(m => m.host === hid)) rels.push({ id: 'rb' + b.id, target: 'bot:' + b.id, targetTitle: b.label, predicate: 'managed by', direction: 'in' }); });
  return {
    node: { id: hid + '.lab.local', title: hid, kind: 'host', domain: s.role === 'gpu' ? 'climate' : s.role === 'k8s' ? 'software' : s.role === 'storage' ? 'life' : 'default',
      description: s.model, metadata: { ip: s.ip, role: s.role, cpu: s.cpu.v + '%', mem: s.mem.v + '%', containers: s.containers, uptime: s.uptime } },
    rels,
  };
}

function TopologyView() {
  const [sel, setSel] = React.useState('bot:lab-bot');
  const { nodes, edges } = React.useMemo(buildGraph, []);

  const renderNode = React.useCallback((node, selected) => {
    if (node.kind === 'host') {
      const s = HOST_META[node.label];
      return <div className="tnode"><TopologyNode
        title={node.label} nodeRole={s.role} status={s.status === 'warn' ? 'warning' : 'ok'} selected={selected}
        onSelect={() => setSel(node.id)}
        metrics={[
          { label: 'cpu', value: s.cpu.v, unit: '%', percent: s.cpu.v, color: s.cpu.v >= 75 ? 'amber' : 'cyan' },
          { label: 'mem', value: s.mem.v, unit: '%', percent: s.mem.v, color: s.mem.v >= 80 ? 'amber' : 'violet' },
        ]} /></div>;
    }
    const b = TOPOLOGY_DATA.bots.find(x => 'bot:' + x.id === node.id);
    return <div className="tnode"><TopologyNode
      title={b.label} nodeRole={b.role + ' · ' + b.model.replace('claude-', '')} status={BOT_STATUS[b.status] || 'idle'} selected={selected}
      onSelect={() => setSel(node.id)}
      metrics={[
        { label: 'mcp', value: (b.mcps || []).length, percent: (b.mcps || []).length * 18, color: 'violet' },
        { label: 'svc', value: (b.manages || []).length, percent: (b.manages || []).length * 14, color: 'amber' },
      ]} /></div>;
  }, []);

  const insp = inspectFor(sel);

  return (
    <>
      <PageHeader
        eyebrow={<span className="eyebrow-row"><Chip variant="violet">topology · agents</Chip>
          <span className="mono-meta">{TOPOLOGY_DATA.bots.length} bots · {TOPOLOGY_DATA.hosts.length} hosts</span></span>}
        title="Topology" idChip="/cluster/asgard/topology"
        subtitle="Agent mesh and the hosts they operate. Drag to pan, scroll to zoom, click a node to inspect."
        actions={<Button variant="secondary"><Icon name="refresh" size={14} />Re-layout</Button>} />

      <div className="topo-wrap">
        <div className="topo-stage">
          <GraphCanvas nodes={nodes} edges={edges} layout="force" selectedNodeId={sel}
            onNodeSelect={setSel} renderNode={renderNode} />
          <div className="topo-legend">
            <div className="row"><span className="seg seg--mcp" /> delegation</div>
            <div className="row"><span className="seg" /> manages (n services)</div>
            <div className="row"><span className="sw" style={{ background: 'rgb(var(--accent-primary))' }} /> agent</div>
            <div className="row"><span className="sw" style={{ background: 'rgb(var(--status-cyan))' }} /> host</div>
          </div>
        </div>
        <GraphInspector node={insp.node} relationships={insp.rels} onNodeSelect={setSel} />
      </div>
    </>
  );
}

window.TopologyView = TopologyView;
