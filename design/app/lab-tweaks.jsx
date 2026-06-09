// lab-tweaks.jsx — in-prototype tweak panel. Uses the real SegmentedControl
// for choices; the panel shell itself is project chrome.

function Toggle({ on, onChange, label }) {
  return (
    <label className="row" style={{ gap: 10, cursor: 'pointer', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 13, color: 'rgb(var(--shell-fg-1))' }}>{label}</span>
      <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)}
        style={{
          width: 38, height: 22, borderRadius: 999, border: '1px solid rgb(var(--shell-border-2))',
          background: on ? 'rgb(var(--accent-primary))' : 'rgb(var(--shell-bg))', position: 'relative', cursor: 'pointer', transition: 'background 120ms',
        }}>
        <span style={{ position: 'absolute', top: 2, left: on ? 18 : 2, width: 16, height: 16, borderRadius: 999,
          background: on ? 'rgb(11,20,38)' : 'rgb(var(--shell-fg-3))', transition: 'left 120ms' }} />
      </button>
    </label>
  );
}

const ACCENT_SWATCHES = [
  { id: 'amber', color: '#fbbf24' }, { id: 'cyan', color: '#22d3ee' }, { id: 'violet', color: '#a78bfa' },
];

function TweaksPanel({ state, set, onClose }) {
  return (
    <div className="tweaks">
      <div className="tweaks__head">
        <span className="t">Tweaks</span>
        <button className="tweaks__x" onClick={onClose} aria-label="Close tweaks"><Icon name="x" size={15} /></button>
      </div>
      <div className="tweaks__body">
        <div className="tweaks__row">
          <Toggle label="Dark canvas" on={state.darkCanvas} onChange={v => set('darkCanvas', v)} />
          <Toggle label="Show alert strip" on={state.showAlerts} onChange={v => set('showAlerts', v)} />
          <Toggle label="Bot console" on={state.chatVisible} onChange={v => set('chatVisible', v)} />
          <Toggle label="Collapse sidebar" on={state.sidebarCollapsed} onChange={v => set('sidebarCollapsed', v)} />
        </div>
        <div className="tweaks__row">
          <span className="lbl">Density</span>
          <SegmentedControl value={state.density} onChange={v => set('density', v)}
            options={[{ value: 'regular', label: 'Regular' }, { value: 'compact', label: 'Compact' }]} />
        </div>
        <div className="tweaks__row">
          <span className="lbl">Accent</span>
          <div className="tw-swatches">
            {ACCENT_SWATCHES.map(s => (
              <button key={s.id} className={`tw-swatch ${state.accent === s.id ? 'tw-swatch--on' : ''}`}
                style={{ background: s.color }} onClick={() => set('accent', s.id)} aria-label={s.id} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

window.TweaksPanel = TweaksPanel;
