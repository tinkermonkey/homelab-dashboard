import { useState, useEffect } from 'react'
import { Button } from '../components/Button'
import { CommandPalette, type Command } from '../components/CommandPalette'
import { Drawer } from '../components/Drawer'
import { SplitPane } from '../components/SplitPane'

export default function AdvancedOverlayComponentsTestPage() {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Register keyboard shortcut for command palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setPaletteOpen(prev => !prev)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const commands: Command[] = [
    {
      id: 'create-class',
      label: 'Create class',
      description: 'Add a new class to the schema',
      icon: 'plus',
      onSelect: () => {
        console.log('Create class selected')
      },
    },
    {
      id: 'search-individuals',
      label: 'Search individuals',
      description: 'Find individuals by name or ID',
      icon: 'search',
      onSelect: () => {
        console.log('Search individuals selected')
      },
    },
    {
      id: 'view-pipeline',
      label: 'View pipeline',
      description: 'Check pipeline status and runs',
      icon: 'pipeline',
      onSelect: () => {
        console.log('View pipeline selected')
      },
    },
    {
      id: 'export-data',
      label: 'Export data',
      description: 'Export schema or individuals',
      icon: 'download',
      onSelect: () => {
        console.log('Export data selected')
      },
    },
  ]

  return (
    <div style={{ backgroundColor: 'rgb(var(--canvas-bg))', minHeight: '100vh' }}>
      <div style={{ padding: '22px 28px' }}>
        <section style={{ marginBottom: '32px' }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'rgb(var(--canvas-fg-3))',
              marginBottom: '14px',
            }}
          >
            Command Palette Component
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Button variant="primary" onClick={() => setPaletteOpen(true)}>
              Open Palette
            </Button>
            <span style={{ color: 'rgb(var(--canvas-fg-3))', fontSize: '12px', alignSelf: 'center' }}>
              (or press Cmd/Ctrl+K)
            </span>
          </div>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'rgb(var(--canvas-fg-3))',
              marginBottom: '14px',
            }}
          >
            Drawer Component
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Button variant="primary" onClick={() => setDrawerOpen(true)}>
              Open Drawer
            </Button>
          </div>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'rgb(var(--canvas-fg-3))',
              marginBottom: '14px',
            }}
          >
            Split Pane Component · Horizontal
          </div>
          <div
            style={{
              border: '1px solid rgb(var(--canvas-border))',
              borderRadius: '6px',
              overflow: 'hidden',
              height: '300px',
            }}
          >
            <SplitPane
              direction="horizontal"
              initialSplitPercent={50}
              first={
                <div
                  style={{
                    padding: '16px',
                    backgroundColor: 'rgb(var(--canvas-surface))',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ color: 'rgb(var(--canvas-fg-2))' }}>Left Pane</div>
                </div>
              }
              second={
                <div
                  style={{
                    padding: '16px',
                    backgroundColor: 'rgb(var(--canvas-card))',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ color: 'rgb(var(--canvas-fg-2))' }}>Right Pane</div>
                </div>
              }
            />
          </div>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'rgb(var(--canvas-fg-3))',
              marginBottom: '14px',
            }}
          >
            Split Pane Component · Vertical
          </div>
          <div
            style={{
              border: '1px solid rgb(var(--canvas-border))',
              borderRadius: '6px',
              overflow: 'hidden',
              height: '300px',
            }}
          >
            <SplitPane
              direction="vertical"
              initialSplitPercent={50}
              first={
                <div
                  style={{
                    padding: '16px',
                    backgroundColor: 'rgb(var(--canvas-surface))',
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ color: 'rgb(var(--canvas-fg-2))' }}>Top Pane</div>
                </div>
              }
              second={
                <div
                  style={{
                    padding: '16px',
                    backgroundColor: 'rgb(var(--canvas-card))',
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ color: 'rgb(var(--canvas-fg-2))' }}>Bottom Pane</div>
                </div>
              }
            />
          </div>
        </section>
      </div>

      <CommandPalette
        isOpen={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={commands}
        placeholder="Search commands..."
      />

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Drawer Title"
        position="right"
        width="320px"
      >
        <div style={{ color: 'rgb(var(--canvas-fg-2))' }}>
          <p>Drawer content goes here.</p>
          <p>This is a right-aligned drawer that can be dismissed by pressing Escape or clicking the backdrop.</p>
        </div>
      </Drawer>
    </div>
  )
}
