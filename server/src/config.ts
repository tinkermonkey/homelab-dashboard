// Configuration from environment variables
export const config = {
  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || 'localhost',

  // SigNoz
  signozUrl: process.env.SIGNOZ_URL || 'http://localhost:4317',
  signozApiToken: process.env.SIGNOZ_API_TOKEN || '',

  // ntopng
  ntopngUrl: process.env.NTOPNG_URL || 'http://localhost:3000',
  ntopngUser: process.env.NTOPNG_USER || 'admin',
  ntopngPassword: process.env.NTOPNG_PASSWORD || 'admin',

  // ElastiFlow
  elastiflowUrl: process.env.ELASTIFLOW_URL || 'http://localhost:9090',

  // phone-home
  phoneHomeUrl: process.env.PHONE_HOME_URL || 'http://localhost:8000',
  phoneHomeMcpUrl: process.env.PHONE_HOME_MCP_URL || 'http://agent:3210/mcp/',
  phoneHomeChatUrl: process.env.PHONE_HOME_CHAT_URL || 'http://localhost:8000/chat',

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
};
