import React, { useState } from 'react';
import {
  PageHeader, Panel, Chip, ConfigTile, Field, TextInput, Select, SegmentedControl, TriState, Button, Toast,
} from '@tinkermonkey/heimdall-ui';
import { usePersistedState } from '../../utils/localStorage';
import { asEyebrow } from '../../utils/pageHeader';

const SECTIONS = [
  { id: 'cluster', icon: 'settings' as const, title: 'Cluster', description: 'Name, domain, polling cadence', summary: [] },
  { id: 'access',  icon: 'lock' as const,     title: 'Access & SSO', description: 'OIDC, sessions, API tokens', summary: [] },
  { id: 'alerts',  icon: 'bell' as const,      title: 'Alerting', description: 'Routes, silences, thresholds', summary: [] },
  { id: 'backup',  icon: 'download' as const,   title: 'Backups', description: 'restic targets & schedule', summary: [] },
];

export const SettingsView: React.FC = () => {
  const [clusterName, setClusterName] = usePersistedState('settings.clusterName', 'asgard');
  const [darkCanvas, setDarkCanvas] = usePersistedState('darkCanvas', false);
  const [density, setDensity] = usePersistedState<string>('density', 'regular');
  const [telemetry, setTelemetry] = usePersistedState('settings.telemetry', true);
  const [pollInterval, setPollInterval] = usePersistedState('settings.pollInterval', '15');
  const [toastTitle, setToastTitle] = useState<string | null>(null);

  return (
    <>
      <PageHeader
        eyebrow={asEyebrow(
          <span className="eyebrow-row">
            <Chip variant="neutral">settings</Chip>
          </span>
        )}
        idChip="/cluster/asgard/settings"
        title="Configuration"
        subtitle="Cluster-wide preferences for the Heimdall control plane."
      />
      <Panel title="Sections">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {SECTIONS.map(s => (
            <ConfigTile
              key={s.id}
              icon={s.icon}
              title={s.title}
              description={s.description}
              summary={s.summary}
              onClick={() => setToastTitle(`${s.title} settings not yet configurable`)}
            />
          ))}
        </div>
      </Panel>
      <Panel title="General" subtitle="cluster identity & display">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 460 }}>
          <Field label="Cluster name" hint="shown in the topbar">
            <TextInput
              value={clusterName}
              onChange={e => setClusterName((e.target as HTMLInputElement).value)}
              mono
            />
          </Field>
          <Field label="Polling interval" hint="seconds between cluster data fetches">
            <Select
              value={pollInterval}
              onChange={e => setPollInterval((e.target as HTMLSelectElement).value)}
              aria-label="Polling interval"
            >
              <option value="5">5 seconds</option>
              <option value="15">15 seconds (default)</option>
              <option value="30">30 seconds</option>
              <option value="60">60 seconds</option>
            </Select>
          </Field>
          <Field label="Default theme">
            <Select
              value={darkCanvas ? 'dark' : 'light'}
              onChange={e => setDarkCanvas((e.target as HTMLSelectElement).value === 'dark')}
              aria-label="Theme"
            >
              <option value="dark">Dark canvas</option>
              <option value="light">Light canvas</option>
            </Select>
          </Field>
          <Field label="Density">
            <SegmentedControl
              value={density}
              onChange={v => setDensity(v as string)}
              options={[
                { value: 'regular', label: 'Regular' },
                { value: 'compact', label: 'Compact' },
              ]}
            />
          </Field>
          <Field label="Telemetry">
            <label className="row" style={{ gap: 8, fontSize: 13, color: 'rgb(var(--canvas-fg-2))' }}>
              <TriState
                checked={telemetry}
                onChange={e => setTelemetry((e.target as HTMLInputElement).checked)}
              />
              Send anonymous usage metrics
            </label>
          </Field>
          <div className="row" style={{ gap: 8 }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setClusterName('asgard');
                setDarkCanvas(false);
                setDensity('regular');
                setTelemetry(true);
                setPollInterval('15');
              }}
            >
              Reset to defaults
            </Button>
          </div>
        </div>
      </Panel>
      {toastTitle && (
        <Toast
          isOpen
          onClose={() => setToastTitle(null)}
          title={toastTitle}
          subtitle="This section will be configurable once the backend is connected."
          variant="info"
          duration={4000}
        />
      )}
    </>
  );
};
