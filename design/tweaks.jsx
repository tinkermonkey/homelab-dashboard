// Tweaks panel — toggleable preferences (route, density, dark canvas, etc.)

const TweaksPanel = ({ state, set, onClose }) => (
  <div className="tweaks-panel">
    <header className="tweaks-head">
      <Icon name="settings" size={14} />
      Tweaks
      <button className="close" onClick={onClose}><Icon name="x" size={12} /></button>
    </header>
    <div className="tweaks-body">
      <div className="tweak-row">
        <span className="lab">Dark canvas</span>
        <span className={`toggle ${state.darkCanvas ? 'on' : ''}`}
          onClick={() => set('darkCanvas', !state.darkCanvas)} />
      </div>
      <div className="tweak-row">
        <span className="lab">Show alerts</span>
        <span className={`toggle ${state.showAlerts ? 'on' : ''}`}
          onClick={() => set('showAlerts', !state.showAlerts)} />
      </div>
      <div className="tweak-row">
        <span className="lab">Collapse sidebar</span>
        <span className={`toggle ${state.sidebarCollapsed ? 'on' : ''}`}
          onClick={() => set('sidebarCollapsed', !state.sidebarCollapsed)} />
      </div>
      <div className="tweak-row">
        <span className="lab">Bot console</span>
        <span className={`toggle ${state.chatVisible ? 'on' : ''}`}
          onClick={() => set('chatVisible', !state.chatVisible)} />
      </div>
      <div className="tweak-row">
        <span className="lab">Density</span>
        <div className="tweak-seg">
          <button className={state.density === 'compact' ? 'on' : ''} onClick={() => set('density', 'compact')}>compact</button>
          <button className={state.density === 'regular' ? 'on' : ''} onClick={() => set('density', 'regular')}>regular</button>
        </div>
      </div>
    </div>
  </div>
);

window.TweaksPanel = TweaksPanel;
