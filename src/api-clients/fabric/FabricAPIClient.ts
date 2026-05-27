/**
 * Microsoft Fabric REST API client (axios)
 * Base URL: https://api.fabric.microsoft.com/v1
 *
 * Use for workspace/item discovery and metadata. For row-level table checks,
 * prefer the Warehouse/Lakehouse SQL endpoint via SqlServerClient + Entra token.
 */

import axios, { AxiosInstance } from 'axios';
import * as https from 'https';
import { config } from '../../config/config';
import { logger } from '../../utils/logger';
import { FabricAuth } from '../../utils/fabric-auth';

export interface FabricWorkspaceItem {
  id: string;
  displayName?: string;
  description?: string;
  type?: string;
  workspaceId?: string;
  [key: string]: unknown;
}

export class FabricAPIClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor() {
    const fc = config.getFabricConfig();
    this.baseUrl = (fc.apiBaseUrl || 'https://api.fabric.microsoft.com/v1').replace(/\/+$/, '');

    const disableSSL =
      process.env.FABRIC_REJECT_UNAUTHORIZED === 'false' || process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0';

    const httpsAgent = new https.Agent({
      rejectUnauthorized: !disableSSL,
    });

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      httpsAgent,
      timeout: config.getTimeouts().api || 60000,
    });

    this.client.interceptors.request.use(async (reqConfig) => {
      const { accessToken } = await FabricAuth.authenticate();
      reqConfig.headers.Authorization = `Bearer ${accessToken}`;
      return reqConfig;
    });
  }

  isConfigured(): boolean {
    const fc = config.getFabricConfig();
    return !!(fc.tenantId && fc.clientId && fc.clientSecret);
  }

  /**
   * GET /workspaces/{workspaceId}
   */
  async getWorkspace(workspaceId: string): Promise<Record<string, unknown>> {
    const id = workspaceId.trim();
    logger.info(`Fabric API: get workspace ${id}`);
    const { data } = await this.client.get<Record<string, unknown>>(`/workspaces/${id}`);
    return data;
  }

  /**
   * GET /workspaces/{workspaceId}/items
   */
  async listWorkspaceItems(workspaceId: string): Promise<FabricWorkspaceItem[]> {
    const id = workspaceId.trim();
    logger.info(`Fabric API: list items for workspace ${id}`);
    const { data } = await this.client.get<{ value?: FabricWorkspaceItem[] }>(
      `/workspaces/${id}/items`
    );
    return data.value ?? [];
  }
}
