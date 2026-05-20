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

  // phone-home — bearer token auth for both MCP REST API and chat
  phoneHomeUrl: process.env.PHONE_HOME_URL || 'http://localhost:8000',
  phoneHomeChatUrl: process.env.PHONE_HOME_CHAT_URL || 'http://localhost:8000/chat',
  phoneHomeChatToken: process.env.PHONE_HOME_CHAT_TOKEN || '',

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
};
