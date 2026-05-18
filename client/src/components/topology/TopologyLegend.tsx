import React from 'react';

export const TopologyLegend: React.FC = () => {
  return (
    <div className="tp-legend">
      <div className="row">
        <span className="ln dashed" />
        delegation (orchestrator → specialist)
      </div>
      <div className="row">
        <span className="ln mcp" style={{ height: 6, borderRadius: 2 }} />
        MCP sidecar
      </div>
      <div className="row">
        <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--accent-cyan)', display: 'inline-block' }} />
        nyx · compute
      </div>
      <div className="row">
        <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--accent-emerald)', display: 'inline-block' }} />
        helios · storage
      </div>
      <div className="row">
        <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--accent-violet)', display: 'inline-block' }} />
        aether · k8s
      </div>
      <div className="row">
        <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--accent-amber)', display: 'inline-block' }} />
        vega · gpu
      </div>
    </div>
  );
};
