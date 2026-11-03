import { config as dotenvConfig } from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Walk up from server/ to the repo root so dotenv finds .env regardless of CWD
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
dotenvConfig({ path: resolve(repoRoot, '.env') });

// Configuration from environment variables
export const config = {
  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || 'localhost',

  // SigNoz
  signozUrl: process.env.SIGNOZ_URL || 'http://localhost:4317',
  signozApiToken: process.env.SIGNOZ_API_TOKEN || '',

  // ntopng — token auth via Authorization header
  ntopngUrl: process.env.NTOPNG_URL || 'http://localhost:3000',
  ntopngToken: process.env.NTOPNG_TOKEN || '',

  // ElastiFlow (Elasticsearch) — Basic auth
  elastiflowUrl: process.env.ELASTIFLOW_URL || 'http://localhost:9200',
  elastiflowUser: process.env.ELASTIFLOW_USER || '',
  elastiflowPassword: process.env.ELASTIFLOW_PASSWORD || '',

  // homelab-data-mcp (phone-home repo) — MCP Streamable HTTP with a static
  // bearer token. Source of UDM, container inventory and SigNoz log data.
  homelabDataMcpUrl: process.env.HOMELAB_DATA_MCP_URL || 'http://localhost:3220/mcp/',
  homelabDataMcpToken: process.env.HOMELAB_DATA_MCP_TOKEN || '',

  // Cluster identity (shown in dashboard chrome)
  clusterName: process.env.CLUSTER_NAME || 'Homelab',
  clusterLocation: process.env.CLUSTER_LOCATION || 'rack-01 · basement',
  clusterDomain: process.env.CLUSTER_DOMAIN || 'local',

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
};
