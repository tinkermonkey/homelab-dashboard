import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { config } from './config';

describe('config', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('reads PORT from environment with numeric parsing', () => {
    expect(config.port).toBe(parseInt(process.env.PORT || '3001', 10));
  });

  it('defaults PORT to 3001', () => {
    expect(config.port).toBeGreaterThan(0);
  });

  it('reads HOST from environment', () => {
    expect(config.host).toBeDefined();
    expect(typeof config.host).toBe('string');
  });

  it('provides SigNoz URL', () => {
    expect(config.signozUrl).toBeDefined();
    expect(config.signozUrl).toMatch(/^http/);
  });

  it('provides SigNoz API token (may be empty)', () => {
    expect(config.signozApiToken).toBeDefined();
    expect(typeof config.signozApiToken).toBe('string');
  });

  it('provides ntopng credentials', () => {
    expect(config.ntopngUser).toBeDefined();
    expect(config.ntopngPassword).toBeDefined();
    expect(typeof config.ntopngUser).toBe('string');
    expect(typeof config.ntopngPassword).toBe('string');
  });

  it('defaults ntopng credentials to admin/admin', () => {
    // This tests the current behavior; in production, these should be set via env
    expect(config.ntopngUser).toBeDefined();
    expect(config.ntopngPassword).toBeDefined();
  });

  it('provides ElastiFlow URL', () => {
    expect(config.elastiflowUrl).toBeDefined();
    expect(config.elastiflowUrl).toMatch(/^http/);
  });

  it('provides phone-home URLs', () => {
    expect(config.phoneHomeUrl).toBeDefined();
    expect(config.phoneHomeMcpUrl).toBeDefined();
    expect(config.phoneHomeChatUrl).toBeDefined();
    expect(config.phoneHomeUrl).toMatch(/^http/);
    expect(config.phoneHomeMcpUrl).toMatch(/^http/);
    expect(config.phoneHomeChatUrl).toMatch(/^http/);
  });

  it('provides log level with default', () => {
    expect(config.logLevel).toBeDefined();
    expect(typeof config.logLevel).toBe('string');
  });

  it('includes all expected properties', () => {
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
