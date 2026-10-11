import { IToolService, ToolDefinition, ToolScope, toolNotFoundError } from '../../shared';
import { SonarQubeClient, SonarQubeConfig } from './client';
import { sonarqubeSchemas, SonarQubeToolName } from './schemas';
import { getSonarQubeToolsByScope } from './tools';

/**
 * SonarQube tool service implementing IToolService interface.
 */
export class SonarQubeService implements IToolService {
  readonly serviceName = 'sonarqube';

  private readonly client: SonarQubeClient;
  private readonly scope: ToolScope;

  constructor(config: SonarQubeConfig) {
    this.client = new SonarQubeClient(config);
    this.scope = config.scope || 'read'; // Default to read-only for SonarQube
  }

  isConfigured(): boolean {
    return this.client.isConfigured();
  }

  getTools(): ToolDefinition[] {
    return getSonarQubeToolsByScope(this.scope);
  }

  async executeTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    // Validate tool exists
    if (!(toolName in sonarqubeSchemas)) {
      throw toolNotFoundError(this.serviceName, toolName);
    }

    // Validate scope - write tools require write scope
    const toolDef = sonarqubeSchemas[toolName as SonarQubeToolName];
    if (toolDef.scope === 'write' && this.scope === 'read') {
      throw new Error(`[${this.serviceName}] Tool "${toolName}" requires write scope, but service is configured with read-only scope`);
    }

    // Parse and validate args
    const schema = toolDef.schema;
    const parsed = schema.parse(args);

    // Execute tool
    switch (toolName) {
      case 'sonarqube_searchProjects':
        return this.searchProjects(parsed);

      case 'sonarqube_getQualityGateStatus':
        return this.getQualityGateStatus(parsed);

      case 'sonarqube_listQualityGates':
        return this.listQualityGates();

      case 'sonarqube_searchIssues':
        return this.searchIssues(parsed);

      case 'sonarqube_searchSecurityHotspots':
        return this.searchSecurityHotspots(parsed);

      case 'sonarqube_showSecurityHotspot':
        return this.showSecurityHotspot(parsed);

      case 'sonarqube_showRule':
        return this.showRule(parsed);

      case 'sonarqube_getComponentMeasures':
        return this.getComponentMeasures(parsed);

      case 'sonarqube_searchFilesByCoverage':
        return this.searchFilesByCoverage(parsed);

      case 'sonarqube_getRawSource':
        return this.getRawSource(parsed);

      case 'sonarqube_getScmInfo':
        return this.getScmInfo(parsed);

      case 'sonarqube_getFileCoverageDetails':
        return this.getFileCoverageDetails(parsed);

      case 'sonarqube_getDuplications':
        return this.getDuplications(parsed);

      case 'sonarqube_searchDuplicatedFiles':
        return this.searchDuplicatedFiles(parsed);

      case 'sonarqube_listPullRequests':
        return this.listPullRequests(parsed);

      case 'sonarqube_listLanguages':
        return this.listLanguages(parsed);

      case 'sonarqube_searchMetrics':
        return this.searchMetrics(parsed);

      case 'sonarqube_getSystemHealth':
        return this.getSystemHealth();

      case 'sonarqube_getSystemStatus':
        return this.getSystemStatus();

      case 'sonarqube_systemPing':
        return this.systemPing();

      case 'sonarqube_getSystemInfo':
        return this.getSystemInfo();

      case 'sonarqube_getSystemLogs':
        return this.getSystemLogs(parsed);

      case 'sonarqube_listWebhooks':
        return this.listWebhooks(parsed);

      case 'sonarqube_listPortfolios':
        return this.listPortfolios(parsed);

      // Write tools
      case 'sonarqube_changeIssueStatus':
        return this.changeIssueStatus(parsed);

      case 'sonarqube_changeSecurityHotspotStatus':
        return this.changeSecurityHotspotStatus(parsed);

      case 'sonarqube_createWebhook':
        return this.createWebhook(parsed);

      default:
        throw toolNotFoundError(this.serviceName, toolName);
    }
  }

  // ============================================================================
  // Tool Implementations
  // ============================================================================

  private async searchProjects(args: {
    query?: string;
    page?: number;
    pageSize?: number;
  }): Promise<unknown> {
    const response = await this.client.searchProjects(
      args.query,
      args.page,
      args.pageSize
    );

    // Transform to simplified response
    const projects = response.components.map(p => ({
      key: p.key,
      name: p.name,
    }));

    const hasNextPage = (response.paging.pageIndex * response.paging.pageSize) < response.paging.total;

    return {
      projects,
      paging: {
        page: response.paging.pageIndex,
        pageSize: response.paging.pageSize,
        total: response.paging.total,
        hasNextPage,
      },
    };
  }

  private async getQualityGateStatus(args: {
    projectKey?: string;
    analysisId?: string;
    branch?: string;
    pullRequest?: string;
  }): Promise<unknown> {
    // Validate at least one identifier is provided
    if (!args.projectKey && !args.analysisId) {
      throw new Error('Either projectKey or analysisId must be provided');
    }

    const response = await this.client.getQualityGateStatus(
      args.projectKey,
      args.analysisId,
      args.branch,
      args.pullRequest
    );

    const status = response.projectStatus;

    // Transform to simplified response
    return {
      status: status.status,
      conditions: status.conditions.map(c => ({
        metric: c.metricKey,
        status: c.status,
        threshold: c.errorThreshold,
        actual: c.actualValue,
      })),
      ignoredConditions: status.ignoredConditions ?? false,
    };
  }

  private async listQualityGates(): Promise<unknown> {
    const response = await this.client.listQualityGates();

    return {
      qualityGates: response.qualitygates.map(qg => ({
        id: qg.id,
        name: qg.name,
        isDefault: qg.isDefault ?? false,
        isBuiltIn: qg.isBuiltIn ?? false,
        conditions: qg.conditions?.map(c => ({
          metric: c.metric,
          operator: c.op,
          threshold: c.error,
        })) ?? [],
      })),
      defaultGate: response.default,
    };
  }

  private async searchIssues(args: {
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
  }): Promise<unknown> {
    const response = await this.client.searchIssues(args);

    const hasNextPage = (response.paging.pageIndex * response.paging.pageSize) < response.paging.total;

    return {
      issues: response.issues.map(issue => ({
        key: issue.key,
        rule: issue.rule,
        severity: issue.severity,
        type: issue.type,
        component: issue.component,
        project: issue.project,
        line: issue.line,
        message: issue.message,
        status: issue.status,
        resolution: issue.resolution,
        effort: issue.effort,
        assignee: issue.assignee,
        author: issue.author,
        tags: issue.tags,
        creationDate: issue.creationDate,
      })),
      filters: {
        branch: args.branch,
        pullRequest: args.pullRequest,
        inNewCodePeriod: args.inNewCodePeriod,
      },
      paging: {
        page: response.paging.pageIndex,
        pageSize: response.paging.pageSize,
        total: response.paging.total,
        hasNextPage,
      },
    };
  }

  private async searchSecurityHotspots(args: {
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
  }): Promise<unknown> {
    const response = await this.client.searchSecurityHotspots(args);

    const hasNextPage = (response.paging.pageIndex * response.paging.pageSize) < response.paging.total;

    return {
      hotspots: response.hotspots.map(hs => ({
        key: hs.key,
        component: hs.component,
        project: hs.project,
        securityCategory: hs.securityCategory,
        vulnerabilityProbability: hs.vulnerabilityProbability,
        status: hs.status,
        resolution: hs.resolution,
        line: hs.line,
        message: hs.message,
        assignee: hs.assignee,
        author: hs.author,
        creationDate: hs.creationDate,
      })),
      filters: {
        branch: args.branch,
        pullRequest: args.pullRequest,
        inNewCodePeriod: args.inNewCodePeriod,
      },
      paging: {
        page: response.paging.pageIndex,
        pageSize: response.paging.pageSize,
        total: response.paging.total,
        hasNextPage,
      },
    };
  }

  private async showSecurityHotspot(args: {
    hotspot: string;
  }): Promise<unknown> {
    const response = await this.client.showSecurityHotspot(args.hotspot);

    return {
      key: response.key,
      status: response.status,
      resolution: response.resolution,
      line: response.line,
      message: response.message,
      component: {
        key: response.component.key,
        name: response.component.name,
        path: response.component.path,
      },
      project: {
        key: response.project.key,
        name: response.project.name,
      },
      rule: {
        key: response.rule.key,
        name: response.rule.name,
        securityCategory: response.rule.securityCategory,
        vulnerabilityProbability: response.rule.vulnerabilityProbability,
      },
      assignee: response.assignee,
      author: response.author,
      creationDate: response.creationDate,
      updateDate: response.updateDate,
      changelog: response.changelog?.map(entry => ({
        user: entry.userName || entry.user,
        date: entry.creationDate,
        changes: entry.diffs.map(d => ({
          field: d.key,
          oldValue: d.oldValue,
          newValue: d.newValue,
        })),
      })),
    };
  }

  private async showRule(args: {
    key: string;
  }): Promise<unknown> {
    const response = await this.client.showRule(args.key);
    const rule = response.rule;

    return {
      key: rule.key,
      name: rule.name,
      severity: rule.severity,
      type: rule.type,
      language: rule.langName || rule.lang,
      status: rule.status,
      tags: rule.tags,
      impacts: rule.impacts?.map(i => ({
        quality: i.softwareQuality,
        severity: i.severity,
      })),
      description: rule.htmlDesc || rule.mdDesc,
      sections: rule.descriptionSections?.map(s => ({
        key: s.key,
        content: s.content,
      })),
    };
  }

  private async getComponentMeasures(args: {
    projectKey?: string;
    metricKeys?: string[];
    branch?: string;
    pullRequest?: string;
  }): Promise<unknown> {
    // Default metrics if none specified
    const metricKeys = args.metricKeys?.length ? args.metricKeys : [
      'ncloc',
      'complexity',
      'violations',
      'coverage',
      'duplicated_lines_density',
      'bugs',
      'vulnerabilities',
      'code_smells',
    ];

    const response = await this.client.getComponentMeasures({
      projectKey: args.projectKey,
      metricKeys,
      branch: args.branch,
      pullRequest: args.pullRequest,
    });

    const component = response.component;

    return {
      component: {
        key: component.key,
        name: component.name,
        qualifier: component.qualifier,
        description: component.description,
      },
      measures: component.measures?.map(m => ({
        metric: m.metric,
        value: m.value,
      })) ?? [],
      metrics: response.metrics?.map(m => ({
        key: m.key,
        name: m.name,
        description: m.description,
        type: m.type,
      })),
    };
  }

  private async searchFilesByCoverage(args: {
    projectKey: string;
    branch?: string;
    pullRequest?: string;
    maxCoverage?: number;
    pageIndex?: number;
    pageSize?: number;
  }): Promise<unknown> {
    // Validate maxCoverage
    if (args.maxCoverage !== undefined && (args.maxCoverage < 0 || args.maxCoverage > 100)) {
      throw new Error('maxCoverage must be between 0 and 100');
    }

    const response = await this.client.searchFilesByCoverage(args);

    // Parse measures and filter by maxCoverage
    const files = response.components
      .map(comp => {
        const measuresMap = new Map(
          comp.measures?.map(m => [m.metric, m.value]) ?? []
        );

        const coverage = measuresMap.get('coverage');
        const coverageNum = coverage ? parseFloat(coverage) : null;

        return {
          key: comp.key,
          path: comp.path || comp.name,
          language: comp.language,
          coverage: coverageNum,
          lineCoverage: measuresMap.get('line_coverage') ? parseFloat(measuresMap.get('line_coverage')!) : null,
          branchCoverage: measuresMap.get('branch_coverage') ? parseFloat(measuresMap.get('branch_coverage')!) : null,
          linesToCover: measuresMap.get('lines_to_cover') ? parseInt(measuresMap.get('lines_to_cover')!) : null,
          uncoveredLines: measuresMap.get('uncovered_lines') ? parseInt(measuresMap.get('uncovered_lines')!) : null,
        };
      })
      .filter(file => {
        // Filter out files without coverage data
        if (file.coverage === null) return false;
        // Apply maxCoverage filter if specified
        if (args.maxCoverage !== undefined && file.coverage > args.maxCoverage) return false;
        return true;
      });

    const hasNextPage = (response.paging.pageIndex * response.paging.pageSize) < response.paging.total;

    return {
      projectKey: args.projectKey,
      files,
      paging: {
        page: response.paging.pageIndex,
        pageSize: response.paging.pageSize,
        total: response.paging.total,
        returned: files.length,
        hasNextPage,
      },
    };
  }

  private async getRawSource(args: {
    key: string;
    branch?: string;
    pullRequest?: string;
  }): Promise<unknown> {
    const rawSource = await this.client.getRawSource(args.key, args.branch, args.pullRequest);

    // Extract file path from key
    const filePath = args.key.includes(':') ? args.key.substring(args.key.indexOf(':') + 1) : args.key;

    return {
      key: args.key,
      filePath,
      source: rawSource,
      lineCount: rawSource.split('\n').length,
    };
  }

  private async getScmInfo(args: {
    key: string;
    commitsByLine?: boolean;
    from?: number;
    to?: number;
  }): Promise<unknown> {
    const response = await this.client.getScmInfo(args);

    // Transform SCM data - response.scm is an array of [line, author, date, revision]
    const lines = response.scm.map(entry => ({
      line: entry[0],
      author: entry[1],
      date: entry[2],
      revision: entry[3],
    }));

    return {
      key: args.key,
      lines,
      totalLines: lines.length,
    };
  }

  private async getFileCoverageDetails(args: {
    key: string;
    branch?: string;
    pullRequest?: string;
    from?: number;
    to?: number;
  }): Promise<unknown> {
    const response = await this.client.getSourceLines({
      key: args.key,
      branch: args.branch,
      pullRequest: args.pullRequest,
      from: args.from,
      to: args.to,
    });

    // Extract file path from key
    const filePath = args.key.includes(':') ? args.key.substring(args.key.indexOf(':') + 1) : args.key;

    const sources = response.sources;
    const totalLines = sources.length;

    // Calculate coverage metrics
    const coverableLines = sources.filter(s => s.lineHits !== undefined);
    const coveredLines = coverableLines.filter(s => (s.lineHits ?? 0) > 0);
    const uncoveredLines = coverableLines.filter(s => s.lineHits === 0);

    const lineCoveragePercent = coverableLines.length === 0 ? 100 :
      (coveredLines.length * 100.0 / coverableLines.length);

    // Calculate branch coverage
    const totalConditions = sources.reduce((sum, s) => sum + (s.conditions ?? 0), 0);
    const coveredConditions = sources.reduce((sum, s) => sum + (s.coveredConditions ?? 0), 0);
    const branchCoveragePercent = totalConditions === 0 ? 100 :
      (coveredConditions * 100.0 / totalConditions);

    // Get uncovered line numbers
    const uncoveredLineNumbers = uncoveredLines.map(s => s.line);

    // Get partially covered branches
    const partialBranches = sources
      .filter(s => s.conditions && s.coveredConditions !== undefined && s.coveredConditions < s.conditions)
      .map(s => ({
        line: s.line,
        totalConditions: s.conditions!,
        coveredConditions: s.coveredConditions!,
        uncoveredConditions: s.conditions! - s.coveredConditions!,
      }));

    return {
      key: args.key,
      filePath,
      summary: {
        totalLines,
        coverableLines: coverableLines.length,
        coveredLines: coveredLines.length,
        uncoveredLines: uncoveredLines.length,
        lineCoveragePercent: Math.round(lineCoveragePercent * 100) / 100,
        totalConditions,
        coveredConditions,
        uncoveredConditions: totalConditions - coveredConditions,
        branchCoveragePercent: Math.round(branchCoveragePercent * 100) / 100,
      },
      uncoveredLineNumbers,
      partialBranches,
    };
  }

  private async getDuplications(args: {
    key: string;
    branch?: string;
    pullRequest?: string;
  }): Promise<unknown> {
    const response = await this.client.getDuplications(args.key, args.branch, args.pullRequest);

    // Transform duplications
    const duplications = response.duplications.map(dup => ({
      blocks: dup.blocks.map(block => {
        const fileInfo = response.files[block._ref];
        return {
          from: block.from,
          size: block.size,
          file: fileInfo?.name || '',
          fileKey: fileInfo?.key || '',
        };
      }),
    }));

    // Get unique files involved
    const files = Object.values(response.files).map(f => ({
      key: f.key,
      name: f.name,
    }));

    return {
      key: args.key,
      duplications,
      files,
      totalDuplications: duplications.length,
    };
  }

  private async searchDuplicatedFiles(args: {
    projectKey: string;
    branch?: string;
    pullRequest?: string;
    pageSize?: number;
    pageIndex?: number;
  }): Promise<unknown> {
    const response = await this.client.searchDuplicatedFiles(args);

    // Filter to only files with duplications and transform
    const files = response.components
      .map(comp => {
        const measuresMap = new Map(
          comp.measures?.map(m => [m.metric, m.value]) ?? []
        );

        const duplicatedLines = measuresMap.get('duplicated_lines');
        const duplicatedBlocks = measuresMap.get('duplicated_blocks');
        const duplicatedDensity = measuresMap.get('duplicated_lines_density');

        return {
          key: comp.key,
          name: comp.name,
          path: comp.path,
          duplicatedLines: duplicatedLines ? parseInt(duplicatedLines) : 0,
          duplicatedBlocks: duplicatedBlocks ? parseInt(duplicatedBlocks) : 0,
          duplicatedLinesDensity: duplicatedDensity ? parseFloat(duplicatedDensity) : 0,
        };
      })
      .filter(f => f.duplicatedLines > 0);

    const hasNextPage = (response.paging.pageIndex * response.paging.pageSize) < response.paging.total;

    return {
      projectKey: args.projectKey,
      files,
      paging: {
        page: response.paging.pageIndex,
        pageSize: response.paging.pageSize,
        total: response.paging.total,
        returned: files.length,
        hasNextPage,
      },
    };
  }

  private async listPullRequests(args: {
    projectKey: string;
  }): Promise<unknown> {
    const response = await this.client.listPullRequests(args.projectKey);

    const pullRequests = response.pullRequests.map(pr => ({
      key: pr.key,
      title: pr.title,
      branch: pr.branch,
      base: pr.base || pr.target,
      status: pr.status ? {
        qualityGate: pr.status.qualityGateStatus,
        bugs: pr.status.bugs,
        vulnerabilities: pr.status.vulnerabilities,
        codeSmells: pr.status.codeSmells,
      } : undefined,
      analysisDate: pr.analysisDate,
      url: pr.url,
    }));

    return {
      projectKey: args.projectKey,
      pullRequests,
      total: pullRequests.length,
    };
  }

  private async listLanguages(args: {
    query?: string;
  }): Promise<unknown> {
    const response = await this.client.listLanguages(args.query);

    return {
      languages: response.languages.map(lang => ({
        key: lang.key,
        name: lang.name,
      })),
      total: response.languages.length,
    };
  }

  private async searchMetrics(args: {
    page?: number;
    pageSize?: number;
  }): Promise<unknown> {
    const response = await this.client.searchMetrics(args.page, args.pageSize);

    const hasNextPage = (response.p * response.ps) < response.total;

    return {
      metrics: response.metrics.map(m => ({
        id: m.id,
        key: m.key,
        name: m.name,
        description: m.description,
        domain: m.domain,
        type: m.type,
        hidden: m.hidden ?? false,
        custom: m.custom ?? false,
      })),
      paging: {
        page: response.p,
        pageSize: response.ps,
        total: response.total,
        hasNextPage,
      },
    };
  }

  private async getSystemHealth(): Promise<unknown> {
    const response = await this.client.getSystemHealth();

    return {
      health: response.health,
      causes: response.causes?.map(c => c.message),
      nodes: response.nodes?.map(node => ({
        name: node.name,
        type: node.type,
        health: node.health,
        host: node.host,
        port: node.port,
        startedAt: node.startedAt,
        causes: node.causes?.map(c => c.message),
      })),
    };
  }

  private async getSystemStatus(): Promise<unknown> {
    const response = await this.client.getSystemStatus();

    const statusDescriptions: Record<string, string> = {
      'STARTING': 'SonarQube Web Server is up and serving some Web Services but initialization is still ongoing',
      'UP': 'SonarQube instance is up and running',
      'DOWN': 'SonarQube instance is up but not running because migration has failed or some other reason',
      'RESTARTING': 'SonarQube instance is still up but a restart has been requested',
      'DB_MIGRATION_NEEDED': 'Database migration is required',
      'DB_MIGRATION_RUNNING': 'Database migration is running',
    };

    return {
      status: response.status,
      statusDescription: statusDescriptions[response.status] || 'Unknown status',
      version: response.version,
      id: response.id,
    };
  }

  private async systemPing(): Promise<unknown> {
    const response = await this.client.systemPing();

    return {
      response: response.trim(),
      alive: response.trim().toLowerCase() === 'pong',
      timestamp: new Date().toISOString(),
    };
  }

  private async getSystemInfo(): Promise<unknown> {
    const response = await this.client.getSystemInfo();

    // Transform the response into a more structured format
    const sections: Array<{ name: string; attributes: Record<string, unknown> }> = [];

    // Define the known section names
    const sectionNames = [
      'System', 'Database', 'Bundled', 'Plugins',
      'Web JVM State', 'Web Database Connection', 'Web Logging',
      'Compute Engine Tasks', 'Compute Engine JVM State',
      'Compute Engine Database Connection', 'Compute Engine Logging',
      'Search State', 'Search Indexes', 'ALMs',
      'Server Push Connections', 'Settings',
    ];

    for (const name of sectionNames) {
      const data = response[name];
      if (data && typeof data === 'object' && Object.keys(data).length > 0) {
        sections.push({ name, attributes: data });
      }
    }

    // Also include any other sections not in the known list
    for (const [key, value] of Object.entries(response)) {
      if (!sectionNames.includes(key) && value && typeof value === 'object' && Object.keys(value).length > 0) {
        sections.push({ name: key, attributes: value });
      }
    }

    return {
      sections,
      sectionCount: sections.length,
    };
  }

  private async getSystemLogs(args: {
    name?: string;
  }): Promise<unknown> {
    const logName = args.name || 'app';
    const logs = await this.client.getSystemLogs(logName);

    const lines = logs.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim().length > 0);

    return {
      logType: logName,
      content: logs,
      lineCount: lines.length,
      nonEmptyLineCount: nonEmptyLines.length,
      truncated: logs.length > 100000, // Indicate if logs are large
    };
  }

  private async listWebhooks(args: {
    projectKey?: string;
  }): Promise<unknown> {
    const response = await this.client.listWebhooks(args.projectKey);

    const webhooks = response.webhooks.map(wh => ({
      key: wh.key,
      name: wh.name,
      url: wh.url,
      hasSecret: wh.hasSecret ?? false,
      latestDelivery: wh.latestDelivery ? {
        id: wh.latestDelivery.id,
        at: wh.latestDelivery.at,
        success: wh.latestDelivery.success,
        httpStatus: wh.latestDelivery.httpStatus,
        durationMs: wh.latestDelivery.durationMs,
      } : undefined,
    }));

    return {
      scope: args.projectKey ? 'project' : 'global',
      projectKey: args.projectKey,
      webhooks,
      total: webhooks.length,
    };
  }

  private async listPortfolios(args: {
    query?: string;
    favorite?: boolean;
    pageIndex?: number;
    pageSize?: number;
  }): Promise<unknown> {
    const response = await this.client.listPortfolios(args);

    const portfolios = response.components.map(comp => ({
      key: comp.key,
      name: comp.name,
      qualifier: comp.qualifier,
      visibility: comp.visibility,
      isFavorite: comp.isFavorite ?? false,
      description: comp.description,
    }));

    const hasNextPage = (response.paging.pageIndex * response.paging.pageSize) < response.paging.total;

    return {
      portfolios,
      paging: {
        page: response.paging.pageIndex,
        pageSize: response.paging.pageSize,
        total: response.paging.total,
        hasNextPage,
      },
    };
  }

  // ============================================================================
  // Write Tool Implementations
  // ============================================================================

  private async changeIssueStatus(args: {
    issueKey: string;
    transition: 'accept' | 'falsepositive' | 'reopen';
  }): Promise<unknown> {
    await this.client.changeIssueStatus(args.issueKey, args.transition);

    const transitionDescriptions: Record<string, string> = {
      'accept': 'Issue accepted (won\'t fix)',
      'falsepositive': 'Issue marked as false positive',
      'reopen': 'Issue reopened for further review',
    };

    return {
      success: true,
      issueKey: args.issueKey,
      transition: args.transition,
      message: transitionDescriptions[args.transition] || 'Issue status changed',
      timestamp: new Date().toISOString(),
    };
  }

  private async changeSecurityHotspotStatus(args: {
    hotspotKey: string;
    status: 'TO_REVIEW' | 'REVIEWED';
    resolution?: 'FIXED' | 'SAFE' | 'ACKNOWLEDGED';
    comment?: string;
  }): Promise<unknown> {
    // Validate that resolution is provided when status is REVIEWED
    if (args.status === 'REVIEWED' && !args.resolution) {
      throw new Error('Resolution is required when status is REVIEWED. Valid resolutions: FIXED, SAFE, ACKNOWLEDGED');
    }

    // Validate that resolution is not provided when status is TO_REVIEW
    if (args.status === 'TO_REVIEW' && args.resolution) {
      throw new Error('Resolution should not be provided when status is TO_REVIEW');
    }

    await this.client.changeSecurityHotspotStatus(
      args.hotspotKey,
      args.status,
      args.resolution,
      args.comment
    );

    const resolutionDescriptions: Record<string, string> = {
      'FIXED': 'A fix has been implemented',
      'SAFE': 'Reviewed and determined to be safe',
      'ACKNOWLEDGED': 'Risk acknowledged and accepted',
    };

    return {
      success: true,
      hotspotKey: args.hotspotKey,
      status: args.status,
      resolution: args.resolution,
      resolutionDescription: args.resolution ? resolutionDescriptions[args.resolution] : undefined,
      comment: args.comment,
      message: args.status === 'REVIEWED'
        ? `Security Hotspot reviewed as ${args.resolution}`
        : 'Security Hotspot marked for review',
      timestamp: new Date().toISOString(),
    };
  }

  private async createWebhook(args: {
    name: string;
    url: string;
    projectKey?: string;
    secret?: string;
  }): Promise<unknown> {
    const response = await this.client.createWebhook(
      args.name,
      args.url,
      args.projectKey,
      args.secret
    );

    return {
      success: true,
      webhook: {
        key: response.webhook.key,
        name: response.webhook.name,
        url: response.webhook.url,
        hasSecret: response.webhook.hasSecret ?? false,
      },
      scope: args.projectKey ? 'project' : 'global',
      projectKey: args.projectKey,
      message: args.projectKey
        ? `Webhook created for project ${args.projectKey}`
        : 'Global webhook created',
      timestamp: new Date().toISOString(),
    };
  }
}
