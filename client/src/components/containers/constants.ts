export const ROLE_BY_HOST: Record<string, string> = {
  nyx: 'compute',
  helios: 'storage',
  aether: 'k8s',
  vega: 'gpu',
};

export const getNetworkColor = (name: string): string => {
  const colorMap: Record<string, string> = {
    proxy_net: 'cyan',
    iot_net: 'amber',
    media_net: 'violet',
    dev_net: 'emerald',
    ai_net: 'rose',
    obs_net: 'cyan',
    cloud_net: 'emerald',
    backup_net: 'cyan',
    net_net: 'violet',
    cni0: 'amber',
  };
  return colorMap[name] || 'neutral';
};
