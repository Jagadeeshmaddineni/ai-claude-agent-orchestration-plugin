import { z } from 'zod';

/**
 * Azure DevOps tool schemas with scope tagging.
 * Scope: 'read' for queries, 'write' for mutations.
 */
export const azureDevOpsSchemas = {
  // ============================================================================
  // Organization
  // ============================================================================
  azuredevops_listOrganizations: {
    scope: 'read' as const,
    description: 'List available Azure DevOps organizations configured for this user. Use this first to discover which organizations are available before calling other Azure DevOps tools.',
    schema: z.object({}),
  },

  // ============================================================================
  // Projects
  // ============================================================================
  azuredevops_listProjects: {
    scope: 'read' as const,
    description: 'List all projects in an Azure DevOps organization. Use azuredevops_listOrganizations first to find available orgs. Returns project names and IDs needed for repository and pipeline operations.',
    schema: z.object({
      organization: z.string().describe('Organization ID'),
      stateFilter: z.enum(['all', 'createPending', 'deleted', 'deleting', 'new', 'unchanged', 'wellFormed']).optional().describe('Filter by project state'),
      top: z.number().optional().describe('Maximum number of projects to return'),
    }),
  },

  // ============================================================================
  // Repositories
  // ============================================================================
  azuredevops_listRepositories: {
    scope: 'read' as const,
    description: 'List all Git repositories in an Azure DevOps project. Returns repo names and IDs needed for branch, PR, and pipeline operations. Use azuredevops_listProjects to find project names first.',
    schema: z.object({
      organization: z.string().describe('Organization ID'),
      project: z.string().describe('Project name or ID'),
    }),
  },
  azuredevops_getRepository: {
    scope: 'read' as const,
    description: 'Get detailed information about a Git repository including default branch, size, and URL. Use azuredevops_listRepositories to find repo names first.',
    schema: z.object({
      organization: z.string().describe('Organization ID'),
      project: z.string().describe('Project name or ID'),
      repositoryId: z.string().describe('Repository name or ID'),
    }),
  },
  azuredevops_listBranches: {
    scope: 'read' as const,
    description: 'List all Git branches in a repository. Returns branch names, commit info, and ahead/behind counts. Use for finding branches to create PRs from.',
    schema: z.object({
      organization: z.string().describe('Organization ID'),
      project: z.string().describe('Project name or ID'),
      repositoryId: z.string().describe('Repository name or ID'),
    }),
  },
  azuredevops_listCommits: {
    scope: 'read' as const,
    description: 'Get Git commit history for a repository or branch. Returns commit messages, authors, dates, and changed files. Useful for reviewing recent changes.',
    schema: z.object({
      organization: z.string().describe('Organization ID'),
      project: z.string().describe('Project name or ID'),
      repositoryId: z.string().describe('Repository name or ID'),
      branch: z.string().optional().describe('Branch name to filter commits'),
      top: z.number().optional().describe('Maximum number of commits'),
    }),
  },
  azuredevops_createRepository: {
    scope: 'write' as const,
    description: 'Create a new Git repository in an Azure DevOps project. Returns the new repo URL and clone URLs (HTTPS/SSH).',
    schema: z.object({
      organization: z.string().describe('Organization ID'),
      project: z.string().describe('Project name or ID'),
      name: z.string().describe('Repository name'),
    }),
  },
  azuredevops_createBranch: {
    scope: 'write' as const,
    description: 'Create a new Git branch in a repository. Specify source branch to branch from. Use before creating a PR for new changes.',
    schema: z.object({
      organization: z.string().describe('Organization ID'),
      project: z.string().describe('Project name or ID'),
      repositoryId: z.string().describe('Repository name or ID'),
      branchName: z.string().describe('New branch name'),
      sourceBranch: z.string().describe('Source branch to create from'),
    }),
  },

  // ============================================================================
  // Pull Requests
  // ============================================================================
  azuredevops_listPullRequests: {
    scope: 'read' as const,
    description: 'List pull requests (PRs) in a repository. Filter by status (active, completed, abandoned), creator, or reviewer. Returns PR IDs, titles, and reviewers.',
    schema: z.object({
      organization: z.string().describe('Organization ID'),
      project: z.string().describe('Project name or ID'),
      repositoryId: z.string().describe('Repository name or ID'),
      status: z.enum(['active', 'abandoned', 'completed', 'all']).optional(),
    }),
  },
  azuredevops_getPullRequestFiles: {
    scope: 'read' as const,
    description: 'Get files changed in a pull request. Returns list of modified, added, and deleted files with their paths. Useful for reviewing PR scope.',
    schema: z.object({
      organization: z.string().describe('Organization ID'),
      project: z.string().describe('Project name or ID'),
      repositoryId: z.string().describe('Repository name or ID'),
      pullRequestId: z.number().describe('Pull request ID'),
    }),
  },
  azuredevops_getPRComments: {
    scope: 'read' as const,
    description: 'Get all comments and review threads on a pull request. Returns comment text, authors, and whether threads are resolved.',
    schema: z.object({
      organization: z.string().describe('Organization ID'),
      project: z.string().describe('Project name or ID'),
      repositoryId: z.string().describe('Repository name or ID'),
      pullRequestId: z.number().describe('Pull request ID'),
    }),
  },
  azuredevops_createPullRequest: {
    scope: 'write' as const,
    description: 'Create a new pull request (PR) to merge changes from source branch to target branch. Specify title, description, and optionally reviewers.',
    schema: z.object({
      organization: z.string().describe('Organization ID'),
      project: z.string().describe('Project name or ID'),
      repositoryId: z.string().describe('Repository name or ID'),
      sourceRefName: z.string().describe('Source branch (e.g., "feature/xyz" or "refs/heads/feature/xyz")'),
      targetRefName: z.string().describe('Target branch (e.g., "main" or "refs/heads/main")'),
      title: z.string().describe('Pull request title'),
      description: z.string().optional().describe('Pull request description'),
    }),
  },
  azuredevops_updatePullRequest: {
    scope: 'write' as const,
    description: 'Update a pull request title, description, or status. Cannot change source branch after PR creation.',
    schema: z.object({
      organization: z.string().describe('Organization ID'),
      project: z.string().describe('Project name or ID'),
      repositoryId: z.string().describe('Repository name or ID'),
      pullRequestId: z.number().describe('Pull request ID'),
      title: z.string().optional().describe('New title'),
      description: z.string().optional().describe('New description'),
      status: z.enum(['active', 'abandoned']).optional().describe('New status'),
    }),
  },
  azuredevops_approvePullRequest: {
    scope: 'write' as const,
    description: 'Approve a pull request. Sets your vote to "Approved". Use azuredevops_listPullRequests to find PR IDs.',
    schema: z.object({
      organization: z.string().describe('Organization ID'),
      project: z.string().describe('Project name or ID'),
      repositoryId: z.string().describe('Repository name or ID'),
      pullRequestId: z.number().describe('Pull request ID'),
    }),
  },
  azuredevops_completePullRequest: {
    scope: 'write' as const,
    description: 'Complete (merge) a pull request. Choose merge strategy (squash, rebase, merge). Optionally delete source branch and bypass policies if permitted.',
    schema: z.object({
      organization: z.string().describe('Organization ID'),
      project: z.string().describe('Project name or ID'),
      repositoryId: z.string().describe('Repository name or ID'),
      pullRequestId: z.number().describe('Pull request ID'),
      deleteSourceBranch: z.boolean().optional().describe('Delete source branch after merge'),
      mergeStrategy: z.enum(['noFastForward', 'squash', 'rebase', 'rebaseMerge']).optional(),
    }),
  },
  azuredevops_addPRComment: {
    scope: 'write' as const,
    description: 'Add a comment to a pull request for discussion or feedback. Comments are visible to all PR participants.',
    schema: z.object({
      organization: z.string().describe('Organization ID'),
      project: z.string().describe('Project name or ID'),
      repositoryId: z.string().describe('Repository name or ID'),
      pullRequestId: z.number().describe('Pull request ID'),
      content: z.string().describe('Comment content'),
      threadContext: z.object({
        filePath: z.string().optional(),
        rightFileStart: z.object({ line: z.number(), offset: z.number() }).optional(),
        rightFileEnd: z.object({ line: z.number(), offset: z.number() }).optional(),
      }).optional().describe('Optional file context for inline comments'),
    }),
  },

  // ============================================================================
  // Work Items
  // ============================================================================
  azuredevops_getWorkItem: {
    scope: 'read' as const,
    description: 'Get full details of a work item (bug, task, story) by ID. Returns all fields including description, acceptance criteria, and history.',
    schema: z.object({
      id: z.number().describe('Work item ID'),
      organization: z.string().describe('Organization ID'),
      project: z.string().describe('Project name or ID'),
    }),
  },
  azuredevops_searchWorkItems: {
    scope: 'read' as const,
    description: 'Search Azure Boards work items (bugs, tasks, user stories, features, epics) using WIQL queries. Filter by state, assignee, iteration, or any field.',
    schema: z.object({
      wiql: z.string().describe('WIQL query'),
      organization: z.string().describe('Organization ID'),
      project: z.string().describe('Project name or ID'),
      top: z.number().optional().describe('Maximum results'),
    }),
  },
  azuredevops_listWorkItems: {
    scope: 'read' as const,
    description: 'List Azure Boards work items with optional WIQL query. Returns work item details including type, title, state, and assignee.',
    schema: z.object({
      organization: z.string().describe('Organization ID'),
      project: z.string().describe('Project name or ID'),
      wiql: z.string().optional().describe('WIQL query (optional, uses default if not provided)'),
      top: z.number().optional().describe('Maximum number of items'),
    }),
  },
  azuredevops_createWorkItem: {
    scope: 'write' as const,
    description: 'Create a new Azure Boards work item (Bug, Task, User Story, Feature, Epic). Specify type, title, description, and optionally assignee, tags, and custom fields.',
    schema: z.object({
      organization: z.string().describe('Organization ID'),
      project: z.string().describe('Project name or ID'),
      type: z.string().describe('Work item type (e.g., "Task", "Bug", "User Story")'),
      title: z.string().describe('Title'),
      description: z.string().optional().describe('Description'),
      assignedTo: z.string().optional().describe('Assignee email or name'),
      areaPath: z.string().optional().describe('Area path'),
      iterationPath: z.string().optional().describe('Iteration path'),
    }),
  },
  azuredevops_updateWorkItem: {
    scope: 'write' as const,
    description: 'Update fields on an Azure Boards work item. Change state, assignee, description, tags, or any editable field. Only specified fields are modified.',
    schema: z.object({
      organization: z.string().describe('Organization ID'),
      workItemId: z.number().describe('Work item ID'),
      fields: z.record(z.unknown()).describe('Fields to update (e.g., {"System.State": "Active"})'),
    }),
  },

  // ============================================================================
  // Pipelines
  // ============================================================================
  azuredevops_listPipelines: {
    scope: 'read' as const,
    description: 'List all CI/CD pipelines (build and release) in a project. Returns pipeline names and IDs needed for triggering runs.',
    schema: z.object({
      organization: z.string().describe('Organization ID'),
      project: z.string().describe('Project name or ID'),
    }),
  },
  azuredevops_getPipeline: {
    scope: 'read' as const,
    description: 'Get pipeline configuration details including YAML path, default branch, and triggers. Use for understanding pipeline setup.',
    schema: z.object({
      organization: z.string().describe('Organization ID'),
      project: z.string().describe('Project name or ID'),
      pipelineId: z.number().describe('Pipeline/definition ID'),
    }),
  },
  azuredevops_listPipelineRuns: {
    scope: 'read' as const,
    description: 'Get pipeline run history (build history). Returns recent runs with status (succeeded, failed, running), duration, and commit info.',
    schema: z.object({
      organization: z.string().describe('Organization ID'),
      project: z.string().describe('Project name or ID'),
      pipelineId: z.number().describe('Pipeline ID'),
      top: z.number().optional().describe('Maximum results'),
    }),
  },
  azuredevops_getPipelineRun: {
    scope: 'read' as const,
    description: 'Get details of a specific pipeline run including status, stages, jobs, and timing. Use for monitoring build progress or investigating failures.',
    schema: z.object({
      organization: z.string().describe('Organization ID'),
      project: z.string().describe('Project name or ID'),
      pipelineId: z.number().describe('Pipeline ID'),
      runId: z.number().describe('Run ID'),
    }),
  },
  azuredevops_runPipeline: {
    scope: 'write' as const,
    description: 'Trigger a CI/CD pipeline run. Optionally specify branch and pipeline variables. Use azuredevops_listPipelines to find pipeline IDs.',
    schema: z.object({
      organization: z.string().describe('Organization ID'),
      project: z.string().describe('Project name or ID'),
      pipelineId: z.number().describe('Pipeline ID'),
      branch: z.string().optional().describe('Branch to run pipeline on'),
      variables: z.record(z.string()).optional().describe('Pipeline variables'),
    }),
  },
  azuredevops_createPipeline: {
    scope: 'write' as const,
    description: 'Create a new CI/CD pipeline from a YAML file in your repository. Specify the YAML file path and pipeline name.',
    schema: z.object({
      organization: z.string().describe('Organization ID'),
      project: z.string().describe('Project name or ID'),
      name: z.string().describe('Pipeline name'),
      repositoryId: z.string().describe('Repository ID'),
      yamlPath: z.string().describe('Path to YAML file in repo'),
    }),
  },
  azuredevops_cancelPipelineRun: {
    scope: 'write' as const,
    description: 'Cancel an in-progress pipeline run. Use when a build is no longer needed or stuck. Only works on running builds.',
    schema: z.object({
      organization: z.string().describe('Organization ID'),
      project: z.string().describe('Project name or ID'),
      buildId: z.number().describe('Build ID to cancel'),
    }),
  },

  // ============================================================================
  // Build Logs & Artifacts
  // ============================================================================
  azuredevops_listBuildLogs: {
    scope: 'read' as const,
    description: 'List all available logs for a build. Returns metadata only (id, type, lineCount, url). Use azuredevops_getBuildLog to fetch content of a specific log.',
    schema: z.object({
      organization: z.string().describe('Organization ID'),
      project: z.string().describe('Project name or ID'),
      buildId: z.number().describe('Build ID'),
    }),
  },
  azuredevops_getBuildLog: {
    scope: 'read' as const,
    description: 'Get the content of a specific build log by ID. Use azuredevops_listBuildLogs first to see available logs and their lineCount. If lineCount is large (>500 lines), use startLine/endLine parameters to paginate and avoid overwhelming context.',
    schema: z.object({
      organization: z.string().describe('Organization ID'),
      project: z.string().describe('Project name or ID'),
      buildId: z.number().describe('Build ID'),
      logId: z.number().describe('Log ID'),
      startLine: z.number().optional().describe('Start line for pagination'),
      endLine: z.number().optional().describe('End line for pagination'),
    }),
  },
  azuredevops_getBuildArtifacts: {
    scope: 'read' as const,
    description: 'Get build artifacts (compiled binaries, packages, test results). Returns artifact metadata and download links. Optionally specify a specific artifact name.',
    schema: z.object({
      organization: z.string().describe('Organization ID'),
      project: z.string().describe('Project name or ID'),
      buildId: z.number().describe('Build ID'),
      artifactName: z.string().optional().describe('Specific artifact name (lists all if not provided)'),
    }),
  },

  // ============================================================================
  // Build Tags
  // ============================================================================
  azuredevops_getBuildTags: {
    scope: 'read' as const,
    description: 'Get all tags attached to a pipeline build. Use to check build categorization or filter builds by tag.',
    schema: z.object({
      organization: z.string().describe('Organization ID'),
      project: z.string().describe('Project name or ID'),
      buildId: z.number().describe('Build ID'),
    }),
  },
  azuredevops_addBuildTag: {
    scope: 'write' as const,
    description: 'Add a tag to a pipeline build for categorization (e.g., "release", "hotfix", "deploy-ready"). Tags help organize and filter builds.',
    schema: z.object({
      organization: z.string().describe('Organization ID'),
      project: z.string().describe('Project name or ID'),
      buildId: z.number().describe('Build ID'),
      tag: z.string().describe('Tag to add'),
    }),
  },
  azuredevops_deleteBuildTag: {
    scope: 'write' as const,
    description: 'Remove a tag from a pipeline build. Use when a tag was added in error or is no longer applicable.',
    schema: z.object({
      organization: z.string().describe('Organization ID'),
      project: z.string().describe('Project name or ID'),
      buildId: z.number().describe('Build ID'),
      tag: z.string().describe('Tag to delete'),
    }),
  },
} as const;

/**
 * Type for Azure DevOps tool names.
 */
export type AzureDevOpsToolName = keyof typeof azureDevOpsSchemas;

/**
 * Get the Zod schema for a specific tool.
 */
export function getAzureDevOpsSchema(toolName: AzureDevOpsToolName) {
  return azureDevOpsSchemas[toolName].schema;
}
