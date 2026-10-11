import { BaseHttpClient, notConfiguredError } from '../../shared';

/**
 * SonarQube service configuration.
 */
export interface SonarQubeConfig {
  enabled: boolean;
  url: string;              // SonarQube server URL or SonarCloud URL
  token: string;            // User token for authentication
  organization?: string;    // Organization key (required for SonarCloud)
  scope?: 'read' | 'write';
}

/**
 * HTTP client for SonarQube Web API.
 */
export class SonarQubeClient extends BaseHttpClient {
  private readonly config: SonarQubeConfig;

  constructor(config: SonarQubeConfig) {
    // Normalize URL: remove trailing slash
    // URL is required - isConfigured() validates this
    const baseUrl = (config.url || '').replace(/\/+$/, '');

    super({
      baseUrl,
      serviceName: 'SonarQube',
      getAuthHeaders: () => ({
        'Authorization': `Bearer ${config.token}`,
      }),
    });

    this.config = config;
  }

  /**
   * Check if SonarQube is properly configured.
   */
  isConfigured(): boolean {
    if (!this.config.enabled) return false;
    return !!(this.config.url && this.config.token);
  }

  /**
   * Ensure SonarQube is configured, throw if not.
   */
  private ensureConfigured(): void {
    if (!this.isConfigured()) {
      throw notConfiguredError('SonarQube', ['url', 'token']);
    }
  }

  /**
   * Check if this is a SonarCloud instance.
   */
  private isSonarCloud(): boolean {
    if (!this.config.url) return false;
    try {
      const url = new URL(this.config.url);
      return url.hostname === 'sonarcloud.io' || url.hostname.endsWith('.sonarcloud.io');
    } catch {
      return false;
    }
  }

  // ============================================================================
  // Projects API
  // ============================================================================

  /**
   * Search for projects.
   * Uses /api/components/search endpoint.
   */
  async searchProjects(
    query?: string,
    page = 1,
    pageSize = 100
  ): Promise<SearchProjectsResponse> {
    this.ensureConfigured();

    const params: Record<string, string> = {
      p: String(page),
      ps: String(Math.min(pageSize, 500)), // Max 500 per SonarQube API
    };

    if (query) {
      params.q = query;
    }

    // SonarCloud requires organization, Server uses qualifiers
    if (this.isSonarCloud() && this.config.organization) {
      params.organization = this.config.organization;
    } else {
      params.qualifiers = 'TRK'; // TRK = projects
    }

    const response = await this.get<SearchProjectsResponse>('/api/components/search', params);
    return response.data;
  }

  // ============================================================================
  // Quality Gates API
  // ============================================================================

  /**
   * Get quality gate status for a project.
   * Uses /api/qualitygates/project_status endpoint.
   */
  async getQualityGateStatus(
    projectKey?: string,
    analysisId?: string,
    branch?: string,
    pullRequest?: string
  ): Promise<QualityGateStatusResponse> {
    this.ensureConfigured();

    const params: Record<string, string> = {};

    if (projectKey) params.projectKey = projectKey;
    if (analysisId) params.analysisId = analysisId;
    if (branch) params.branch = branch;
    if (pullRequest) params.pullRequest = pullRequest;

    const response = await this.get<QualityGateStatusResponse>('/api/qualitygates/project_status', params);
    return response.data;
  }

  /**
   * List all quality gates.
   * Uses /api/qualitygates/list endpoint.
   */
  async listQualityGates(): Promise<ListQualityGatesResponse> {
    this.ensureConfigured();

    const params: Record<string, string> = {};

    // SonarCloud requires organization
    if (this.isSonarCloud() && this.config.organization) {
      params.organization = this.config.organization;
    }

    const response = await this.get<ListQualityGatesResponse>('/api/qualitygates/list', params);
    return response.data;
  }

  // ============================================================================
  // Issues API
  // ============================================================================

  /**
   * Search for issues.
   * Uses /api/issues/search endpoint.
   */
  async searchIssues(options: {
    projects?: string[];
    branch?: string;
    pullRequest?: string;
    files?: string[];
    severities?: string[];
    statuses?: string[];
    types?: string[];
    tags?: string[];
    resolutions?: string[];
    assignees?: string[];
    languages?: string[];
    rules?: string[];
    createdAfter?: string;
    createdBefore?: string;
    createdInLast?: string;
    inNewCodePeriod?: boolean;
    pageSize?: number;
    pageIndex?: number;
  }): Promise<SearchIssuesResponse> {
    this.ensureConfigured();

    const params: Record<string, string> = {};

    if (options.projects?.length) params.projects = options.projects.join(',');
    if (options.branch) params.branch = options.branch;
    if (options.pullRequest) params.pullRequest = options.pullRequest;
    if (options.files?.length) params.files = options.files.join(',');
    if (options.severities?.length) params.severities = options.severities.join(',');
    if (options.statuses?.length) params.statuses = options.statuses.join(',');
    if (options.types?.length) params.types = options.types.join(',');
    if (options.tags?.length) params.tags = options.tags.join(',');
    if (options.resolutions?.length) params.resolutions = options.resolutions.join(',');
    if (options.assignees?.length) params.assignees = options.assignees.join(',');
    if (options.languages?.length) params.languages = options.languages.join(',');
    if (options.rules?.length) params.rules = options.rules.join(',');
    if (options.createdAfter) params.createdAfter = options.createdAfter;
    if (options.createdBefore) params.createdBefore = options.createdBefore;
    if (options.createdInLast) params.createdInLast = options.createdInLast;
    if (options.inNewCodePeriod) params.inNewCodePeriod = 'true';
    if (options.pageSize) params.ps = String(Math.min(options.pageSize, 500));
    if (options.pageIndex) params.p = String(options.pageIndex);

    const response = await this.get<SearchIssuesResponse>('/api/issues/search', params);
    return response.data;
  }

  // ============================================================================
  // Security Hotspots API
  // ============================================================================

  /**
   * Search for security hotspots.
   * Uses /api/hotspots/search endpoint.
   */
  async searchSecurityHotspots(options: {
    projectKey: string;
    branch?: string;
    pullRequest?: string;
    files?: string[];
    hotspots?: string[];
    status?: string;
    resolution?: string;
    sinceLeakPeriod?: boolean;
    inNewCodePeriod?: boolean;
    onlyMine?: boolean;
    pageSize?: number;
    pageIndex?: number;
  }): Promise<SearchHotspotsResponse> {
    this.ensureConfigured();

    const params: Record<string, string> = {
      projectKey: options.projectKey,
    };

    if (options.branch) params.branch = options.branch;
    if (options.pullRequest) params.pullRequest = options.pullRequest;
    if (options.files?.length) params.files = options.files.join(',');
    if (options.hotspots?.length) params.hotspots = options.hotspots.join(',');
    if (options.status) params.status = options.status;
    if (options.resolution) params.resolution = options.resolution;
    if (options.sinceLeakPeriod) params.sinceLeakPeriod = 'true';
    if (options.inNewCodePeriod) params.inNewCodePeriod = 'true';
    if (options.onlyMine) params.onlyMine = 'true';
    if (options.pageSize) params.ps = String(Math.min(options.pageSize, 500));
    if (options.pageIndex) params.p = String(options.pageIndex);

    const response = await this.get<SearchHotspotsResponse>('/api/hotspots/search', params);
    return response.data;
  }

  /**
   * Show details of a security hotspot.
   * Uses /api/hotspots/show endpoint.
   */
  async showSecurityHotspot(hotspotKey: string): Promise<ShowHotspotResponse> {
    this.ensureConfigured();

    const response = await this.get<ShowHotspotResponse>('/api/hotspots/show', {
      hotspot: hotspotKey,
    });
    return response.data;
  }

  // ============================================================================
  // Rules API
  // ============================================================================

  /**
   * Show details of a rule.
   * Uses /api/rules/show endpoint.
   */
  async showRule(ruleKey: string): Promise<ShowRuleResponse> {
    this.ensureConfigured();

    const response = await this.get<ShowRuleResponse>('/api/rules/show', {
      key: ruleKey,
    });
    return response.data;
  }

  // ============================================================================
  // Measures API
  // ============================================================================

  /**
   * Get component measures.
   * Uses /api/measures/component endpoint.
   */
  async getComponentMeasures(options: {
    projectKey?: string;
    metricKeys?: string[];
    branch?: string;
    pullRequest?: string;
  }): Promise<ComponentMeasuresResponse> {
    this.ensureConfigured();

    const params: Record<string, string> = {};

    if (options.projectKey) params.component = options.projectKey;
    if (options.metricKeys?.length) params.metricKeys = options.metricKeys.join(',');
    if (options.branch) params.branch = options.branch;
    if (options.pullRequest) params.pullRequest = options.pullRequest;

    const response = await this.get<ComponentMeasuresResponse>('/api/measures/component', params);
    return response.data;
  }

  /**
   * Search files by coverage using component tree.
   * Uses /api/measures/component_tree endpoint.
   */
  async searchFilesByCoverage(options: {
    projectKey: string;
    branch?: string;
    pullRequest?: string;
    maxCoverage?: number;
    pageIndex?: number;
    pageSize?: number;
  }): Promise<ComponentTreeResponse> {
    this.ensureConfigured();

    const metricKeys = [
      'coverage',
      'line_coverage',
      'branch_coverage',
      'lines_to_cover',
      'uncovered_lines',
      'conditions_to_cover',
      'uncovered_conditions',
    ];

    const params: Record<string, string> = {
      component: options.projectKey,
      metricKeys: metricKeys.join(','),
      qualifiers: 'FIL', // Files only
      strategy: 'all',   // All files in tree
      s: 'metric',       // Sort by metric
      metricSort: 'coverage',
      asc: 'true',       // Ascending (worst coverage first)
      ps: String(Math.min(options.pageSize || 100, 500)),
      p: String(options.pageIndex || 1),
    };

    if (options.branch) params.branch = options.branch;
    if (options.pullRequest) params.pullRequest = options.pullRequest;

    const response = await this.get<ComponentTreeResponse>('/api/measures/component_tree', params);
    return response.data;
  }

  // ============================================================================
  // Sources API
  // ============================================================================

  /**
   * Get raw source code for a file.
   * Uses /api/sources/raw endpoint.
   * Note: This endpoint returns plain text, not JSON.
   */
  async getRawSource(key: string, branch?: string, pullRequest?: string): Promise<string> {
    this.ensureConfigured();

    const params: Record<string, string> = { key };
    if (branch) params.branch = branch;
    if (pullRequest) params.pullRequest = pullRequest;

    return this.getText('/api/sources/raw', params);
  }

  /**
   * Get SCM info for a file.
   * Uses /api/sources/scm endpoint.
   */
  async getScmInfo(options: {
    key: string;
    commitsByLine?: boolean;
    from?: number;
    to?: number;
  }): Promise<ScmInfoResponse> {
    this.ensureConfigured();

    const params: Record<string, string> = { key: options.key };
    if (options.commitsByLine !== undefined) params.commits_by_line = String(options.commitsByLine);
    if (options.from) params.from = String(options.from);
    if (options.to) params.to = String(options.to);

    const response = await this.get<ScmInfoResponse>('/api/sources/scm', params);
    return response.data;
  }

  /**
   * Get source lines with coverage details.
   * Uses /api/sources/lines endpoint.
   */
  async getSourceLines(options: {
    key: string;
    branch?: string;
    pullRequest?: string;
    from?: number;
    to?: number;
  }): Promise<SourceLinesResponse> {
    this.ensureConfigured();

    const params: Record<string, string> = { key: options.key };
    if (options.branch) params.branch = options.branch;
    if (options.pullRequest) params.pullRequest = options.pullRequest;
    if (options.from) params.from = String(options.from);
    if (options.to) params.to = String(options.to);

    const response = await this.get<SourceLinesResponse>('/api/sources/lines', params);
    return response.data;
  }

  // ============================================================================
  // Duplications API
  // ============================================================================

  /**
   * Get duplications for a file.
   * Uses /api/duplications/show endpoint.
   */
  async getDuplications(key: string, branch?: string, pullRequest?: string): Promise<DuplicationsResponse> {
    this.ensureConfigured();

    const params: Record<string, string> = { key };
    if (branch) params.branch = branch;
    if (pullRequest) params.pullRequest = pullRequest;

    const response = await this.get<DuplicationsResponse>('/api/duplications/show', params);
    return response.data;
  }

  /**
   * Search files with duplications using component tree.
   * Uses /api/measures/component_tree endpoint with duplication metrics.
   */
  async searchDuplicatedFiles(options: {
    projectKey: string;
    branch?: string;
    pullRequest?: string;
    pageSize?: number;
    pageIndex?: number;
  }): Promise<ComponentTreeResponse> {
    this.ensureConfigured();

    const metricKeys = [
      'duplicated_lines',
      'duplicated_blocks',
      'duplicated_lines_density',
    ];

    const params: Record<string, string> = {
      component: options.projectKey,
      metricKeys: metricKeys.join(','),
      qualifiers: 'FIL',
      strategy: 'leaves',
      ps: String(Math.min(options.pageSize || 500, 500)),
      p: String(options.pageIndex || 1),
    };

    if (options.branch) params.branch = options.branch;
    if (options.pullRequest) params.pullRequest = options.pullRequest;

    const response = await this.get<ComponentTreeResponse>('/api/measures/component_tree', params);
    return response.data;
  }

  // ============================================================================
  // Pull Requests API
  // ============================================================================

  /**
   * List pull requests for a project.
   * Uses /api/project_pull_requests/list endpoint.
   */
  async listPullRequests(projectKey: string): Promise<ListPullRequestsResponse> {
    this.ensureConfigured();

    const response = await this.get<ListPullRequestsResponse>('/api/project_pull_requests/list', {
      project: projectKey,
    });
    return response.data;
  }

  // ============================================================================
  // Languages API
  // ============================================================================

  /**
   * List supported languages.
   * Uses /api/languages/list endpoint.
   */
  async listLanguages(query?: string): Promise<ListLanguagesResponse> {
    this.ensureConfigured();

    const params: Record<string, string> = {};
    if (query) params.q = query;

    const response = await this.get<ListLanguagesResponse>('/api/languages/list', params);
    return response.data;
  }

  // ============================================================================
  // Metrics API
  // ============================================================================

  /**
   * Search for available metrics.
   * Uses /api/metrics/search endpoint.
   */
  async searchMetrics(page?: number, pageSize?: number): Promise<SearchMetricsResponse> {
    this.ensureConfigured();

    const params: Record<string, string> = {};
    if (page) params.p = String(page);
    if (pageSize) params.ps = String(Math.min(pageSize, 500));

    const response = await this.get<SearchMetricsResponse>('/api/metrics/search', params);
    return response.data;
  }

  // ============================================================================
  // System API
  // ============================================================================

  /**
   * Get system health.
   * Uses /api/system/health endpoint.
   */
  async getSystemHealth(): Promise<SystemHealthResponse> {
    this.ensureConfigured();

    const response = await this.get<SystemHealthResponse>('/api/system/health', {});
    return response.data;
  }

  /**
   * Get system status.
   * Uses /api/system/status endpoint.
   */
  async getSystemStatus(): Promise<SystemStatusResponse> {
    this.ensureConfigured();

    const response = await this.get<SystemStatusResponse>('/api/system/status', {});
    return response.data;
  }

  /**
   * Ping the system.
   * Uses /api/system/ping endpoint.
   * Returns plain text "pong".
   */
  async systemPing(): Promise<string> {
    this.ensureConfigured();
    return this.getText('/api/system/ping');
  }

  /**
   * Get system info.
   * Uses /api/system/info endpoint.
   * Requires admin permission.
   */
  async getSystemInfo(): Promise<SystemInfoResponse> {
    this.ensureConfigured();

    const response = await this.get<SystemInfoResponse>('/api/system/info', {});
    return response.data;
  }

  /**
   * Get system logs.
   * Uses /api/system/logs endpoint.
   * Returns plain text logs.
   */
  async getSystemLogs(name?: string): Promise<string> {
    this.ensureConfigured();

    const params: Record<string, string> = {};
    if (name) params.name = name;

    return this.getText('/api/system/logs', params);
  }

  // ============================================================================
  // Webhooks API
  // ============================================================================

  /**
   * List webhooks.
   * Uses /api/webhooks/list endpoint.
   */
  async listWebhooks(projectKey?: string): Promise<ListWebhooksResponse> {
    this.ensureConfigured();

    const params: Record<string, string> = {};
    if (projectKey) params.project = projectKey;

    const response = await this.get<ListWebhooksResponse>('/api/webhooks/list', params);
    return response.data;
  }

  // ============================================================================
  // Views/Portfolios API
  // ============================================================================

  /**
   * Search for portfolios.
   * Uses /api/views/search endpoint.
   */
  async listPortfolios(options: {
    query?: string;
    favorite?: boolean;
    pageIndex?: number;
    pageSize?: number;
  }): Promise<PortfoliosSearchResponse> {
    this.ensureConfigured();

    const params: Record<string, string> = {
      qualifiers: 'VW', // VW = portfolios
    };
    if (options.query) params.q = options.query;
    if (options.favorite !== undefined) params.onlyFavorites = String(options.favorite);
    if (options.pageIndex) params.p = String(options.pageIndex);
    if (options.pageSize) params.ps = String(Math.min(options.pageSize, 500));

    const response = await this.get<PortfoliosSearchResponse>('/api/views/search', params);
    return response.data;
  }

  // ============================================================================
  // Write Operations
  // ============================================================================

  /**
   * Change issue status (transition).
   * Uses POST /api/issues/do_transition endpoint.
   */
  async changeIssueStatus(issueKey: string, transition: string): Promise<void> {
    this.ensureConfigured();
    await this.postForm('/api/issues/do_transition', {
      issue: issueKey,
      transition,
    });
  }

  /**
   * Change security hotspot status.
   * Uses POST /api/hotspots/change_status endpoint.
   */
  async changeSecurityHotspotStatus(
    hotspotKey: string,
    status: string,
    resolution?: string,
    comment?: string
  ): Promise<void> {
    this.ensureConfigured();

    const params: Record<string, string> = {
      hotspot: hotspotKey,
      status,
    };
    if (resolution) params.resolution = resolution;
    if (comment) params.comment = comment;

    await this.postForm('/api/hotspots/change_status', params);
  }

  /**
   * Create a webhook.
   * Uses POST /api/webhooks/create endpoint.
   */
  async createWebhook(
    name: string,
    webhookUrl: string,
    projectKey?: string,
    secret?: string
  ): Promise<CreateWebhookResponse> {
    this.ensureConfigured();

    const params: Record<string, string> = {
      name,
      url: webhookUrl,
    };
    if (projectKey) params.project = projectKey;
    if (secret) params.secret = secret;

    const response = await this.postForm<CreateWebhookResponse>('/api/webhooks/create', params);
    return response.data;
  }
}

// ============================================================================
// Response Types
// ============================================================================

export interface SearchProjectsResponse {
  paging: {
    pageIndex: number;
    pageSize: number;
    total: number;
  };
  components: Array<{
    key: string;
    name: string;
    qualifier?: string;
    project?: string;
  }>;
}

export interface QualityGateStatusResponse {
  projectStatus: {
    status: 'OK' | 'WARN' | 'ERROR' | 'NONE';
    conditions: Array<{
      status: 'OK' | 'WARN' | 'ERROR' | 'NO_VALUE';
      metricKey: string;
      comparator: string;
      errorThreshold?: string;
      actualValue?: string;
    }>;
    periods?: Array<{
      index: number;
      mode: string;
      date?: string;
      parameter?: string;
    }>;
    ignoredConditions?: boolean;
  };
}

export interface ListQualityGatesResponse {
  qualitygates: Array<{
    id: string;
    name: string;
    isDefault?: boolean;
    isBuiltIn?: boolean;
    conditions?: Array<{
      id: string;
      metric: string;
      op: string;
      error?: string;
    }>;
  }>;
  default?: string;
}

export interface SearchIssuesResponse {
  paging: {
    pageIndex: number;
    pageSize: number;
    total: number;
  };
  issues: Array<{
    key: string;
    rule: string;
    severity: string;
    component: string;
    project: string;
    line?: number;
    message?: string;
    status: string;
    resolution?: string;
    type: string;
    effort?: string;
    debt?: string;
    assignee?: string;
    author?: string;
    tags?: string[];
    creationDate?: string;
    updateDate?: string;
    textRange?: {
      startLine: number;
      endLine: number;
      startOffset: number;
      endOffset: number;
    };
  }>;
  components?: Array<{
    key: string;
    name: string;
    qualifier: string;
    path?: string;
  }>;
  rules?: Array<{
    key: string;
    name: string;
    lang: string;
    status: string;
  }>;
}

export interface SearchHotspotsResponse {
  paging: {
    pageIndex: number;
    pageSize: number;
    total: number;
  };
  hotspots: Array<{
    key: string;
    component: string;
    project: string;
    securityCategory: string;
    vulnerabilityProbability: string;
    status: string;
    resolution?: string;
    line?: number;
    message?: string;
    assignee?: string;
    author?: string;
    creationDate?: string;
    updateDate?: string;
  }>;
  components?: Array<{
    key: string;
    name: string;
    qualifier: string;
    path?: string;
  }>;
}

export interface ShowHotspotResponse {
  key: string;
  component: {
    key: string;
    name: string;
    qualifier: string;
    path?: string;
    project: string;
  };
  project: {
    key: string;
    name: string;
  };
  rule: {
    key: string;
    name: string;
    securityCategory: string;
    vulnerabilityProbability: string;
  };
  status: string;
  resolution?: string;
  line?: number;
  message?: string;
  assignee?: string;
  author?: string;
  creationDate?: string;
  updateDate?: string;
  changelog?: Array<{
    user?: string;
    userName?: string;
    creationDate: string;
    diffs: Array<{
      key: string;
      newValue?: string;
      oldValue?: string;
    }>;
  }>;
  comment?: Array<{
    key: string;
    login: string;
    htmlText: string;
    markdown: string;
    createdAt: string;
  }>;
}

export interface ShowRuleResponse {
  rule: {
    key: string;
    name: string;
    severity?: string;
    type?: string;
    lang?: string;
    langName?: string;
    htmlDesc?: string;
    mdDesc?: string;
    status?: string;
    tags?: string[];
    sysTags?: string[];
    impacts?: Array<{
      softwareQuality: string;
      severity: string;
    }>;
    descriptionSections?: Array<{
      key: string;
      content: string;
      context?: {
        displayName: string;
        key: string;
      };
    }>;
  };
}

export interface ComponentMeasuresResponse {
  component: {
    key: string;
    name: string;
    qualifier: string;
    description?: string;
    language?: string;
    path?: string;
    measures?: Array<{
      metric: string;
      value?: string;
      bestValue?: boolean;
    }>;
  };
  metrics?: Array<{
    key: string;
    name: string;
    description?: string;
    domain?: string;
    type: string;
    hidden?: boolean;
    custom?: boolean;
  }>;
}

export interface ComponentTreeResponse {
  paging: {
    pageIndex: number;
    pageSize: number;
    total: number;
  };
  baseComponent: {
    key: string;
    name: string;
    qualifier: string;
  };
  components: Array<{
    key: string;
    name: string;
    qualifier: string;
    path?: string;
    language?: string;
    measures?: Array<{
      metric: string;
      value?: string;
      bestValue?: boolean;
    }>;
  }>;
}

export interface ScmInfoResponse {
  scm: Array<[number, string, string, string]>; // [line, author, date, revision]
}

export interface SourceLinesResponse {
  sources: Array<{
    line: number;
    code?: string;
    scmAuthor?: string;
    scmDate?: string;
    scmRevision?: string;
    lineHits?: number;
    conditions?: number;
    coveredConditions?: number;
    duplicated?: boolean;
    isNew?: boolean;
  }>;
}

export interface DuplicationsResponse {
  duplications: Array<{
    blocks: Array<{
      from: number;
      size: number;
      _ref: string;
    }>;
  }>;
  files: Record<string, {
    key: string;
    name: string;
    project?: string;
    projectName?: string;
  }>;
}

export interface ListPullRequestsResponse {
  pullRequests: Array<{
    key: string;
    title: string;
    branch: string;
    base?: string;
    status?: {
      qualityGateStatus?: string;
      bugs?: number;
      vulnerabilities?: number;
      codeSmells?: number;
    };
    analysisDate?: string;
    url?: string;
    target?: string;
  }>;
}

export interface ListLanguagesResponse {
  languages: Array<{
    key: string;
    name: string;
  }>;
}

export interface SearchMetricsResponse {
  metrics: Array<{
    id: string;
    key: string;
    name: string;
    description?: string;
    domain?: string;
    type: string;
    hidden?: boolean;
    custom?: boolean;
  }>;
  total: number;
  p: number;
  ps: number;
}

export interface SystemHealthResponse {
  health: 'GREEN' | 'YELLOW' | 'RED';
  causes?: Array<{
    message: string;
  }>;
  nodes?: Array<{
    name: string;
    type: string;
    health: string;
    host?: string;
    port?: number;
    startedAt?: string;
    causes?: Array<{
      message: string;
    }>;
  }>;
}

export interface SystemStatusResponse {
  id: string;
  version: string;
  status: 'STARTING' | 'UP' | 'DOWN' | 'RESTARTING' | 'DB_MIGRATION_NEEDED' | 'DB_MIGRATION_RUNNING';
}

export interface SystemInfoResponse {
  System?: Record<string, unknown>;
  Database?: Record<string, unknown>;
  Bundled?: Record<string, unknown>;
  Plugins?: Record<string, unknown>;
  'Web JVM State'?: Record<string, unknown>;
  'Web Database Connection'?: Record<string, unknown>;
  'Web Logging'?: Record<string, unknown>;
  'Compute Engine Tasks'?: Record<string, unknown>;
  'Compute Engine JVM State'?: Record<string, unknown>;
  'Compute Engine Database Connection'?: Record<string, unknown>;
  'Compute Engine Logging'?: Record<string, unknown>;
  'Search State'?: Record<string, unknown>;
  'Search Indexes'?: Record<string, unknown>;
  ALMs?: Record<string, unknown>;
  'Server Push Connections'?: Record<string, unknown>;
  Settings?: Record<string, unknown>;
  [key: string]: Record<string, unknown> | undefined;
}

export interface ListWebhooksResponse {
  webhooks: Array<{
    key: string;
    name: string;
    url: string;
    hasSecret?: boolean;
    latestDelivery?: {
      id: string;
      at: string;
      success: boolean;
      httpStatus?: number;
      durationMs?: number;
      componentKey?: string;
    };
  }>;
}

export interface PortfoliosSearchResponse {
  paging: {
    pageIndex: number;
    pageSize: number;
    total: number;
  };
  components: Array<{
    key: string;
    name: string;
    qualifier: string;
    visibility?: string;
    isFavorite?: boolean;
    description?: string;
  }>;
}

export interface CreateWebhookResponse {
  webhook: {
    key: string;
    name: string;
    url: string;
    hasSecret?: boolean;
  };
}
