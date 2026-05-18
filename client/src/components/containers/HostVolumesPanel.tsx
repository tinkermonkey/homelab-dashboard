import React, { useMemo } from 'react';
import type { DockerHost } from '@homelab/shared';
import { ROLE_BY_HOST } from './constants';

interface HostVolumesPanelProps {
  host: DockerHost;
}

export const HostVolumesPanel: React.FC<HostVolumesPanelProps> = ({ host }) => {
  const total = useMemo(() => {
    const sizeMap: Record<string, number> = {
      KB: 1 / 1024 / 1024,
      MB: 1 / 1024,
      GB: 1,
      TB: 1024,
    };

    return host.volumes.reduce((acc, v) => {
      const m = v.size.match(/([\d.]+)\s*([KMGT]B)/i);
      if (!m) return acc;
      const n = parseFloat(m[1]);
      const u = m[2].toUpperCase();
      const mult = sizeMap[u] || 0;
      return acc + n * mult;
    }, 0);
  }, [host.volumes]);

  const totalFormatted = total >= 1024 ? (total / 1024).toFixed(1) + ' TB' : total.toFixed(1) + ' GB';

  return (
    <div className="panel host-volumes-panel">
      <div className="host-panel-header">
        <div className="host-panel-mark" data-role={ROLE_BY_HOST[host.id]}>
          {host.id.slice(0, 2).toUpperCase()}
        </div>

        <div className="host-panel-info">
          <div className="host-panel-name">{host.id}</div>
          <div className="host-panel-meta">{host.volumes.length} volumes</div>
        </div>

        <div className="host-panel-counts">
          <span>
            <strong>{totalFormatted}</strong> <span className="label">TOTAL</span>
          </span>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="docker-table">
          <thead>
            <tr>
              <th>Volume</th>
              <th>Driver</th>
              <th>Size</th>
              <th>Mount point</th>
              <th>Used by</th>
            </tr>
          </thead>
          <tbody>
            {host.volumes.map(v => (
              <tr key={v.name}>
                <td className="volume-name-cell">{v.name}</td>
                <td>
                  <span className="driver-pill">{v.driver}</span>
                </td>
                <td className="num-right volume-size">{v.size}</td>
                <td className="mono-cell mount-point">{v.mount}</td>
                <td>
                  <span className="used-by-pills">
                    {v.usedBy.map(u => (
                      <span key={u} className="used-by-pill">
                        {u}
                      </span>
                    ))}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
