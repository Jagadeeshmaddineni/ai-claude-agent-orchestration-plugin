import { BaseHttpClient, HttpClientConfig, HttpResponse, handleApiError, notConfiguredError, MCPError } from '../../shared';

/**
 * Convert plain text to Atlassian Document Format (ADF).
 */
function textToAdf(text: string): object {
  if (!text) {
    return {
      version: 1,
      type: 'doc',
      content: [],
    };
  }
  return {
    version: 1,
    type: 'doc',
    content: text.split('\n').map(line => ({
      type: 'paragraph',
      content: line ? [{ type: 'text', text: line }] : [],
    })),
  };
}

/**
 * Jira service configuration.
 */
export interface JiraConfig {
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
 * HTTP client for Jira REST API v2.
 */
export class JiraRestClient extends BaseHttpClient {
  constructor(config: JiraConfig) {
    let baseUrl: string;
    let getAuthHeaders: () => Record<string, string>;

    if (config.deploymentType === 'cloud') {
      const rawSiteName = config.siteName || config.host || '';
      const cloudSiteName = rawSiteName
        .replace(/^https?:\/\//, '')
        .replace(/\/$/, '')
        .replace(/\.atlassian\.net$/i, '');
      baseUrl = `https://${cloudSiteName}.atlassian.net/rest/api/2`;

      getAuthHeaders = () => {
        const credentials = Buffer.from(`${config.email}:${config.apiToken || config.token}`).toString('base64');
        return { 'Authorization': `Basic ${credentials}` };
      };
    } else {
      // DataCenter: existing behavior
      const host = config.host?.replace(/^https?:\/\//, '').replace(/\/$/, '') || '';
      baseUrl = `https://${host}/rest/api/2`;

      getAuthHeaders = () => ({
        'Authorization': `Bearer ${config.token}`,
      });
    }

    super({ baseUrl, serviceName: 'Jira', getAuthHeaders });
  }
}

/**
 * HTTP client for Jira Agile API v1.
 */
export class JiraAgileClient extends BaseHttpClient {
  constructor(config: JiraConfig) {
    let baseUrl: string;
    let getAuthHeaders: () => Record<string, string>;

    if (config.deploymentType === 'cloud') {
      const rawSiteName = config.siteName || config.host || '';
      const cloudSiteName = rawSiteName
        .replace(/^https?:\/\//, '')
        .replace(/\/$/, '')
        .replace(/\.atlassian\.net$/i, '');
      baseUrl = `https://${cloudSiteName}.atlassian.net/rest/agile/1.0`;

      getAuthHeaders = () => {
        const credentials = Buffer.from(`${config.email}:${config.apiToken || config.token}`).toString('base64');
        return { 'Authorization': `Basic ${credentials}` };
      };
    } else {
      // DataCenter: existing behavior
      const host = config.host?.replace(/^https?:\/\//, '').replace(/\/$/, '') || '';
      baseUrl = `https://${host}/rest/agile/1.0`;

      getAuthHeaders = () => ({
        'Authorization': `Bearer ${config.token}`,
      });
    }

    super({ baseUrl, serviceName: 'Jira', getAuthHeaders });
  }
}

/**
 * HTTP client for Jira REST API v3 (cloud-specific endpoints).
 */
export class JiraRestV3Client extends BaseHttpClient {
  constructor(config: JiraConfig) {
    const rawSiteName = config.siteName || config.host || '';
    const cloudSiteName = rawSiteName
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')
      .replace(/\.atlassian\.net$/i, '');

    const credentials = Buffer.from(`${config.email}:${config.apiToken || config.token}`).toString('base64');

    super({
      baseUrl: `https://${cloudSiteName}.atlassian.net/rest/api/3`,
      serviceName: 'Jira',
      getAuthHeaders: () => ({ 'Authorization': `Basic ${credentials}` }),
    });
  }
}

/**
 * Combined Jira client providing access to both REST and Agile APIs.
 */
export class JiraClient {
  private readonly config: JiraConfig;
  private readonly restClient: JiraRestClient;
  private readonly agileClient: JiraAgileClient;
  private readonly v3Client?: JiraRestV3Client;

  constructor(config: JiraConfig) {
    this.config = config;
    this.restClient = new JiraRestClient(config);
    this.agileClient = new JiraAgileClient(config);
    if (config.deploymentType === 'cloud') {
      this.v3Client = new JiraRestV3Client(config);
    }
  }

  /**
   * Check if Jira is properly configured.
   */
  isConfigured(): boolean {
    if (!this.config.enabled) return false;
    if (this.config.deploymentType === 'cloud') {
      return !!((this.config.host || this.config.siteName) && this.config.email && (this.config.token || this.config.apiToken));
    }
    return !!(this.config.host && this.config.token);
  }

  /**
   * Ensure Jira is configured, throw if not.
   */
  private ensureConfigured(): void {
    if (!this.isConfigured()) {
      const requiredFields = this.config.deploymentType === 'cloud'
        ? ['host', 'email', 'token']
        : ['host', 'token'];
      throw notConfiguredError('Jira', requiredFields);
    }
  }

  /**
   * Get the Authorization header value for the current deployment type.
   */
  private getAuthHeader(): string {
    if (this.config.deploymentType === 'cloud') {
      const credentials = Buffer.from(`${this.config.email}:${this.config.apiToken || this.config.token}`).toString('base64');
      return `Basic ${credentials}`;
    }
    return `Bearer ${this.config.token}`;
  }

  // ============================================================================
  // REST API Methods
  // ============================================================================

  async getIssue(issueKey: string, expand?: string): Promise<unknown> {
    this.ensureConfigured();
    const params = expand ? { expand } : undefined;
    const response = await this.restClient.get(`/issue/${issueKey}`, params);
    return response.data;
  }

  async searchIssues(
    jql: string,
    startAt?: number,
    maxResults?: number,
    fields?: string[],
    expand?: string[]
  ): Promise<unknown> {
    this.ensureConfigured();
    const body: Record<string, unknown> = { jql };
    if (startAt !== undefined) body.startAt = startAt;
    if (maxResults !== undefined) body.maxResults = maxResults;
    if (fields?.length) body.fields = fields;

    if (this.config.deploymentType === 'cloud') {
      // Cloud: v2 /search returns 410 Gone, must use v3 /search/jql
      // v3 expand is comma-separated string, not array
      if (expand?.length) body.expand = expand.join(',');
      const response = await this.v3Client!.post('/search/jql', body);
      return response.data;
    }

    // DataCenter: existing behavior
    if (expand?.length) body.expand = expand;
    const response = await this.restClient.post('/search', body);
    return response.data;
  }

  async createIssue(
    projectKey: string,
    summary: string,
    issueTypeId: string,
    description?: string,
    parent?: string,
    epicName?: string,
    customFields?: Record<string, unknown>
  ): Promise<unknown> {
    this.ensureConfigured();
    const fields: Record<string, unknown> = {
      project: { key: projectKey },
      summary,
      description: description || '',
      issuetype: { id: issueTypeId },
    };

    if (parent) {
      fields.parent = { key: parent };
    }

    if (epicName) {
      fields.customfield_10011 = epicName;
    }

    if (customFields) {
      Object.assign(fields, customFields);
    }

    const response = await this.restClient.post('/issue', { fields });
    return response.data;
  }

  async updateIssue(
    issueKey: string,
    summary?: string,
    description?: string,
    issueTypeId?: string,
    customFields?: Record<string, unknown>
  ): Promise<unknown> {
    this.ensureConfigured();
    const fields: Record<string, unknown> = {};
    if (summary) fields.summary = summary;
    if (description) fields.description = description;
    if (issueTypeId) fields.issuetype = { id: issueTypeId };
    if (customFields) Object.assign(fields, customFields);

    const response = await this.restClient.put(`/issue/${issueKey}`, { fields });
    return response.data;
  }

  async deleteIssue(issueKey: string, deleteSubtasks?: boolean): Promise<unknown> {
    this.ensureConfigured();
    const params = deleteSubtasks ? { deleteSubtasks: 'true' } : undefined;
    const response = await this.restClient.delete(`/issue/${issueKey}`, { headers: params ? {} : undefined });
    return response.data;
  }

  async getIssueComments(issueKey: string, expand?: string): Promise<unknown> {
    this.ensureConfigured();
    const params = expand ? { expand } : undefined;
    const response = await this.restClient.get(`/issue/${issueKey}/comment`, params);
    return response.data;
  }

  async postIssueComment(issueKey: string, comment: string): Promise<unknown> {
    this.ensureConfigured();
    const response = await this.restClient.post(`/issue/${issueKey}/comment`, { body: comment });
    return response.data;
  }

  async getAllProjects(includeArchived?: boolean): Promise<unknown> {
    this.ensureConfigured();
    const params = includeArchived ? { includeArchived: 'true' } : undefined;
    const response = await this.restClient.get('/project', params);
    return response.data;
  }

  async getProject(projectKey: string): Promise<unknown> {
    this.ensureConfigured();
    const response = await this.restClient.get(`/project/${projectKey}`);
    return response.data;
  }

  async getIssueTypes(projectKey: string): Promise<unknown> {
    this.ensureConfigured();
    const response = await this.restClient.get(`/project/${projectKey}/statuses`);
    return response.data;
  }

  async getComponents(projectKey: string): Promise<unknown> {
    this.ensureConfigured();
    const response = await this.restClient.get(`/project/${projectKey}/components`);
    return response.data;
  }

  async getVersions(projectKey: string): Promise<unknown> {
    this.ensureConfigured();
    const response = await this.restClient.get(`/project/${projectKey}/versions`);
    return response.data;
  }

  async getPriorities(): Promise<unknown> {
    this.ensureConfigured();
    const response = await this.restClient.get('/priority');
    return response.data;
  }

  async getTransitions(issueKey: string): Promise<unknown> {
    this.ensureConfigured();
    const response = await this.restClient.get<{ transitions: unknown[] }>(`/issue/${issueKey}/transitions`);
    return response.data?.transitions || [];
  }

  async transitionIssue(
    issueKey: string,
    transitionId: string,
    fields?: Record<string, unknown>,
    comment?: string
  ): Promise<unknown> {
    this.ensureConfigured();
    const body: Record<string, unknown> = { transition: { id: transitionId } };
    if (fields) body.fields = fields;
    if (comment) body.update = { comment: [{ add: { body: comment } }] };

    const response = await this.restClient.post(`/issue/${issueKey}/transitions`, body);
    return response.data;
  }

  async searchUsers(query: string, maxResults = 50): Promise<unknown> {
    this.ensureConfigured();
    const response = await this.restClient.get('/user/search', {
      query,
      maxResults: String(maxResults),
    });
    return response.data;
  }

  async getCurrentUser(): Promise<unknown> {
    this.ensureConfigured();
    const response = await this.restClient.get('/myself');
    return response.data;
  }

  async getUserProfile(identifier: string): Promise<unknown> {
    this.ensureConfigured();
    const queryParam = this.config.deploymentType === 'cloud' ? 'accountId' : 'username';
    const response = await this.restClient.get('/user', { [queryParam]: identifier });
    return response.data;
  }

  async assignIssue(issueKey: string, assignee: string | null): Promise<unknown> {
    this.ensureConfigured();
    const body = this.config.deploymentType === 'cloud'
      ? { accountId: assignee }
      : { name: assignee };
    const response = await this.restClient.put(`/issue/${issueKey}/assignee`, body);
    return response.data;
  }

  async addWatcher(issueKey: string, username: string): Promise<unknown> {
    this.ensureConfigured();
    const response = await this.restClient.post(`/issue/${issueKey}/watchers`, username);
    return response.data;
  }

  async removeWatcher(issueKey: string, identifier: string): Promise<unknown> {
    this.ensureConfigured();
    const queryParam = this.config.deploymentType === 'cloud' ? 'accountId' : 'username';
    const response = await this.restClient.delete(
      `/issue/${issueKey}/watchers?${queryParam}=${encodeURIComponent(identifier)}`
    );
    return response.data;
  }

  async getIssueLinkTypes(): Promise<unknown> {
    this.ensureConfigured();
    const response = await this.restClient.get<{ issueLinkTypes: unknown[] }>('/issueLinkType');
    return response.data?.issueLinkTypes || [];
  }

  async linkIssues(
    linkType: string,
    inwardIssueKey: string,
    outwardIssueKey: string,
    comment?: string
  ): Promise<unknown> {
    this.ensureConfigured();
    const body: Record<string, unknown> = {
      type: { name: linkType },
      inwardIssue: { key: inwardIssueKey },
      outwardIssue: { key: outwardIssueKey },
    };
    if (comment) body.comment = { body: comment };

    const response = await this.restClient.post('/issueLink', body);
    return response.data;
  }

  async getFields(): Promise<unknown> {
    this.ensureConfigured();
    const response = await this.restClient.get('/field');
    return response.data;
  }

  async getFieldById(fieldId: string): Promise<unknown> {
    this.ensureConfigured();
    const response = await this.restClient.get<Array<{ id: string }>>('/field');
    return response.data?.find((f) => f.id === fieldId) || null;
  }

  async getCustomFields(): Promise<unknown> {
    this.ensureConfigured();
    const response = await this.restClient.get<Array<{ id: string }>>('/field');
    return response.data?.filter((f) => f.id?.startsWith('customfield_')) || [];
  }

  async getRequiredFields(projectKey: string, issueTypeId: string): Promise<unknown> {
    this.ensureConfigured();

    if (this.config.deploymentType === 'cloud') {
      // Cloud: GET /rest/api/3/issue/createmeta/{projectKey}/issuetypes/{issueTypeId}
      const response = await this.v3Client!.get(
        `/issue/createmeta/${encodeURIComponent(projectKey)}/issuetypes/${encodeURIComponent(issueTypeId)}`
      );
      return response.data;
    }

    // DataCenter: existing behavior
    const response = await this.restClient.get('/issue/createmeta', {
      projectKeys: projectKey,
      issuetypeIds: issueTypeId,
      expand: 'projects.issuetypes.fields',
    });
    return response.data;
  }

  async searchFields(query: string): Promise<unknown> {
    this.ensureConfigured();
    const response = await this.restClient.get<Array<{ id: string; name: string }>>('/field');
    const lowerQuery = query.toLowerCase();
    return response.data?.filter(
      (f) => f.name?.toLowerCase().includes(lowerQuery) || f.id?.toLowerCase().includes(lowerQuery)
    ) || [];
  }

  // ============================================================================
  // Agile API Methods
  // ============================================================================

  async getAllBoards(params?: {
    type?: string;
    name?: string;
    projectKeyOrId?: string;
    startAt?: number;
    maxResults?: number;
  }): Promise<unknown> {
    this.ensureConfigured();
    const queryParams: Record<string, string> = {};
    if (params?.type) queryParams.type = params.type;
    if (params?.name) queryParams.name = params.name;
    if (params?.projectKeyOrId) queryParams.projectKeyOrId = params.projectKeyOrId;
    if (params?.startAt !== undefined) queryParams.startAt = String(params.startAt);
    if (params?.maxResults !== undefined) queryParams.maxResults = String(params.maxResults);

    const response = await this.agileClient.get('/board', Object.keys(queryParams).length ? queryParams : undefined);
    return response.data;
  }

  async getBoardIssues(
    boardId: string,
    params?: { jql?: string; fields?: string[]; startAt?: number; maxResults?: number }
  ): Promise<unknown> {
    this.ensureConfigured();
    const queryParams: Record<string, string> = {};
    if (params?.jql) queryParams.jql = params.jql;
    if (params?.fields?.length) queryParams.fields = params.fields.join(',');
    if (params?.startAt !== undefined) queryParams.startAt = String(params.startAt);
    if (params?.maxResults !== undefined) queryParams.maxResults = String(params.maxResults);

    const response = await this.agileClient.get(
      `/board/${boardId}/issue`,
      Object.keys(queryParams).length ? queryParams : undefined
    );
    return response.data;
  }

  async getSprintsFromBoard(
    boardId: string,
    params?: { state?: string; startAt?: number; maxResults?: number }
  ): Promise<unknown> {
    this.ensureConfigured();
    const queryParams: Record<string, string> = {};
    if (params?.state) queryParams.state = params.state;
    if (params?.startAt !== undefined) queryParams.startAt = String(params.startAt);
    if (params?.maxResults !== undefined) queryParams.maxResults = String(params.maxResults);

    const response = await this.agileClient.get(
      `/board/${boardId}/sprint`,
      Object.keys(queryParams).length ? queryParams : undefined
    );
    return response.data;
  }

  async getSprintIssues(
    sprintId: string,
    params?: { jql?: string; fields?: string[]; startAt?: number; maxResults?: number }
  ): Promise<unknown> {
    this.ensureConfigured();
    const queryParams: Record<string, string> = {};
    if (params?.jql) queryParams.jql = params.jql;
    if (params?.fields?.length) queryParams.fields = params.fields.join(',');
    if (params?.startAt !== undefined) queryParams.startAt = String(params.startAt);
    if (params?.maxResults !== undefined) queryParams.maxResults = String(params.maxResults);

    const response = await this.agileClient.get(
      `/sprint/${sprintId}/issue`,
      Object.keys(queryParams).length ? queryParams : undefined
    );
    return response.data;
  }

  async createSprint(
    boardId: string,
    name: string,
    startDate?: string,
    endDate?: string,
    goal?: string
  ): Promise<unknown> {
    this.ensureConfigured();
    const body: Record<string, unknown> = {
      name,
      originBoardId: parseInt(boardId, 10),
    };
    if (startDate) body.startDate = startDate;
    if (endDate) body.endDate = endDate;
    if (goal) body.goal = goal;

    const response = await this.agileClient.post('/sprint', body);
    return response.data;
  }

  async updateSprint(
    sprintId: string,
    params: { name?: string; state?: string; startDate?: string; endDate?: string; goal?: string }
  ): Promise<unknown> {
    this.ensureConfigured();
    const body: Record<string, unknown> = {};
    if (params.name !== undefined) body.name = params.name;
    if (params.state !== undefined) body.state = params.state;
    if (params.startDate !== undefined) body.startDate = params.startDate;
    if (params.endDate !== undefined) body.endDate = params.endDate;
    if (params.goal !== undefined) body.goal = params.goal;

    const response = await this.agileClient.put(`/sprint/${sprintId}`, body);
    return response.data;
  }

  async batchCreateIssues(
    issues: Array<{
      projectKey: string;
      summary: string;
      description?: string;
      issueTypeId: string;
      parent?: string;
      epicName?: string;
      customFields?: Record<string, unknown>;
    }>
  ): Promise<unknown> {
    this.ensureConfigured();
    const isCloud = this.config.deploymentType === 'cloud';

    const issueUpdates = issues.map((issue) => {
      const fields: Record<string, unknown> = {
        project: { key: issue.projectKey },
        summary: issue.summary,
        description: isCloud ? textToAdf(issue.description || '') : (issue.description || ''),
        issuetype: { id: issue.issueTypeId },
      };

      if (issue.parent) {
        fields.parent = { key: issue.parent };
      }

      if (issue.epicName) {
        fields.customfield_10011 = issue.epicName;
      }

      if (issue.customFields) {
        Object.assign(fields, issue.customFields);
      }

      return { fields };
    });

    if (isCloud) {
      const response = await this.v3Client!.post('/issue/bulk', { issueUpdates });
      return response.data;
    }

    const response = await this.restClient.post('/issue/bulk', { issueUpdates });
    return response.data;
  }

  // ============================================================================
  // Attachment Methods (special handling for binary data)
  // ============================================================================

  async getAttachments(issueKey: string): Promise<unknown> {
    this.ensureConfigured();
    const response = await this.restClient.get<{ fields: { attachment: unknown[] } }>(
      `/issue/${issueKey}?fields=attachment`
    );
    return response.data?.fields?.attachment || [];
  }

  async downloadAttachment(attachmentId: string): Promise<unknown> {
    this.ensureConfigured();

    // Get attachment metadata
    const metaResponse = await this.restClient.get<{ content: string; filename: string; mimeType: string }>(
      `/attachment/${attachmentId}`
    );
    const attachment = metaResponse.data;

    if (!attachment?.content) {
      throw new MCPError('Jira', 'NOT_FOUND', `Attachment ${attachmentId} not found`);
    }

    // Download binary content
    const response = await fetch(attachment.content, {
      headers: { 'Authorization': this.getAuthHeader() },
    });

    if (!response.ok) {
      await handleApiError('Jira', response, `/attachment/${attachmentId}/content`);
    }

    const buffer = await response.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

    return {
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      content: base64,
      size: buffer.byteLength,
    };
  }

  async uploadAttachment(issueKey: string, filename: string, content: string): Promise<unknown> {
    this.ensureConfigured();

    // Decode base64 content
    const binaryString = atob(content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Create form data
    const formData = new FormData();
    formData.append('file', new Blob([bytes]), filename);

    // Build URL based on deployment type
    let url: string;
    if (this.config.deploymentType === 'cloud') {
      const rawSiteName = this.config.siteName || this.config.host || '';
      const cloudSiteName = rawSiteName
        .replace(/^https?:\/\//, '')
        .replace(/\/$/, '')
        .replace(/\.atlassian\.net$/i, '');
      url = `https://${cloudSiteName}.atlassian.net/rest/api/2/issue/${issueKey}/attachments`;
    } else {
      const host = this.config.host?.replace(/^https?:\/\//, '').replace(/\/$/, '') || '';
      url = `https://${host}/rest/api/2/issue/${issueKey}/attachments`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': this.getAuthHeader(),
        'X-Atlassian-Token': 'no-check',
      },
      body: formData,
    });

    if (!response.ok) {
      await handleApiError('Jira', response, `/issue/${issueKey}/attachments`);
    }

    return response.json();
  }

  async deleteAttachment(attachmentId: string): Promise<unknown> {
    this.ensureConfigured();
    const response = await this.restClient.delete(`/attachment/${attachmentId}`);
    return response.data;
  }
}
