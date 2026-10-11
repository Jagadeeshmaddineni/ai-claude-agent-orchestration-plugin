import { IToolService, ToolDefinition, ToolScope, toolNotFoundError } from '../../shared';
import { AzureDevOpsClient, AzureDevOpsConfig } from './client';
import { azureDevOpsSchemas, AzureDevOpsToolName } from './schemas';
import { getAzureDevOpsToolsByScope } from './tools';

/**
 * Azure DevOps tool service implementing IToolService interface.
 */
export class AzureDevOpsService implements IToolService {
  readonly serviceName = 'azuredevops';

  private readonly client: AzureDevOpsClient;
  private readonly scope: ToolScope;

  constructor(config: AzureDevOpsConfig) {
    this.client = new AzureDevOpsClient(config);
    this.scope = config.scope || 'write';
  }

  isConfigured(): boolean {
    return this.client.isConfigured();
  }

  getTools(): ToolDefinition[] {
    return getAzureDevOpsToolsByScope(this.scope);
  }

  async executeTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    // Validate tool exists
    if (!(toolName in azureDevOpsSchemas)) {
      throw toolNotFoundError(this.serviceName, toolName);
    }

    // Parse and validate args
    const schema = azureDevOpsSchemas[toolName as AzureDevOpsToolName].schema;
    const parsed = schema.parse(args);

    // Execute tool
    switch (toolName) {
      // Organization
      case 'azuredevops_listOrganizations':
        return this.client.listOrganizations();

      // Projects
      case 'azuredevops_listProjects':
        return this.client.listProjects(parsed.organization, parsed.stateFilter, parsed.top);

      // Repositories
      case 'azuredevops_listRepositories':
        return this.client.listRepositories(parsed.organization, parsed.project);

      case 'azuredevops_getRepository':
        return this.client.getRepository(parsed.organization, parsed.project, parsed.repositoryId);

      case 'azuredevops_listBranches':
        return this.client.listBranches(parsed.organization, parsed.project, parsed.repositoryId);

      case 'azuredevops_listCommits':
        return this.client.listCommits(parsed.organization, parsed.project, parsed.repositoryId, parsed.branch, parsed.top);

      case 'azuredevops_createRepository':
        return this.client.createRepository(parsed.organization, parsed.project, parsed.name);

      case 'azuredevops_createBranch':
        return this.client.createBranch(parsed.organization, parsed.project, parsed.repositoryId, parsed.branchName, parsed.sourceBranch);

      // Pull Requests
      case 'azuredevops_listPullRequests':
        return this.client.listPullRequests(parsed.organization, parsed.project, parsed.repositoryId, parsed.status);

      case 'azuredevops_getPullRequestFiles':
        return this.client.getPullRequestFiles(parsed.organization, parsed.project, parsed.repositoryId, parsed.pullRequestId);

      case 'azuredevops_getPRComments':
        return this.client.getPRComments(parsed.organization, parsed.project, parsed.repositoryId, parsed.pullRequestId);

      case 'azuredevops_createPullRequest':
        return this.client.createPullRequest(
          parsed.organization,
          parsed.project,
          parsed.repositoryId,
          parsed.sourceRefName,
          parsed.targetRefName,
          parsed.title,
          parsed.description
        );

      case 'azuredevops_updatePullRequest':
        return this.client.updatePullRequest(
          parsed.organization,
          parsed.project,
          parsed.repositoryId,
          parsed.pullRequestId,
          parsed.title,
          parsed.description,
          parsed.status
        );

      case 'azuredevops_approvePullRequest':
        return this.client.approvePullRequest(parsed.organization, parsed.project, parsed.repositoryId, parsed.pullRequestId);

      case 'azuredevops_completePullRequest':
        return this.client.completePullRequest(
          parsed.organization,
          parsed.project,
          parsed.repositoryId,
          parsed.pullRequestId,
          parsed.deleteSourceBranch,
          parsed.mergeStrategy
        );

      case 'azuredevops_addPRComment':
        return this.client.addPRComment(
          parsed.organization,
          parsed.project,
          parsed.repositoryId,
          parsed.pullRequestId,
          parsed.content,
          parsed.threadContext
        );

      // Work Items
      case 'azuredevops_getWorkItem':
        return this.client.getWorkItem(parsed.id, parsed.organization, parsed.project);

      case 'azuredevops_searchWorkItems':
        return this.client.searchWorkItems(parsed.wiql, parsed.organization, parsed.project, parsed.top);

      case 'azuredevops_listWorkItems':
        return this.client.listWorkItems(parsed.organization, parsed.project, parsed.wiql, parsed.top);

      case 'azuredevops_createWorkItem':
        return this.client.createWorkItem(
          parsed.organization,
          parsed.project,
          parsed.type,
          parsed.title,
          parsed.description,
          parsed.assignedTo,
          parsed.areaPath,
          parsed.iterationPath
        );

      case 'azuredevops_updateWorkItem':
        return this.client.updateWorkItem(parsed.organization, parsed.workItemId, parsed.fields);

      // Pipelines
      case 'azuredevops_listPipelines':
        return this.client.listPipelines(parsed.organization, parsed.project);

      case 'azuredevops_getPipeline':
        return this.client.getPipeline(parsed.organization, parsed.project, parsed.pipelineId);

      case 'azuredevops_listPipelineRuns':
        return this.client.listPipelineRuns(parsed.organization, parsed.project, parsed.pipelineId, parsed.top);

      case 'azuredevops_getPipelineRun':
        return this.client.getPipelineRun(parsed.organization, parsed.project, parsed.pipelineId, parsed.runId);

      case 'azuredevops_runPipeline':
        return this.client.runPipeline(parsed.organization, parsed.project, parsed.pipelineId, parsed.branch, parsed.variables);

      case 'azuredevops_createPipeline':
        return this.client.createPipeline(parsed.organization, parsed.project, parsed.name, parsed.repositoryId, parsed.yamlPath);

      case 'azuredevops_cancelPipelineRun':
        return this.client.cancelPipelineRun(parsed.organization, parsed.project, parsed.buildId);

      // Build Logs & Artifacts
      case 'azuredevops_listBuildLogs':
        return this.client.listBuildLogs(parsed.organization, parsed.project, parsed.buildId);

      case 'azuredevops_getBuildLog':
        return this.client.getBuildLog(
          parsed.organization,
          parsed.project,
          parsed.buildId,
          parsed.logId,
          parsed.startLine,
          parsed.endLine
        );

      case 'azuredevops_getBuildArtifacts':
        return this.client.getBuildArtifacts(parsed.organization, parsed.project, parsed.buildId, parsed.artifactName);

      // Build Tags
      case 'azuredevops_getBuildTags':
        return this.client.getBuildTags(parsed.organization, parsed.project, parsed.buildId);

      case 'azuredevops_addBuildTag':
        return this.client.addBuildTag(parsed.organization, parsed.project, parsed.buildId, parsed.tag);

      case 'azuredevops_deleteBuildTag':
        return this.client.deleteBuildTag(parsed.organization, parsed.project, parsed.buildId, parsed.tag);

      default:
        throw toolNotFoundError(this.serviceName, toolName);
    }
  }
}
