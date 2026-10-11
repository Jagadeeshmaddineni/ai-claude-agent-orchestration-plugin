import { BaseHttpClient, notConfiguredError } from '../../shared';

/**
 * Confluence service configuration.
 */
export interface ConfluenceConfig {
  enabled: boolean;
  deploymentType: 'cloud' | 'datacenter';
  host: string;
  token: string;
  /** @deprecated Use `host` instead. Kept for backwards compatibility. */
  siteName?: string;
  email?: string;
  /** @deprecated Use `token` instead. Kept for backwards compatibility. */
  apiToken?: string;
  scope?: 'read' | 'write';
}

/**
 * HTTP client for Confluence REST API.
 */
export class ConfluenceClient extends BaseHttpClient {
  private readonly config: ConfluenceConfig;

  constructor(config: ConfluenceConfig) {
    let baseUrl: string;
    let getAuthHeaders: () => Record<string, string>;

    if (config.deploymentType === 'cloud') {
      const rawSiteName = config.siteName || config.host || '';
      const cloudSiteName = rawSiteName
        .replace(/^https?:\/\//, '')
        .replace(/\/$/, '')
        .replace(/\.atlassian\.net$/i, '');
      baseUrl = `https://${cloudSiteName}.atlassian.net/wiki/rest/api`;

      getAuthHeaders = () => {
        const credentials = Buffer.from(`${config.email}:${config.apiToken || config.token}`).toString('base64');
        return { 'Authorization': `Basic ${credentials}` };
      };
    } else {
      // DataCenter: existing behavior
      const host = config.host?.replace(/^https?:\/\//, '').replace(/\/$/, '') || '';
      baseUrl = `https://${host}/rest/api`;

      getAuthHeaders = () => ({
        'Authorization': `Bearer ${config.token}`,
      });
    }

    super({ baseUrl, serviceName: 'Confluence', getAuthHeaders });

    this.config = config;
  }

  /**
   * Check if Confluence is properly configured.
   */
  isConfigured(): boolean {
    if (!this.config.enabled) return false;
    if (this.config.deploymentType === 'cloud') {
      return !!((this.config.host || this.config.siteName) && this.config.email && (this.config.token || this.config.apiToken));
    }
    return !!(this.config.host && this.config.token);
  }

  /**
   * Ensure Confluence is configured, throw if not.
   */
  private ensureConfigured(): void {
    if (!this.isConfigured()) {
      const requiredFields = this.config.deploymentType === 'cloud'
        ? ['host', 'email', 'token']
        : ['host', 'token'];
      throw notConfiguredError('Confluence', requiredFields);
    }
  }

  // ============================================================================
  // Content
  // ============================================================================

  async getContent(contentId: string, expand?: string): Promise<unknown> {
    this.ensureConfigured();
    const params = expand ? { expand } : undefined;
    const response = await this.get(`/content/${contentId}`, params);
    return response.data;
  }

  async searchContent(cql: string, limit = 25, start = 0, expand?: string): Promise<unknown> {
    this.ensureConfigured();
    const params: Record<string, string> = {
      cql,
      limit: String(limit),
      start: String(start),
    };
    if (expand) params.expand = expand;

    const response = await this.get('/content/search', params);
    return response.data;
  }

  async createContent(
    spaceKey: string,
    title: string,
    body: string,
    parentId?: string,
    type: 'page' | 'blogpost' = 'page'
  ): Promise<unknown> {
    this.ensureConfigured();
    const payload: Record<string, unknown> = {
      type,
      title,
      space: { key: spaceKey },
      body: { storage: { value: body, representation: 'storage' } },
    };
    if (parentId) {
      payload.ancestors = [{ id: parentId }];
    }

    const response = await this.post('/content', payload);
    return response.data;
  }

  async updateContent(
    contentId: string,
    version: number,
    title?: string,
    body?: string,
    versionComment?: string
  ): Promise<unknown> {
    this.ensureConfigured();
    const versionObj: Record<string, unknown> = { number: version + 1 };
    if (versionComment) versionObj.message = versionComment;

    const payload: Record<string, unknown> = {
      version: versionObj,
      type: 'page',
    };
    if (title) payload.title = title;
    if (body) payload.body = { storage: { value: body, representation: 'storage' } };

    const response = await this.put(`/content/${contentId}`, payload);
    return response.data;
  }

  // ============================================================================
  // Spaces
  // ============================================================================

  async getSpaces(limit?: number, start?: number): Promise<unknown> {
    this.ensureConfigured();
    const params: Record<string, string> = {};
    if (limit !== undefined) params.limit = String(limit);
    if (start !== undefined) params.start = String(start);

    const response = await this.get('/space', Object.keys(params).length ? params : undefined);
    return response.data;
  }

  async searchSpace(query: string): Promise<unknown> {
    this.ensureConfigured();
    const response = await this.get<{ results: Array<{ key: string; name: string }> }>('/space');
    const lowerQuery = query.toLowerCase();
    return response.data?.results?.filter(
      (s) => s.name?.toLowerCase().includes(lowerQuery) || s.key?.toLowerCase().includes(lowerQuery)
    ) || [];
  }

  // ============================================================================
  // Pages
  // ============================================================================

  async getPageChildren(
    pageId: string,
    expand?: string,
    limit?: number,
    start?: number
  ): Promise<unknown> {
    this.ensureConfigured();
    const params: Record<string, string> = {};
    if (expand) params.expand = expand;
    if (limit !== undefined) params.limit = String(limit);
    if (start !== undefined) params.start = String(start);

    const response = await this.get(
      `/content/${pageId}/child/page`,
      Object.keys(params).length ? params : undefined
    );
    return response.data;
  }

  // ============================================================================
  // Comments
  // ============================================================================

  async getComments(
    contentId: string,
    expand?: string,
    depth?: string,
    location?: string,
    limit?: number,
    start?: number
  ): Promise<unknown> {
    this.ensureConfigured();
    const params: Record<string, string> = {};
    if (expand) params.expand = expand;
    if (depth) params.depth = depth;
    if (location) params.location = location;
    if (limit !== undefined) params.limit = String(limit);
    if (start !== undefined) params.start = String(start);

    const response = await this.get(
      `/content/${contentId}/child/comment`,
      Object.keys(params).length ? params : undefined
    );
    return response.data;
  }

  // ============================================================================
  // Labels
  // ============================================================================

  async getLabels(contentId: string): Promise<unknown> {
    this.ensureConfigured();
    const response = await this.get(`/content/${contentId}/label`);
    return response.data;
  }

  async addLabel(contentId: string, label: string): Promise<unknown> {
    this.ensureConfigured();
    const response = await this.post(`/content/${contentId}/label`, [{ prefix: 'global', name: label }]);
    return response.data;
  }

  // ============================================================================
  // Users
  // ============================================================================

  async searchUser(query: string, limit = 10, start = 0): Promise<unknown> {
    this.ensureConfigured();
    const params = {
      cql: `user.fullname~"${query}"`,
      limit: String(limit),
      start: String(start),
    };
    const response = await this.get('/search/user', params);
    return response.data;
  }
}
