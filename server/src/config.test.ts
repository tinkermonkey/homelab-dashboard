import { describe, it, expect, afterEach, vi } from 'vitest';

describe('config', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it('reads PORT from environment with numeric parsing', async () => {
    process.env.PORT = '9999';
    vi.resetModules();
    const { config } = await import('./config.js');
    expect(config.port).toBe(9999);
  });

  it('defaults PORT to 3001', async () => {
    delete process.env.PORT;
    vi.resetModules();
    const { config } = await import('./config.js');
    expect(config.port).toBe(3001);
  });

  it('reads HOST from environment', async () => {
    process.env.HOST = 'example.com';
    vi.resetModules();
    const { config } = await import('./config.js');
    expect(config.host).toBe('example.com');
  });

  it('defaults HOST to localhost', async () => {
    delete process.env.HOST;
    vi.resetModules();
    const { config } = await import('./config.js');
    expect(config.host).toBe('localhost');
  });

  it('reads SIGNOZ_URL from environment', async () => {
    process.env.SIGNOZ_URL = 'http://signoz:4317';
    vi.resetModules();
    const { config } = await import('./config.js');
    expect(config.signozUrl).toBe('http://signoz:4317');
  });

  it('reads SIGNOZ_API_TOKEN from environment', async () => {
    process.env.SIGNOZ_API_TOKEN = 'test-token';
    vi.resetModules();
    const { config } = await import('./config.js');
    expect(config.signozApiToken).toBe('test-token');
  });

  it('reads ntopng token from environment', async () => {
    process.env.NTOPNG_TOKEN = 'my-ntopng-token';
    vi.resetModules();
    const { config } = await import('./config.js');
    expect(config.ntopngToken).toBe('my-ntopng-token');
  });

  it('defaults ntopng token to empty string', async () => {
    process.env.NTOPNG_TOKEN = '';
    vi.resetModules();
    const { config } = await import('./config.js');
    expect(config.ntopngToken).toBe('');
  });

  it('reads ElastiFlow credentials from environment', async () => {
    process.env.ELASTIFLOW_URL = 'http://elastiflow:9200';
    process.env.ELASTIFLOW_USER = 'elastic';
    process.env.ELASTIFLOW_PASSWORD = 'secret';
    vi.resetModules();
    const { config } = await import('./config.js');
    expect(config.elastiflowUrl).toBe('http://elastiflow:9200');
    expect(config.elastiflowUser).toBe('elastic');
    expect(config.elastiflowPassword).toBe('secret');
  });

  it('reads homelab-data MCP URL and token from environment', async () => {
    process.env.HOMELAB_DATA_MCP_URL = 'http://192.168.0.10:3220/mcp/';
    process.env.HOMELAB_DATA_MCP_TOKEN = 'my-bearer-token';
    vi.resetModules();
    const { config } = await import('./config.js');
    expect(config.homelabDataMcpUrl).toBe('http://192.168.0.10:3220/mcp/');
    expect(config.homelabDataMcpToken).toBe('my-bearer-token');
  });

  it('defaults homelab-data MCP URL to localhost and token to empty', async () => {
    process.env.HOMELAB_DATA_MCP_URL = '';
    process.env.HOMELAB_DATA_MCP_TOKEN = '';
    vi.resetModules();
    const { config } = await import('./config.js');
    expect(config.homelabDataMcpUrl).toBe('http://localhost:3220/mcp/');
    expect(config.homelabDataMcpToken).toBe('');
  });

  it('reads LOG_LEVEL from environment', async () => {
    process.env.LOG_LEVEL = 'debug';
    vi.resetModules();
    const { config } = await import('./config.js');
    expect(config.logLevel).toBe('debug');
  });

  it('includes all expected properties', async () => {
    vi.resetModules();
    const { config } = await import('./config.js');
    const expectedKeys = [
      'port',
      'host',
      'signozUrl',
      'signozApiToken',
      'ntopngUrl',
      'ntopngToken',
      'elastiflowUrl',
      'elastiflowUser',
      'elastiflowPassword',
      'homelabDataMcpUrl',
      'homelabDataMcpToken',
      'logLevel',
    ];

    expectedKeys.forEach((key) => {
      expect(config).toHaveProperty(key);
    });
  });
});
