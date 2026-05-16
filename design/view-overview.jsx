// Overview view — extracted from app.jsx for routing

function OverviewView({ showAlerts }) {
  const D = window.LAB_DATA;
  return (
    <div className="canvas-inner lab-canvas-inner">
      <div className="page-head" style={{marginBottom:18, paddingBottom:14}}>
        <div>
          <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:6}}>
            <span className="chip cyan"><span className="dot"></span>cluster · {D.cluster.name}</span>
            <span className="muted mono" style={{fontSize:11}}>{D.cluster.location} · last sync {D.cluster.lastSync}</span>
          </div>
          <h1>Overview <span className="id-tag">/cluster/{D.cluster.name}</span></h1>
          <div className="subtitle">Resource state across hosts, gateway health, and deployed services. All systems polled every 15 s.</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-ghost"><Icon name="refresh" size={13}/> Refresh</button>
          <button className="btn btn-primary"><Icon name="bot" size={13}/> Ask lab-bot</button>
        </div>
      </div>

      {showAlerts && <AlertsStrip />}
      <ClusterStats d={D.cluster} />
      <ServersSection servers={D.servers} />
      <div style={{height:24}}></div>
      <GatewayPanel g={D.gateway} />
      <div style={{height:24}}></div>
      <AppsSection apps={D.apps} />
    </div>
  );
}

window.OverviewView = OverviewView;
