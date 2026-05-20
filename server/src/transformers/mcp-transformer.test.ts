import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { transformDockerData, transformTopologyData } from './mcp-transformer.js';
import * as mcpClientModule from '../clients/mcp-client.js';
import * as mockDataModule from '../mock-data.js';

describe('MCP Transformer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('transformDockerData', () => {
    it('returns Docker data when MCP call succeeds', async () => {
      const mockDockerData = {
        hosts: [
          {
            id: 'nyx',
            containers: [],
            networks: [],
            volumes: [],
          },
        ],
      };

      vi.spyOn(mcpClientModule, 'mcpClient', 'get').mockReturnValue({
        getDockerInventory: vi.fn().mockResolvedValue(mockDockerData),
      } as any);

      vi.spyOn(mockDataModule, 'getDockerData').mockReturnValue({
        hosts: [],
      } as any);

      const result = await transformDockerData();

      expect(result.data).toEqual(mockDockerData);
      expect(result.degraded).toEqual([]);
      expect(result.source).toBe('real');
    });

    it('falls back to mock data when MCP call fails', async () => {
      const mockFallbackData = { hosts: [] };

      vi.spyOn(mcpClientModule, 'mcpClient', 'get').mockReturnValue({
        getDockerInventory: vi.fn().mockRejectedValue(new Error('Network error')),
      } as any);

      vi.spyOn(mockDataModule, 'getDockerData').mockReturnValue(mockFallbackData as any);

      const result = await transformDockerData();

      expect(result.data).toEqual(mockFallbackData);
      expect(result.degraded).toContain('phone-home');
      expect(result.source).toBe('mock');
    });

    it('falls back to mock data when data structure is invalid', async () => {
      const mockFallbackData = { hosts: [] };

      vi.spyOn(mcpClientModule, 'mcpClient', 'get').mockReturnValue({
        getDockerInventory: vi.fn().mockResolvedValue({ invalid: 'structure' }),
      } as any);

      vi.spyOn(mockDataModule, 'getDockerData').mockReturnValue(mockFallbackData as any);

      const result = await transformDockerData();

      expect(result.data).toEqual(mockFallbackData);
      expect(result.degraded).toContain('phone-home');
      expect(result.source).toBe('mock');
    });

    it('validates host structure', async () => {
      // Missing required fields
      const invalidData = {
        hosts: [
          {
            id: 'nyx',
            // Missing containers, networks, volumes
          },
        ],
      };

      vi.spyOn(mcpClientModule, 'mcpClient', 'get').mockReturnValue({
        getDockerInventory: vi.fn().mockResolvedValue(invalidData),
      } as any);

      vi.spyOn(mockDataModule, 'getDockerData').mockReturnValue({
        hosts: [],
      } as any);

      const result = await transformDockerData();

      expect(result.degraded).toContain('phone-home');
      expect(result.source).toBe('mock');
    });

    it('validates that hosts is an array', async () => {
      const invalidData = {
        hosts: 'not-an-array',
      };

      vi.spyOn(mcpClientModule, 'mcpClient', 'get').mockReturnValue({
        getDockerInventory: vi.fn().mockResolvedValue(invalidData),
      } as any);

      vi.spyOn(mockDataModule, 'getDockerData').mockReturnValue({
        hosts: [],
      } as any);

      const result = await transformDockerData();

      expect(result.degraded).toContain('phone-home');
      expect(result.source).toBe('mock');
    });
  });

  describe('transformTopologyData', () => {
    it('returns topology data when MCP call succeeds', async () => {
      const mockTopologyData = {
        hosts: ['nyx', 'helios'],
        bots: [
          {
            id: 'bot1',
            label: 'Bot 1',
            mcps: [],
            delegates: [],
          },
        ],
      };

      vi.spyOn(mcpClientModule, 'mcpClient', 'get').mockReturnValue({
        getTopologyData: vi.fn().mockResolvedValue(mockTopologyData),
      } as any);

      vi.spyOn(mockDataModule, 'getTopologyData').mockReturnValue({
        hosts: [],
        bots: [],
      } as any);

      const result = await transformTopologyData();

      expect(result.data).toEqual(mockTopologyData);
      expect(result.degraded).toEqual([]);
      expect(result.source).toBe('real');
    });

    it('falls back to mock data when MCP call fails', async () => {
      const mockFallbackData = { hosts: [], bots: [] };

      vi.spyOn(mcpClientModule, 'mcpClient', 'get').mockReturnValue({
        getTopologyData: vi.fn().mockRejectedValue(new Error('Connection refused')),
      } as any);

      vi.spyOn(mockDataModule, 'getTopologyData').mockReturnValue(mockFallbackData as any);

      const result = await transformTopologyData();

      expect(result.data).toEqual(mockFallbackData);
      expect(result.degraded).toContain('phone-home');
      expect(result.source).toBe('mock');
    });

    it('falls back to mock data when data structure is invalid', async () => {
      const mockFallbackData = { hosts: [], bots: [] };

      vi.spyOn(mcpClientModule, 'mcpClient', 'get').mockReturnValue({
        getTopologyData: vi.fn().mockResolvedValue({ invalid: 'structure' }),
      } as any);

      vi.spyOn(mockDataModule, 'getTopologyData').mockReturnValue(mockFallbackData as any);

      const result = await transformTopologyData();

      expect(result.data).toEqual(mockFallbackData);
      expect(result.degraded).toContain('phone-home');
      expect(result.source).toBe('mock');
    });

    it('validates hosts is string array', async () => {
      const invalidData = {
        hosts: ['nyx', 123], // Invalid: contains non-string
        bots: [],
      };

      vi.spyOn(mcpClientModule, 'mcpClient', 'get').mockReturnValue({
        getTopologyData: vi.fn().mockResolvedValue(invalidData),
      } as any);

      vi.spyOn(mockDataModule, 'getTopologyData').mockReturnValue({
        hosts: [],
        bots: [],
      } as any);

      const result = await transformTopologyData();

      expect(result.degraded).toContain('phone-home');
    });

    it('validates bots structure', async () => {
      const invalidData = {
        hosts: ['nyx'],
        bots: [
          {
            id: 'bot1',
            label: 'Bot 1',
            // Missing mcps and delegates
          },
        ],
      };

      vi.spyOn(mcpClientModule, 'mcpClient', 'get').mockReturnValue({
        getTopologyData: vi.fn().mockResolvedValue(invalidData),
      } as any);

      vi.spyOn(mockDataModule, 'getTopologyData').mockReturnValue({
        hosts: [],
        bots: [],
      } as any);

      const result = await transformTopologyData();

      expect(result.degraded).toContain('phone-home');
    });

    it('validates bots mcps is an array', async () => {
      const invalidData = {
        hosts: ['nyx'],
        bots: [
          {
            id: 'bot1',
            label: 'Bot 1',
            mcps: 'not-an-array',
            delegates: [],
          },
        ],
      };

      vi.spyOn(mcpClientModule, 'mcpClient', 'get').mockReturnValue({
        getTopologyData: vi.fn().mockResolvedValue(invalidData),
      } as any);

      vi.spyOn(mockDataModule, 'getTopologyData').mockReturnValue({
        hosts: [],
        bots: [],
      } as any);

      const result = await transformTopologyData();

      expect(result.degraded).toContain('phone-home');
    });

    it('validates bots delegates is an array', async () => {
      const invalidData = {
        hosts: ['nyx'],
        bots: [
          {
            id: 'bot1',
            label: 'Bot 1',
            mcps: [],
            delegates: null,
          },
        ],
      };

      vi.spyOn(mcpClientModule, 'mcpClient', 'get').mockReturnValue({
        getTopologyData: vi.fn().mockResolvedValue(invalidData),
      } as any);

      vi.spyOn(mockDataModule, 'getTopologyData').mockReturnValue({
        hosts: [],
        bots: [],
      } as any);

      const result = await transformTopologyData();

      expect(result.degraded).toContain('phone-home');
    });

    it('handles null input', async () => {
      const mockFallbackData = { hosts: [], bots: [] };

      vi.spyOn(mcpClientModule, 'mcpClient', 'get').mockReturnValue({
        getTopologyData: vi.fn().mockResolvedValue(null),
      } as any);

      vi.spyOn(mockDataModule, 'getTopologyData').mockReturnValue(mockFallbackData as any);

      const result = await transformTopologyData();

      expect(result.degraded).toContain('phone-home');
    });

    it('handles undefined input', async () => {
      const mockFallbackData = { hosts: [], bots: [] };

      vi.spyOn(mcpClientModule, 'mcpClient', 'get').mockReturnValue({
        getTopologyData: vi.fn().mockResolvedValue(undefined),
      } as any);

      vi.spyOn(mockDataModule, 'getTopologyData').mockReturnValue(mockFallbackData as any);

      const result = await transformTopologyData();

      expect(result.degraded).toContain('phone-home');
    });
  });
});
