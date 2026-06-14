import React from 'react';
import {
  PageHeader, Panel, Chip, Field, Select, SegmentedControl, TriState, Button,
} from '@tinkermonkey/heimdall-ui';
import { usePersistedState } from '../../utils/localStorage';
import { useCluster } from '../../hooks/useAPI';
import { asEyebrow } from '../../utils/pageHeader';

export const SettingsView: React.FC = () => {
  const { data: clusterData } = useCluster();
  const clusterName = clusterData?.cluster?.name ?? 'homelab';
  const clusterDomain = clusterData?.cluster?.domain;
  const slug = clusterName.toLowerCase();

  const [darkCanvas, setDarkCanvas] = usePersistedState('darkCanvas', false);
  const [density, setDensity] = usePersistedState<string>('density', 'regular');
  const [showAlerts, setShowAlerts] = usePersistedState('showAlerts', true);
  const [chatVisible, setChatVisible] = usePersistedState('chatVisible', true);

  return (
    <>
      <PageHeader
        eyebrow={asEyebrow(
          <span className="eyebrow-row">
            <Chip variant="neutral">settings</Chip>
          </span>
        )}
        idChip={`/cluster/${slug}/settings`}
        title="Configuration"
        subtitle="Dashboard preferences for the Heimdall control plane. Saved to this browser."
      />
      <Panel title="Cluster identity" subtitle="set in the deployment environment">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 460 }}>
          <Field
            label="Cluster name"
            hint="configured via the server CLUSTER_NAME env; shown in the topbar"
          >
            <div className="row" style={{ gap: 8, alignItems: 'center' }}>
              <Chip variant="neutral" form="id-tag">{clusterName}</Chip>
              {clusterDomain && (
                <span style={{ fontSize: 13, color: 'rgb(var(--canvas-fg-2))' }}>
                  {clusterDomain}
                </span>
              )}
            </div>
          </Field>
        </div>
      </Panel>
      <Panel title="Display" subtitle="appearance & layout">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 460 }}>
          <Field label="Default theme">
            <Select
              value={darkCanvas ? 'dark' : 'light'}
              onChange={value => setDarkCanvas(value === 'dark')}
              ariaLabel="Theme"
            >
              <Select.Item value="dark">Dark canvas</Select.Item>
              <Select.Item value="light">Light canvas</Select.Item>
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
        </div>
      </Panel>
      <Panel title="Interface" subtitle="panels & widgets">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 460 }}>
          <Field label="Alerts">
            <label className="row" style={{ gap: 8, fontSize: 13, color: 'rgb(var(--canvas-fg-2))' }}>
              <TriState
                checked={showAlerts}
                onChange={e => setShowAlerts((e.target as HTMLInputElement).checked)}
              />
              Show the alerts strip on the overview
            </label>
          </Field>
          <Field label="Bot console">
            <label className="row" style={{ gap: 8, fontSize: 13, color: 'rgb(var(--canvas-fg-2))' }}>
              <TriState
                checked={chatVisible}
                onChange={e => setChatVisible((e.target as HTMLInputElement).checked)}
              />
              Keep the bot console rail open
            </label>
          </Field>
          <div className="row" style={{ gap: 8 }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDarkCanvas(false);
                setDensity('regular');
                setShowAlerts(true);
                setChatVisible(true);
              }}
            >
              Reset to defaults
            </Button>
          </div>
        </div>
      </Panel>
    </>
  );
};
