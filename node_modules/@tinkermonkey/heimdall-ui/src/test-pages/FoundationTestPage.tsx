import { useState, useEffect } from 'react'

export default function FoundationTestPage() {
  const [tokens, setTokens] = useState<Record<string, string>>({})

  useEffect(() => {
    // Load actual CSS tokens from the document
    const root = document.documentElement
    const computedStyle = getComputedStyle(root)

    const tokenNames = [
      '--shell-bg',
      '--shell-surface',
      '--shell-fg-1',
      '--shell-fg-2',
      '--shell-fg-3',
      '--canvas-bg',
      '--canvas-surface',
      '--canvas-card',
      '--canvas-bg-2',
      '--canvas-fg-1',
      '--canvas-fg-2',
      '--canvas-fg-3',
      '--canvas-border',
      '--canvas-border-strong',
      '--accent-primary',
      '--accent-primary-hover',
      '--accent-primary-deep',
      '--status-ok',
      '--status-warn',
      '--status-error',
      '--status-emerald',
      '--status-amber',
      '--status-rose',
      '--status-violet',
      '--radius-sm',
      '--radius-md',
      '--radius-lg',
      '--radius-xl',
      '--radius-full',
      '--font-sans',
      '--font-mono',
    ]

    const loadedTokens: Record<string, string> = {}
    tokenNames.forEach((name) => {
      const value = computedStyle.getPropertyValue(name).trim()
      loadedTokens[name] = value
    })

    setTokens(loadedTokens)
  }, [])

  return (
    <div style={{ padding: '22px 28px', backgroundColor: 'rgb(var(--canvas-bg))', minHeight: '100vh' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h1 style={{ color: 'rgb(var(--canvas-fg-1))', marginBottom: '28px' }}>Foundation Tokens</h1>

        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ color: 'rgb(var(--canvas-fg-1))', fontSize: '18px', marginBottom: '16px' }}>
            Shell Surface (Always Dark)
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
            {Object.entries(tokens)
              .filter(([key]) => key.startsWith('--shell-'))
              .map(([key, value]) => (
                <div
                  key={key}
                  style={{
                    padding: '12px',
                    backgroundColor: 'rgb(var(--canvas-surface))',
                    borderRadius: '6px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                  }}
                >
                  <div style={{ color: 'rgb(var(--canvas-fg-3))', marginBottom: '4px' }}>{key}</div>
                  <div style={{ color: 'rgb(var(--canvas-fg-1))', fontWeight: 500, wordBreak: 'break-all' }}>
                    {value}
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ color: 'rgb(var(--canvas-fg-1))', fontSize: '18px', marginBottom: '16px' }}>
            Canvas Surface (Light by Default)
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
            {Object.entries(tokens)
              .filter(([key]) => key.startsWith('--canvas-'))
              .map(([key, value]) => (
                <div
                  key={key}
                  style={{
                    padding: '12px',
                    backgroundColor: 'rgb(var(--canvas-surface))',
                    borderRadius: '6px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                  }}
                >
                  <div style={{ color: 'rgb(var(--canvas-fg-3))', marginBottom: '4px' }}>{key}</div>
                  <div style={{ color: 'rgb(var(--canvas-fg-1))', fontWeight: 500, wordBreak: 'break-all' }}>
                    {value}
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ color: 'rgb(var(--canvas-fg-1))', fontSize: '18px', marginBottom: '16px' }}>
            Accent Colors (Cyan Brand)
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
            {Object.entries(tokens)
              .filter(([key]) => key.startsWith('--accent-'))
              .map(([key, value]) => (
                <div
                  key={key}
                  style={{
                    padding: '12px',
                    backgroundColor: 'rgb(var(--canvas-surface))',
                    borderRadius: '6px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                  }}
                >
                  <div style={{ color: 'rgb(var(--canvas-fg-3))', marginBottom: '4px' }}>{key}</div>
                  <div style={{ color: 'rgb(var(--canvas-fg-1))', fontWeight: 500, wordBreak: 'break-all' }}>
                    {value}
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ color: 'rgb(var(--canvas-fg-1))', fontSize: '18px', marginBottom: '16px' }}>
            Semantic Status Colors
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
            {Object.entries(tokens)
              .filter(([key]) => key.startsWith('--status-'))
              .map(([key, value]) => (
                <div
                  key={key}
                  style={{
                    padding: '12px',
                    backgroundColor: 'rgb(var(--canvas-surface))',
                    borderRadius: '6px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                  }}
                >
                  <div style={{ color: 'rgb(var(--canvas-fg-3))', marginBottom: '4px' }}>{key}</div>
                  <div style={{ color: 'rgb(var(--canvas-fg-1))', fontWeight: 500, wordBreak: 'break-all' }}>
                    {value}
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ color: 'rgb(var(--canvas-fg-1))', fontSize: '18px', marginBottom: '16px' }}>
            Radius Tokens
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
            {Object.entries(tokens)
              .filter(([key]) => key.startsWith('--radius-'))
              .map(([key, value]) => (
                <div
                  key={key}
                  style={{
                    padding: '12px',
                    backgroundColor: 'rgb(var(--canvas-surface))',
                    borderRadius: '6px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                  }}
                >
                  <div style={{ color: 'rgb(var(--canvas-fg-3))', marginBottom: '4px' }}>{key}</div>
                  <div style={{ color: 'rgb(var(--canvas-fg-1))', fontWeight: 500, wordBreak: 'break-all' }}>
                    {value}
                  </div>
                </div>
              ))}
          </div>
        </div>

        <div style={{ marginBottom: '32px' }}>
          <h2 style={{ color: 'rgb(var(--canvas-fg-1))', fontSize: '18px', marginBottom: '16px' }}>
            Typography Tokens
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '12px' }}>
            {Object.entries(tokens)
              .filter(([key]) => key.startsWith('--font-'))
              .map(([key, value]) => (
                <div
                  key={key}
                  style={{
                    padding: '12px',
                    backgroundColor: 'rgb(var(--canvas-surface))',
                    borderRadius: '6px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                  }}
                >
                  <div style={{ color: 'rgb(var(--canvas-fg-3))', marginBottom: '4px' }}>{key}</div>
                  <div style={{ color: 'rgb(var(--canvas-fg-1))', fontWeight: 500, wordBreak: 'break-all' }}>
                    {value}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
