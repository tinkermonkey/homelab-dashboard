import { config } from '../config.js';
import { fetchWithTimeout } from '../utils/fetch-with-timeout.js';
import type { Alert, AlertSeverity, AlertState } from '@homelab/shared';

export class SigNozClient {
  private baseUrl: string;
  private apiToken: string;

  constructor(baseUrl: string = config.signozUrl, apiToken: string = config.signozApiToken) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiToken = apiToken;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiToken) headers['SIGNOZ-API-KEY'] = this.apiToken;
    return headers;
  }

  private normalizeSeverity(severity: string | undefined): AlertSeverity {
    const validSeverities: AlertSeverity[] = ['critical', 'warning', 'info'];
    const normalized = severity?.toLowerCase();
    return validSeverities.includes(normalized as AlertSeverity) ? (normalized as AlertSeverity) : 'info';
  }

  private normalizeState(state: string | undefined): AlertState {
    const validStates: AlertState[] = ['active', 'resolved'];
    const normalized = state?.toLowerCase();
    return validStates.includes(normalized as AlertState) ? (normalized as AlertState) : 'active';
  }

  async getActiveAlerts(): Promise<Alert[]> {
    const url = new URL(`${this.baseUrl}/api/v1/alerts`);
    url.searchParams.set('state', 'active');

    try {
      const response = await fetchWithTimeout(url.toString(), {
        method: 'GET',
        headers: this.getHeaders(),
        timeout: 10000,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as {
        status: string;
        data?: Array<{
          labels?: Record<string, string>;
          state?: string;
        }>;
      };

      if (data.status !== 'success' || !data.data) return [];

      return data.data.map((alert) => ({
        name: alert.labels?.alertname || 'Unknown Alert',
        severity: this.normalizeSeverity(alert.labels?.severity),
        state: this.normalizeState(alert.state),
        labels: alert.labels || {},
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to fetch active alerts: ${message}`, { cause: error });
    }
  }
}

export const signozClient = new SigNozClient();
