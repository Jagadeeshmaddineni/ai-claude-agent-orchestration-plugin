import { WebApi, getPersonalAccessTokenHandler } from 'azure-devops-node-api';
import { MCPError, notConfiguredError } from '../../shared';

/**
 * Azure DevOps organization configuration.
 */
export interface AzureDevOpsOrg {
  name: string;
  token: string;
}

/**
 * Azure DevOps service configuration.
 */
export interface AzureDevOpsConfig {
  enabled: boolean;
  baseUrl: string;
  organizations: Record<string, AzureDevOpsOrg>;
  scope?: 'read' | 'write';
}

/**
 * SDK-based client for Azure DevOps APIs.
 * Wraps azure-devops-node-api instead of using BaseHttpClient.
 */
export class AzureDevOpsClient {
  private readonly config: AzureDevOpsConfig;
  private readonly connectionPool: Map<string, WebApi> = new Map();

  constructor(config: AzureDevOpsConfig) {
    this.config = config;
  }

  /**
   * Check if Azure DevOps is properly configured.
   */
  isConfigured(): boolean {
    return this.config.enabled && Object.keys(this.config.organizations).length > 0;
  }

  /**
   * Get list of configured organizations.
   */
  getOrganizations(): Array<{ id: string; name: string }> {
    return Object.entries(this.config.organizations).map(([id, org]) => ({
      id,
      name: org.name,
    }));
  }

  /**
   * Get organization config, throw if not found.
   */
  private getOrg(orgId: string): AzureDevOpsOrg {
    const org = this.config.organizations[orgId];
    if (!org) {
      const available = Object.keys(this.config.organizations).join(', ') || 'none';
      throw new MCPError(
        'Azure DevOps',
        'ORG_NOT_FOUND',
        `Organization "${orgId}" not configured`,
        `Available organizations: ${available}. Add it to ~/.claude/mcp-config.json`
      );
    }
    return org;
  }

  /**
   * Get or create SDK connection for an organization.
   */
  private getConnection(orgId: string): WebApi {
    if (!this.isConfigured()) {
      throw notConfiguredError('Azure DevOps', ['baseUrl', 'organizations']);
    }

    const cached = this.connectionPool.get(orgId);
    if (cached) return cached;

    const org = this.getOrg(orgId);
    const baseUrl = this.config.baseUrl.replace(/\/+$/, '');
    const organizationUrl = `${baseUrl}/${orgId}`;

    const authHandler = getPersonalAccessTokenHandler(org.token);
    const connection = new WebApi(organizationUrl, authHandler);

    this.connectionPool.set(orgId, connection);
    return connection;
  }

  // ============================================================================
  // Organization
  // ============================================================================

  async listOrganizations(): Promise<unknown> {
    if (!this.isConfigured()) {
      throw notConfiguredError('Azure DevOps', ['baseUrl', 'organizations']);
    }
    return {
      success: true,
      baseUrl: this.config.baseUrl,
      organizations: this.getOrganizations(),
    };
  }

  // ============================================================================
  // Projects
  // ============================================================================

  async listProjects(organization: string, stateFilter?: string, top?: number): Promise<unknown> {
    const connection = this.getConnection(organization);
    const coreApi = await connection.getCoreApi();
    const projects = await coreApi.getProjects(stateFilter as any, top);

    return {
      success: true,
      organization,
      count: projects.length,
      projects: projects.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        state: p.state,
        visibility: p.visibility,
      })),
    };
  }

  // ============================================================================
  // Repositories
  // ============================================================================

  async listRepositories(organization: string, project: string): Promise<unknown> {
    const connection = this.getConnection(organization);
    const gitApi = await connection.getGitApi();
    const repositories = await gitApi.getRepositories(project);

    return {
      success: true,
      organization,
      count: repositories?.length || 0,
      repositories: (repositories || []).map(repo => ({
        id: repo.id,
        name: repo.name,
        url: repo.url,
        defaultBranch: repo.defaultBranch,
        remoteUrl: repo.remoteUrl,
        webUrl: repo.webUrl,
      })),
    };
  }

  async getRepository(organization: string, project: string, repositoryId: string): Promise<unknown> {
    const connection = this.getConnection(organization);
    const gitApi = await connection.getGitApi();
    const repo = await gitApi.getRepository(repositoryId, project);

    return {
      success: true,
      organization,
      repository: {
        id: repo.id,
        name: repo.name,
        url: repo.url,
        defaultBranch: repo.defaultBranch,
        remoteUrl: repo.remoteUrl,
        sshUrl: repo.sshUrl,
        webUrl: repo.webUrl,
        size: repo.size,
      },
    };
  }

  async listBranches(organization: string, project: string, repositoryId: string): Promise<unknown> {
    const connection = this.getConnection(organization);
    const gitApi = await connection.getGitApi();
    const refs = await gitApi.getRefs(repositoryId, project, 'heads');

    return {
      success: true,
      organization,
      count: refs?.length || 0,
      branches: (refs || []).map(ref => ({
        name: ref.name?.replace('refs/heads/', ''),
        objectId: ref.objectId,
        creator: ref.creator?.displayName,
      })),
    };
  }

  async listCommits(organization: string, project: string, repositoryId: string, branch?: string, top?: number): Promise<unknown> {
    const connection = this.getConnection(organization);
    const gitApi = await connection.getGitApi();

    const searchCriteria: any = {};
    if (branch) {
      searchCriteria.itemVersion = { version: branch, versionType: 0 };
    }
    if (top) {
      searchCriteria.$top = top;
    }

    const commits = await gitApi.getCommits(repositoryId, searchCriteria, project);

    return {
      success: true,
      organization,
      count: commits?.length || 0,
      commits: (commits || []).map(c => ({
        commitId: c.commitId,
        author: c.author?.name,
        authorEmail: c.author?.email,
        date: c.author?.date,
        comment: c.comment,
      })),
    };
  }

  async createRepository(organization: string, project: string, name: string): Promise<unknown> {
    const connection = this.getConnection(organization);
    const gitApi = await connection.getGitApi();
    const coreApi = await connection.getCoreApi();

    const projectObj = await coreApi.getProject(project);
    if (!projectObj?.id) {
      throw new MCPError('Azure DevOps', 'NOT_FOUND', `Project '${project}' not found`);
    }

    const repo = await gitApi.createRepository({
      name,
      project: { id: projectObj.id },
    }, project);

    return {
      success: true,
      organization,
      repository: {
        id: repo.id,
        name: repo.name,
        url: repo.url,
        remoteUrl: repo.remoteUrl,
      },
    };
  }

  async createBranch(organization: string, project: string, repositoryId: string, branchName: string, sourceBranch: string): Promise<unknown> {
    const connection = this.getConnection(organization);
    const gitApi = await connection.getGitApi();

    const refs = await gitApi.getRefs(repositoryId, project, `heads/${sourceBranch}`);
    const sourceRef = refs?.[0];
    if (!sourceRef?.objectId) {
      throw new MCPError('Azure DevOps', 'NOT_FOUND', `Source branch '${sourceBranch}' not found`);
    }

    const result = await gitApi.updateRefs([{
      name: `refs/heads/${branchName}`,
      oldObjectId: '0000000000000000000000000000000000000000',
      newObjectId: sourceRef.objectId,
    }], repositoryId, project);

    return {
      success: true,
      organization,
      branch: {
        name: branchName,
        objectId: result?.[0]?.newObjectId,
      },
    };
  }

  // ============================================================================
  // Pull Requests
  // ============================================================================

  async listPullRequests(organization: string, project: string, repositoryId: string, status?: string): Promise<unknown> {
    const connection = this.getConnection(organization);
    const gitApi = await connection.getGitApi();

    const searchCriteria: any = {};
    if (status && status !== 'all') {
      const statusMap: Record<string, number> = { active: 1, abandoned: 2, completed: 3 };
      searchCriteria.status = statusMap[status] || 1;
    }

    const prs = await gitApi.getPullRequests(repositoryId, searchCriteria, project);

    return {
      success: true,
      organization,
      count: prs?.length || 0,
      pullRequests: (prs || []).map(pr => ({
        pullRequestId: pr.pullRequestId,
        title: pr.title,
        status: pr.status,
        createdBy: pr.createdBy?.displayName,
        sourceRefName: pr.sourceRefName,
        targetRefName: pr.targetRefName,
        creationDate: pr.creationDate,
      })),
    };
  }

  async getPullRequestFiles(organization: string, project: string, repositoryId: string, pullRequestId: number): Promise<unknown> {
    const connection = this.getConnection(organization);
    const gitApi = await connection.getGitApi();

    const iterations = await gitApi.getPullRequestIterations(repositoryId, pullRequestId, project);
    if (!iterations || iterations.length === 0) {
      return { success: true, organization, changes: [] };
    }

    const lastIteration = iterations[iterations.length - 1];
    const changes = await gitApi.getPullRequestIterationChanges(repositoryId, pullRequestId, lastIteration.id!, project);

    return {
      success: true,
      organization,
      changes: (changes?.changeEntries || []).map((c: any) => ({
        path: c.item?.path,
        changeType: c.changeType,
      })),
    };
  }

  async getPRComments(organization: string, project: string, repositoryId: string, pullRequestId: number): Promise<unknown> {
    const connection = this.getConnection(organization);
    const gitApi = await connection.getGitApi();
    const threads = await gitApi.getThreads(repositoryId, pullRequestId, project);

    return {
      success: true,
      organization,
      count: threads?.length || 0,
      threads: (threads || []).map(thread => ({
        id: thread.id,
        status: thread.status,
        comments: thread.comments?.map(comment => ({
          id: comment.id,
          content: comment.content,
          author: comment.author?.displayName,
          publishedDate: comment.publishedDate,
        })),
      })),
    };
  }

  async createPullRequest(organization: string, project: string, repositoryId: string, sourceRefName: string, targetRefName: string, title: string, description?: string): Promise<unknown> {
    const connection = this.getConnection(organization);
    const gitApi = await connection.getGitApi();

    const pr = await gitApi.createPullRequest({
      sourceRefName: sourceRefName.startsWith('refs/') ? sourceRefName : `refs/heads/${sourceRefName}`,
      targetRefName: targetRefName.startsWith('refs/') ? targetRefName : `refs/heads/${targetRefName}`,
      title,
      description: description || '',
    }, repositoryId, project);

    return {
      success: true,
      organization,
      pullRequest: {
        pullRequestId: pr.pullRequestId,
        title: pr.title,
        status: pr.status,
        url: pr.url,
      },
    };
  }

  async updatePullRequest(organization: string, project: string, repositoryId: string, pullRequestId: number, title?: string, description?: string, status?: string): Promise<unknown> {
    const connection = this.getConnection(organization);
    const gitApi = await connection.getGitApi();

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status !== undefined) {
      const statusMap: Record<string, number> = { active: 1, abandoned: 2 };
      updateData.status = statusMap[status];
    }

    const pr = await gitApi.updatePullRequest(updateData, repositoryId, pullRequestId, project);

    return {
      success: true,
      organization,
      pullRequest: {
        pullRequestId: pr.pullRequestId,
        title: pr.title,
        status: pr.status,
      },
    };
  }

  async approvePullRequest(organization: string, project: string, repositoryId: string, pullRequestId: number): Promise<unknown> {
    const connection = this.getConnection(organization);
    const gitApi = await connection.getGitApi();

    const locationApi = await connection.getLocationsApi();
    const connectionData = await locationApi.getConnectionData();
    const reviewerId = connectionData.authenticatedUser?.id;

    if (!reviewerId) {
      throw new MCPError('Azure DevOps', 'API_ERROR', 'Could not get current user ID');
    }

    await gitApi.createPullRequestReviewer({
      vote: 10,
    }, repositoryId, pullRequestId, reviewerId, project);

    return { success: true, organization, message: 'Pull request approved' };
  }

  async completePullRequest(organization: string, project: string, repositoryId: string, pullRequestId: number, deleteSourceBranch?: boolean, mergeStrategy?: string): Promise<unknown> {
    const connection = this.getConnection(organization);
    const gitApi = await connection.getGitApi();

    const pr = await gitApi.getPullRequest(repositoryId, pullRequestId, project);

    const mergeStrategyMap: Record<string, number> = {
      noFastForward: 1,
      squash: 2,
      rebase: 3,
      rebaseMerge: 4,
    };

    const updatedPr = await gitApi.updatePullRequest({
      status: 3,
      lastMergeSourceCommit: pr.lastMergeSourceCommit,
      completionOptions: {
        deleteSourceBranch: deleteSourceBranch || false,
        mergeStrategy: mergeStrategyMap[mergeStrategy || 'noFastForward'],
      },
    }, repositoryId, pullRequestId, project);

    return {
      success: true,
      organization,
      pullRequest: {
        pullRequestId: updatedPr.pullRequestId,
        status: updatedPr.status,
        mergeStatus: updatedPr.mergeStatus,
      },
    };
  }

  async addPRComment(organization: string, project: string, repositoryId: string, pullRequestId: number, content: string, threadContext?: any): Promise<unknown> {
    const connection = this.getConnection(organization);
    const gitApi = await connection.getGitApi();

    const thread: any = {
      comments: [{ content }],
    };
    if (threadContext) {
      thread.threadContext = threadContext;
    }

    const result = await gitApi.createThread(thread, repositoryId, pullRequestId, project);

    return {
      success: true,
      organization,
      thread: {
        id: result.id,
        status: result.status,
      },
    };
  }

  // ============================================================================
  // Work Items
  // ============================================================================

  async getWorkItem(id: number, organization: string, project: string): Promise<unknown> {
    const connection = this.getConnection(organization);
    const witApi = await connection.getWorkItemTrackingApi();
    const workItem = await witApi.getWorkItem(id, undefined, undefined, undefined, project);

    return {
      success: true,
      organization,
      workItem: {
        id: workItem.id,
        rev: workItem.rev,
        fields: workItem.fields,
        url: workItem.url,
      },
    };
  }

  async searchWorkItems(wiql: string, organization: string, project: string, top = 200): Promise<unknown> {
    const connection = this.getConnection(organization);
    const witApi = await connection.getWorkItemTrackingApi();

    const result = await witApi.queryByWiql({ query: wiql }, { project }, false, top);

    return {
      success: true,
      organization,
      queryType: result.queryType,
      count: result.workItems?.length || 0,
      workItems: (result.workItems || []).map(wi => ({ id: wi.id, url: wi.url })),
    };
  }

  async listWorkItems(organization: string, project: string, wiql?: string, top = 50): Promise<unknown> {
    const connection = this.getConnection(organization);
    const witApi = await connection.getWorkItemTrackingApi();

    const query = wiql || `SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType] FROM WorkItems ORDER BY [System.ChangedDate] DESC`;
    const result = await witApi.queryByWiql({ query }, { project }, false, top);

    if (!result.workItems || result.workItems.length === 0) {
      return {
        success: true,
        organization,
        count: 0,
        workItems: [],
      };
    }

    const ids = result.workItems.map(wi => wi.id!);
    const workItems = await witApi.getWorkItems(ids);

    return {
      success: true,
      organization,
      count: workItems?.length || 0,
      workItems: (workItems || []).map(wi => ({
        id: wi.id,
        type: wi.fields?.['System.WorkItemType'],
        title: wi.fields?.['System.Title'],
        state: wi.fields?.['System.State'],
        assignedTo: wi.fields?.['System.AssignedTo']?.displayName,
        createdDate: wi.fields?.['System.CreatedDate'],
        changedDate: wi.fields?.['System.ChangedDate'],
        url: wi.url,
      })),
    };
  }

  async createWorkItem(organization: string, project: string, type: string, title: string, description?: string, assignedTo?: string, areaPath?: string, iterationPath?: string): Promise<unknown> {
    const connection = this.getConnection(organization);
    const witApi = await connection.getWorkItemTrackingApi();

    const document: any[] = [
      { op: 'add', path: '/fields/System.Title', value: title },
    ];
    if (description) document.push({ op: 'add', path: '/fields/System.Description', value: description });
    if (assignedTo) document.push({ op: 'add', path: '/fields/System.AssignedTo', value: assignedTo });
    if (areaPath) document.push({ op: 'add', path: '/fields/System.AreaPath', value: areaPath });
    if (iterationPath) document.push({ op: 'add', path: '/fields/System.IterationPath', value: iterationPath });

    const workItem = await witApi.createWorkItem(null, document, project, type);

    return {
      success: true,
      organization,
      workItem: {
        id: workItem.id,
        url: workItem.url,
        fields: workItem.fields,
      },
    };
  }

  async updateWorkItem(organization: string, workItemId: number, fields: Record<string, unknown>): Promise<unknown> {
    const connection = this.getConnection(organization);
    const witApi = await connection.getWorkItemTrackingApi();

    const document: any[] = Object.entries(fields).map(([field, value]) => ({
      op: 'add',
      path: `/fields/${field}`,
      value,
    }));

    const workItem = await witApi.updateWorkItem(undefined, document, workItemId);

    return {
      success: true,
      organization,
      workItem: {
        id: workItem.id,
        rev: workItem.rev,
        fields: workItem.fields,
        url: workItem.url,
      },
    };
  }

  // ============================================================================
  // Pipelines
  // ============================================================================

  async listPipelines(organization: string, project: string): Promise<unknown> {
    const connection = this.getConnection(organization);
    const pipelinesApi = await connection.getPipelinesApi();
    const pipelines = await pipelinesApi.listPipelines(project);

    return {
      success: true,
      organization,
      count: pipelines?.length || 0,
      pipelines: (pipelines || []).map(p => ({
        id: p.id,
        name: p.name,
        folder: p.folder,
        revision: p.revision,
      })),
    };
  }

  async getPipeline(organization: string, project: string, pipelineId: number): Promise<unknown> {
    const connection = this.getConnection(organization);
    const buildApi = await connection.getBuildApi();
    const definition = await buildApi.getDefinition(project, pipelineId);

    return {
      success: true,
      organization,
      pipeline: {
        id: definition.id,
        name: definition.name,
        path: definition.path,
        type: definition.type,
        queueStatus: definition.queueStatus,
        revision: definition.revision,
        repository: definition.repository ? {
          id: definition.repository.id,
          name: definition.repository.name,
          type: definition.repository.type,
        } : undefined,
        queue: definition.queue ? {
          id: definition.queue.id,
          name: definition.queue.name,
        } : undefined,
        url: definition.url,
      },
    };
  }

  async listPipelineRuns(organization: string, project: string, pipelineId: number, top?: number): Promise<unknown> {
    const connection = this.getConnection(organization);
    const pipelinesApi = await connection.getPipelinesApi();
    const runs = await pipelinesApi.listRuns(project, pipelineId);

    const limitedRuns = top ? runs.slice(0, top) : runs;

    return {
      success: true,
      organization,
      count: limitedRuns?.length || 0,
      runs: (limitedRuns || []).map(r => ({
        id: r.id,
        name: r.name,
        state: r.state,
        result: r.result,
        createdDate: r.createdDate,
        finishedDate: r.finishedDate,
      })),
    };
  }

  async getPipelineRun(organization: string, project: string, pipelineId: number, runId: number): Promise<unknown> {
    const connection = this.getConnection(organization);
    const pipelinesApi = await connection.getPipelinesApi();
    const run = await pipelinesApi.getRun(project, pipelineId, runId);

    return {
      success: true,
      organization,
      run: {
        id: run.id,
        name: run.name,
        state: run.state,
        result: run.result,
        createdDate: run.createdDate,
        finishedDate: run.finishedDate,
        url: run.url,
      },
    };
  }

  async runPipeline(organization: string, project: string, pipelineId: number, branch?: string, variables?: Record<string, string>): Promise<unknown> {
    const connection = this.getConnection(organization);
    const pipelinesApi = await connection.getPipelinesApi();

    const runParameters: any = {};
    if (branch) {
      runParameters.resources = {
        repositories: {
          self: { refName: branch.startsWith('refs/') ? branch : `refs/heads/${branch}` },
        },
      };
    }
    if (variables) {
      runParameters.variables = Object.fromEntries(
        Object.entries(variables).map(([k, v]) => [k, { value: v }])
      );
    }

    const run = await pipelinesApi.runPipeline(runParameters, project, pipelineId);

    return {
      success: true,
      organization,
      run: {
        id: run.id,
        name: run.name,
        state: run.state,
        result: run.result,
        url: run.url,
      },
    };
  }

  async createPipeline(organization: string, project: string, name: string, repositoryId: string, yamlPath: string): Promise<unknown> {
    const connection = this.getConnection(organization);
    const pipelinesApi = await connection.getPipelinesApi();

    const pipeline = await pipelinesApi.createPipeline({
      name,
      configuration: {
        type: 1,
        path: yamlPath,
        repository: {
          id: repositoryId,
          type: 'azureReposGit',
        },
      },
    } as any, project);

    return {
      success: true,
      organization,
      pipeline: {
        id: pipeline.id,
        name: pipeline.name,
      },
    };
  }

  async cancelPipelineRun(organization: string, project: string, buildId: number): Promise<unknown> {
    const connection = this.getConnection(organization);
    const buildApi = await connection.getBuildApi();

    const build = await buildApi.updateBuild({ status: 4 }, project, buildId);

    return {
      success: true,
      organization,
      build: {
        id: build.id,
        status: build.status,
      },
    };
  }

  // ============================================================================
  // Build Logs & Artifacts
  // ============================================================================

  async listBuildLogs(organization: string, project: string, buildId: number): Promise<unknown> {
    const connection = this.getConnection(organization);
    const buildApi = await connection.getBuildApi();
    const logs = await buildApi.getBuildLogs(project, buildId);

    return {
      success: true,
      organization,
      count: logs?.length || 0,
      logs: (logs || []).map(l => ({
        id: l.id,
        type: l.type,
        lineCount: l.lineCount,
        url: l.url,
      })),
    };
  }

  async getBuildLog(organization: string, project: string, buildId: number, logId: number, startLine?: number, endLine?: number): Promise<unknown> {
    const connection = this.getConnection(organization);
    const buildApi = await connection.getBuildApi();
    const logLines = await buildApi.getBuildLogLines(project, buildId, logId, startLine, endLine);

    const lines = Array.isArray(logLines) ? logLines : [];
    const lineCount = lines.length;

    return {
      success: true,
      organization,
      buildId,
      logId,
      startLine: startLine || 1,
      endLine: endLine || lineCount,
      lineCount,
      content: lines.join('\n'),
    };
  }

  async getBuildArtifacts(organization: string, project: string, buildId: number, artifactName?: string): Promise<unknown> {
    const connection = this.getConnection(organization);
    const buildApi = await connection.getBuildApi();

    if (artifactName) {
      const artifact = await buildApi.getArtifact(project, buildId, artifactName);
      return {
        success: true,
        organization,
        artifact: {
          id: artifact.id,
          name: artifact.name,
          resource: artifact.resource,
        },
      };
    } else {
      const artifacts = await buildApi.getArtifacts(project, buildId);
      return {
        success: true,
        organization,
        count: artifacts?.length || 0,
        artifacts: (artifacts || []).map(a => ({
          id: a.id,
          name: a.name,
          resource: a.resource,
        })),
      };
    }
  }

  // ============================================================================
  // Build Tags
  // ============================================================================

  async getBuildTags(organization: string, project: string, buildId: number): Promise<unknown> {
    const connection = this.getConnection(organization);
    const buildApi = await connection.getBuildApi();
    const tags = await buildApi.getBuildTags(project, buildId);

    return {
      success: true,
      organization,
      buildId,
      tags: tags || [],
    };
  }

  async addBuildTag(organization: string, project: string, buildId: number, tag: string): Promise<unknown> {
    const connection = this.getConnection(organization);
    const buildApi = await connection.getBuildApi();
    const tags = await buildApi.addBuildTag(project, buildId, tag);

    return {
      success: true,
      organization,
      buildId,
      tags: tags || [],
    };
  }

  async deleteBuildTag(organization: string, project: string, buildId: number, tag: string): Promise<unknown> {
    const connection = this.getConnection(organization);
    const buildApi = await connection.getBuildApi();
    const tags = await buildApi.deleteBuildTag(project, buildId, tag);

    return {
      success: true,
      organization,
      buildId,
      tags: tags || [],
    };
  }
}
