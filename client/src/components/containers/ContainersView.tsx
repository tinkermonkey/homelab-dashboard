import React, { useState, useMemo } from "react";
import { PageHeader, TabBar, FilterBar, Chip, Button } from "@tinkermonkey/heimdall-ui";
import { useDocker } from "../../hooks/useAPI";
import { Icon } from "../shared/Icon";
import { DegradationBanner } from "../shared/DegradationBanner";
import { ContainersTab } from "./ContainersTab";
import { NetworksTab } from "./NetworksTab";
import { VolumesTab } from "./VolumesTab";

type ActiveTab = "containers" | "networks" | "volumes";

export const ContainersView: React.FC = () => {
  const { data, isLoading, error } = useDocker();
  const [activeTab, setActiveTab] = useState<ActiveTab>("containers");
  const [query, setQuery] = useState("");

  const totalContainers = useMemo(
    () => data?.hosts.reduce((a, h) => a + h.containers.length, 0) ?? 0,
    [data?.hosts],
  );
  const runningContainers = useMemo(
    () => data?.hosts.reduce((a, h) => a + h.containers.filter(c => c.state === 'running').length, 0) ?? 0,
    [data?.hosts],
  );
  const totalNetworks = useMemo(
    () => data?.hosts.reduce((a, h) => a + h.networks.length, 0) ?? 0,
    [data?.hosts],
  );
  const totalVolumes = useMemo(
    () => data?.hosts.reduce((a, h) => a + h.volumes.length, 0) ?? 0,
    [data?.hosts],
  );

  const tabs = useMemo(() => [
    { id: "containers", label: "Containers", count: totalContainers },
    { id: "networks", label: "Networks", count: totalNetworks },
    { id: "volumes", label: "Volumes", count: totalVolumes },
  ], [totalContainers, totalNetworks, totalVolumes]);

  const showingCount = useMemo(() => {
    if (!data || activeTab !== "containers") return totalContainers;
    if (!query) return totalContainers;
    return data.hosts.reduce((n, h) =>
      n + h.containers.filter(c =>
        c.name.toLowerCase().includes(query) || c.image.toLowerCase().includes(query)
      ).length, 0
    );
  }, [data, activeTab, query, totalContainers]);

  if (isLoading) {
    return <div style={{ padding: 24 }}>Loading…</div>;
  }

  if (error || !data) {
    return <div style={{ padding: 24 }}>Error loading Docker data</div>;
  }

  const degraded = data.degraded;
  const dataSource = data.source;

  return (
    <>
      <PageHeader
        eyebrow={
          (<span className="eyebrow-row">
            <Chip variant="cyan">docker · {data.hosts.length} engines</Chip>
            <span className="mono-meta">{totalContainers} containers · {runningContainers} running</span>
          </span>) as unknown as string
        }
        idChip="/cluster/asgard/docker"
        title="Containers"
        subtitle="Docker inventory aggregated across every host engine — state, health, ports, and mounts."
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="secondary" size="sm">
              <Icon name="refresh" size={13} />
              Prune
            </Button>
            <Button variant="primary" size="sm">
              <Icon name="plus" size={13} />
              Deploy
            </Button>
          </div>
        }
      />

      <DegradationBanner degraded={degraded} dataSource={dataSource} />

      <TabBar
        tabs={tabs}
        activeTabId={activeTab}
        onSelectTab={(tabId) => setActiveTab(tabId as ActiveTab)}
      />

      {activeTab === "containers" && (
        <FilterBar
          searchPlaceholder="Filter containers by name or image…"
          onSearchChange={(v) => setQuery(v.toLowerCase())}
          showingCount={showingCount}
          totalCount={totalContainers}
        />
      )}

      {activeTab === "containers" && <ContainersTab hosts={data.hosts} query={query} />}
      {activeTab === "networks" && <NetworksTab hosts={data.hosts} />}
      {activeTab === "volumes" && <VolumesTab hosts={data.hosts} />}
    </>
  );
};
