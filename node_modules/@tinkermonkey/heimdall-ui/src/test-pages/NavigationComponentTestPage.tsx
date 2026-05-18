import { Sidebar } from '../components/Sidebar'

export default function NavigationComponentTestPage() {
  return (
    <div style={{ padding: '22px 28px', backgroundColor: 'rgb(var(--shell-bg))', minHeight: '100vh' }}>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'rgba(230, 237, 243, 0.5)',
          marginBottom: '12px',
        }}
      >
        Sidebar nav · active = surface bg + 2px cyan bar
      </div>
      <Sidebar
        sections={[
          {
            title: 'Workspace',
            items: [
              { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
              { id: 'schema', label: 'Schema', icon: 'schema', count: 128 },
              { id: 'individuals', label: 'Individuals', icon: 'data', count: 12480 },
              { id: 'pipelines', label: 'Pipelines', icon: 'pipeline', count: 17 },
            ],
          },
        ]}
        activeItemId="schema"
      />
    </div>
  )
}
