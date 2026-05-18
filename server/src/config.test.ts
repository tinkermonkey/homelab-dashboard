import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

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

  it('reads ntopng credentials from environment', async () => {
    process.env.NTOPNG_USER = 'custom-user';
    process.env.NTOPNG_PASSWORD = 'custom-pass';
    vi.resetModules();
    const { config } = await import('./config.js');
    expect(config.ntopngUser).toBe('custom-user');
    expect(config.ntopngPassword).toBe('custom-pass');
  });

  it('defaults ntopng credentials to admin/admin', async () => {
    delete process.env.NTOPNG_USER;
    delete process.env.NTOPNG_PASSWORD;
    vi.resetModules();
    const { config } = await import('./config.js');
    expect(config.ntopngUser).toBe('admin');
    expect(config.ntopngPassword).toBe('admin');
  });

  it('reads ElastiFlow URL from environment', async () => {
    process.env.ELASTIFLOW_URL = 'http://elastiflow:9090';
    vi.resetModules();
    const { config } = await import('./config.js');
    expect(config.elastiflowUrl).toBe('http://elastiflow:9090');
  });

  it('reads phone-home URLs from environment', async () => {
    process.env.PHONE_HOME_URL = 'http://phone-home:8000';
    process.env.PHONE_HOME_MCP_URL = 'http://phone-home:3210/mcp/';
    process.env.PHONE_HOME_CHAT_URL = 'http://phone-home:8000/chat';
    vi.resetModules();
    const { config } = await import('./config.js');
    expect(config.phoneHomeUrl).toBe('http://phone-home:8000');
    expect(config.phoneHomeMcpUrl).toBe('http://phone-home:3210/mcp/');
    expect(config.phoneHomeChatUrl).toBe('http://phone-home:8000/chat');
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
      'ntopngUser',
      'ntopngPassword',
      'elastiflowUrl',
      'phoneHomeUrl',
      'phoneHomeMcpUrl',
      'phoneHomeChatUrl',
      'logLevel',
    ];

    expectedKeys.forEach((key) => {
      expect(config).toHaveProperty(key);
    });
  });
});
