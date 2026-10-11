import { z } from 'zod';

/**
 * SonarQube tool schemas with scope tagging.
 * Includes both read and write tools (scope-filtered at runtime).
 */
export const sonarqubeSchemas = {
  // ============================================================================
  // Projects
  // ============================================================================
  sonarqube_searchProjects: {
    scope: 'read' as const,
    description: 'Search for SonarQube projects by name or key. Use this first when projectKey is unknown - most other tools require the project key from this response. Supports pagination for large result sets.',
    schema: z.object({
      query: z.string().optional().describe('Search query to filter projects by name (partial match) or key (exact match)'),
      page: z.number().optional().describe('Page number (defaults to 1)'),
      pageSize: z.number().optional().describe('Page size, max 500 (defaults to 100)'),
    }),
  },

  // ============================================================================
  // Quality Gates
  // ============================================================================
  sonarqube_getQualityGateStatus: {
    scope: 'read' as const,
    description: 'Get the Quality Gate status for a SonarQube project. Shows whether the project passes or fails quality checks, with details on each condition (code coverage, bugs, vulnerabilities, etc.). Use sonarqube_searchProjects first to find the projectKey.',
    schema: z.object({
      projectKey: z.string().describe('The project key (e.g., "my_project"). Required unless analysisId is provided.').optional(),
      analysisId: z.string().optional().describe('Specific analysis ID to check (e.g., "AU-TpxcA-iU5OvuD2FL1")'),
      branch: z.string().optional().describe('Branch name to check (defaults to main branch)'),
      pullRequest: z.string().optional().describe('Pull request ID to check (e.g., "5461")'),
    }),
  },

  sonarqube_listQualityGates: {
    scope: 'read' as const,
    description: 'List all Quality Gates defined in SonarQube with their conditions. Useful to understand available quality gates before checking project status.',
    schema: z.object({}),
  },

  // ============================================================================
  // Issues
  // ============================================================================
  sonarqube_searchIssues: {
    scope: 'read' as const,
    description: 'Search for issues (bugs, vulnerabilities, code smells) in SonarQube projects. For PR reviews, use the pullRequest parameter to get only issues in that PR. Use inNewCodePeriod=true to find only NEW issues (not historical). Use sonarqube_searchProjects first to find project keys.',
    schema: z.object({
      projects: z.array(z.string()).optional().describe('Project keys to filter'),
      branch: z.string().optional().describe('Branch name to filter issues (mutually exclusive with pullRequest)'),
      pullRequest: z.string().optional().describe('Pull request ID/key to filter issues - use this for PR reviews to see only issues in the PR'),
      files: z.array(z.string()).optional().describe('Relative file paths to filter'),
      severities: z.array(z.enum(['INFO', 'MINOR', 'MAJOR', 'CRITICAL', 'BLOCKER'])).optional().describe('Issue severities'),
      statuses: z.array(z.enum(['OPEN', 'CONFIRMED', 'REOPENED', 'RESOLVED', 'CLOSED'])).optional().describe('Issue statuses'),
      types: z.array(z.enum(['CODE_SMELL', 'BUG', 'VULNERABILITY'])).optional().describe('Issue types'),
      tags: z.array(z.string()).optional().describe('Issue tags'),
      resolutions: z.array(z.enum(['FALSE-POSITIVE', 'WONTFIX', 'FIXED', 'REMOVED'])).optional().describe('Issue resolutions'),
      assignees: z.array(z.string()).optional().describe('User logins of assignees'),
      languages: z.array(z.string()).optional().describe('Language keys (e.g., java, js, py)'),
      rules: z.array(z.string()).optional().describe('Rule keys (e.g., java:S1234)'),
      createdAfter: z.string().optional().describe('Only issues created after this date (format: 2024-01-15 or 2024-01-15T13:00:00+0200)'),
      createdBefore: z.string().optional().describe('Only issues created before this date (format: 2024-01-15)'),
      createdInLast: z.string().optional().describe('Only issues created in the last X time (e.g., "1m" for 1 month, "2w" for 2 weeks, "5d" for 5 days)'),
      inNewCodePeriod: z.boolean().optional().describe('If true, only return issues in the new code period. NOTE: Requires exactly ONE project in the projects array.'),
      pageSize: z.number().optional().describe('Page size, max 500 (defaults to 100)'),
      pageIndex: z.number().optional().describe('Page number, 1-based (defaults to 1)'),
    }),
  },

  // ============================================================================
  // Security Hotspots
  // ============================================================================
  sonarqube_searchSecurityHotspots: {
    scope: 'read' as const,
    description: 'Search for security hotspots in a SonarQube project. For PR reviews, use the pullRequest parameter to get only hotspots in that PR. Use sinceLeakPeriod=true for only NEW hotspots.',
    schema: z.object({
      projectKey: z.string().describe('The project key (required)'),
      branch: z.string().optional().describe('Branch name to filter hotspots (mutually exclusive with pullRequest)'),
      pullRequest: z.string().optional().describe('Pull request ID/key to filter hotspots - use this for PR reviews'),
      files: z.array(z.string()).optional().describe('Relative file paths to filter'),
      hotspots: z.array(z.string()).optional().describe('Specific hotspot keys to retrieve'),
      status: z.enum(['TO_REVIEW', 'REVIEWED']).optional().describe('Hotspot status filter'),
      resolution: z.enum(['FIXED', 'SAFE', 'ACKNOWLEDGED']).optional().describe('Resolution filter (only for REVIEWED status)'),
      sinceLeakPeriod: z.boolean().optional().describe('Only show hotspots created since the leak period (new hotspots)'),
      inNewCodePeriod: z.boolean().optional().describe('Only show hotspots in the new code period'),
      onlyMine: z.boolean().optional().describe('If true, only show hotspots assigned to the current user'),
      pageSize: z.number().optional().describe('Page size, max 500 (defaults to 100)'),
      pageIndex: z.number().optional().describe('Page number, 1-based (defaults to 1)'),
    }),
  },

  sonarqube_showSecurityHotspot: {
    scope: 'read' as const,
    description: 'Get detailed information about a specific security hotspot including its location, rule, and review history. Use sonarqube_searchSecurityHotspots first to find hotspot keys.',
    schema: z.object({
      hotspot: z.string().describe('The hotspot key (required)'),
    }),
  },

  // ============================================================================
  // Rules
  // ============================================================================
  sonarqube_showRule: {
    scope: 'read' as const,
    description: 'Get detailed information about a SonarQube rule including its description, severity, and impacts. Rule keys are typically found in issue details (e.g., java:S1234, javascript:EmptyBlock).',
    schema: z.object({
      key: z.string().describe('The rule key (e.g., "javascript:EmptyBlock", "java:S1234")'),
    }),
  },

  // ============================================================================
  // Measures
  // ============================================================================
  sonarqube_getComponentMeasures: {
    scope: 'read' as const,
    description: 'Get measures (metrics) for a SonarQube project or component. Common metrics include ncloc (lines of code), complexity, violations, coverage, duplicated_lines_density, and more.',
    schema: z.object({
      projectKey: z.string().optional().describe('The project/component key'),
      metricKeys: z.array(z.string()).optional().describe('Metric keys to retrieve (e.g., ["ncloc", "complexity", "coverage", "violations"])'),
      branch: z.string().optional().describe('Branch name for branch-specific measures (mutually exclusive with pullRequest)'),
      pullRequest: z.string().optional().describe('Pull request identifier for PR-specific measures'),
    }),
  },

  sonarqube_searchFilesByCoverage: {
    scope: 'read' as const,
    description: 'Search for files in a project sorted by code coverage (worst coverage first). Useful for identifying files that need test coverage improvements.',
    schema: z.object({
      projectKey: z.string().describe('The project key (required)'),
      branch: z.string().optional().describe('Branch name for branch-specific coverage (mutually exclusive with pullRequest)'),
      pullRequest: z.string().optional().describe('Pull request identifier for PR-specific coverage'),
      maxCoverage: z.number().optional().describe('Only return files with coverage below this threshold (0-100)'),
      pageIndex: z.number().optional().describe('Page number, 1-based (defaults to 1)'),
      pageSize: z.number().optional().describe('Page size, max 500 (defaults to 100)'),
    }),
  },

  // ============================================================================
  // Sources
  // ============================================================================
  sonarqube_getRawSource: {
    scope: 'read' as const,
    description: 'Get source code as raw text for a file. Requires "See Source Code" permission on the file. Use to view the actual code content of files identified in issues or coverage reports.',
    schema: z.object({
      key: z.string().describe('File key (e.g., "my_project:src/foo/Bar.java")'),
      branch: z.string().optional().describe('Branch name for branch-specific source (mutually exclusive with pullRequest)'),
      pullRequest: z.string().optional().describe('Pull request identifier'),
    }),
  },

  sonarqube_getScmInfo: {
    scope: 'read' as const,
    description: 'Get SCM (source control) information for a file including author and commit details per line. Useful for identifying who wrote problematic code. Requires "See Source Code" permission.',
    schema: z.object({
      key: z.string().describe('File key (e.g., "my_project:src/foo/Bar.java")'),
      commitsByLine: z.boolean().optional().describe('If true, show commits for each line; if false, group lines by commit'),
      from: z.number().optional().describe('First line to return (starts at 1)'),
      to: z.number().optional().describe('Last line to return (inclusive)'),
    }),
  },

  sonarqube_getFileCoverageDetails: {
    scope: 'read' as const,
    description: 'Get complete line-by-line coverage information for a file, including which exact lines are uncovered and which have partially covered branches. Use after identifying files with low coverage via sonarqube_searchFilesByCoverage.',
    schema: z.object({
      key: z.string().describe('File key (e.g., "my_project:src/foo/Bar.java")'),
      branch: z.string().optional().describe('Branch name for branch-specific coverage (mutually exclusive with pullRequest)'),
      pullRequest: z.string().optional().describe('Pull request identifier'),
      from: z.number().optional().describe('First line to return (starts at 1)'),
      to: z.number().optional().describe('Last line to return (inclusive)'),
    }),
  },

  // ============================================================================
  // Duplications
  // ============================================================================
  sonarqube_getDuplications: {
    scope: 'read' as const,
    description: 'Get code duplication details for a specific file. Shows which blocks of code are duplicated and where the duplicates exist. Requires Browse permission on the project.',
    schema: z.object({
      key: z.string().describe('File key (e.g., "my_project:src/foo/Bar.java")'),
      branch: z.string().optional().describe('Branch name for branch-specific duplications (mutually exclusive with pullRequest)'),
      pullRequest: z.string().optional().describe('Pull request identifier'),
    }),
  },

  sonarqube_searchDuplicatedFiles: {
    scope: 'read' as const,
    description: 'Search for files with code duplications in a project. By default fetches all duplicated files (up to 10,000). Use to identify files that need refactoring to reduce duplication.',
    schema: z.object({
      projectKey: z.string().describe('The project key (required)'),
      branch: z.string().optional().describe('Branch name for branch-specific duplications (mutually exclusive with pullRequest)'),
      pullRequest: z.string().optional().describe('Pull request identifier'),
      pageSize: z.number().optional().describe('Page size for manual pagination, max 500. If not specified, auto-fetches all.'),
      pageIndex: z.number().optional().describe('Page number for manual pagination (starts at 1). If not specified, auto-fetches all.'),
    }),
  },

  // ============================================================================
  // Pull Requests
  // ============================================================================
  sonarqube_listPullRequests: {
    scope: 'read' as const,
    description: 'List all pull requests for a project. Returns PR keys/IDs and source branches which can be used with other tools that accept a pullRequest parameter.',
    schema: z.object({
      projectKey: z.string().describe('The project key (required)'),
    }),
  },

  // ============================================================================
  // Languages
  // ============================================================================
  sonarqube_listLanguages: {
    scope: 'read' as const,
    description: 'List all programming languages supported by this SonarQube instance. Useful to understand which languages can be analyzed.',
    schema: z.object({
      query: z.string().optional().describe('Optional pattern to match language keys/names against'),
    }),
  },

  // ============================================================================
  // Metrics
  // ============================================================================
  sonarqube_searchMetrics: {
    scope: 'read' as const,
    description: 'Search for available metrics in SonarQube. Returns metric keys, names, descriptions, and types. Useful to discover which metrics can be used with sonarqube_getComponentMeasures.',
    schema: z.object({
      page: z.number().optional().describe('Page number, 1-based (defaults to 1)'),
      pageSize: z.number().optional().describe('Page size, max 500 (defaults to 100)'),
    }),
  },

  // ============================================================================
  // System
  // ============================================================================
  sonarqube_getSystemHealth: {
    scope: 'read' as const,
    description: 'Get the health status of the SonarQube Server instance. Returns GREEN (fully operational), YELLOW (usable but needs attention), or RED (not operational). Useful for monitoring.',
    schema: z.object({}),
  },

  sonarqube_getSystemStatus: {
    scope: 'read' as const,
    description: 'Get state information about the SonarQube Server. Returns status (STARTING, UP, DOWN, RESTARTING, DB_MIGRATION_NEEDED, DB_MIGRATION_RUNNING), version, and server ID.',
    schema: z.object({}),
  },

  sonarqube_systemPing: {
    scope: 'read' as const,
    description: 'Ping the SonarQube Server to check if it is alive and responding. Returns "pong" if the server is reachable. This is a simple health check endpoint.',
    schema: z.object({}),
  },

  sonarqube_getSystemInfo: {
    scope: 'read' as const,
    description: 'Get detailed system information about the SonarQube Server including JVM state, database, search indexes, plugins, and settings. Requires "Administer" permission.',
    schema: z.object({}),
  },

  sonarqube_getSystemLogs: {
    scope: 'read' as const,
    description: 'Get SonarQube Server system logs. Available log types: app (application), ce (compute engine), es (elasticsearch), web, access, deprecation. Requires system administration permission.',
    schema: z.object({
      name: z.enum(['app', 'ce', 'es', 'web', 'access', 'deprecation']).optional().describe('Name of the logs to get. Default: app'),
    }),
  },

  // ============================================================================
  // Webhooks
  // ============================================================================
  sonarqube_listWebhooks: {
    scope: 'read' as const,
    description: 'List all webhooks configured for a SonarQube project or instance. Requires "Administer" permission on the specified project, or global "Administer" permission.',
    schema: z.object({
      projectKey: z.string().optional().describe('Optional project key to list project-specific webhooks'),
    }),
  },

  // ============================================================================
  // Portfolios (Views)
  // ============================================================================
  sonarqube_listPortfolios: {
    scope: 'read' as const,
    description: 'List portfolios available in SonarQube Server. Portfolios are collections of projects that provide an aggregated view of their metrics.',
    schema: z.object({
      query: z.string().optional().describe('Search query to filter portfolios by name or key'),
      favorite: z.boolean().optional().describe('If true, only returns favorite portfolios'),
      pageIndex: z.number().optional().describe('1-based page number (default: 1)'),
      pageSize: z.number().optional().describe('Page size, max 500 (default: 100)'),
    }),
  },

  // ============================================================================
  // WRITE TOOLS
  // ============================================================================

  // Issues - Write
  sonarqube_changeIssueStatus: {
    scope: 'write' as const,
    description: 'Change the status of a SonarQube issue. Use this to accept, mark as false positive, or reopen an issue. Requires "Administer Issues" permission on the project.',
    schema: z.object({
      issueKey: z.string().describe('The key of the issue to change (e.g., "AX-HMISMFixnZED")'),
      transition: z.enum(['accept', 'falsepositive', 'reopen']).describe('The transition to apply: "accept" (won\'t fix), "falsepositive" (not a real issue), "reopen" (re-open a resolved issue)'),
    }),
  },

  // Security Hotspots - Write
  sonarqube_changeSecurityHotspotStatus: {
    scope: 'write' as const,
    description: 'Change the status of a Security Hotspot after review. When marking as REVIEWED, you must specify a resolution (FIXED, SAFE, or ACKNOWLEDGED). Requires appropriate permissions on the project.',
    schema: z.object({
      hotspotKey: z.string().describe('The key of the Security Hotspot to update'),
      status: z.enum(['TO_REVIEW', 'REVIEWED']).describe('The new status: TO_REVIEW (needs review) or REVIEWED (has been reviewed)'),
      resolution: z.enum(['FIXED', 'SAFE', 'ACKNOWLEDGED']).optional().describe('Required when status is REVIEWED. FIXED=a fix was implemented, SAFE=determined safe, ACKNOWLEDGED=risk accepted'),
      comment: z.string().optional().describe('Optional comment explaining the review decision'),
    }),
  },

  // Webhooks - Write
  sonarqube_createWebhook: {
    scope: 'write' as const,
    description: 'Create a new webhook for a SonarQube project or instance. Webhooks notify external services about project analysis results. Requires "Administer" permission.',
    schema: z.object({
      name: z.string().describe('Name displayed in the administration console (max 100 chars)'),
      url: z.string().describe('Server endpoint URL that will receive the webhook payload (max 512 chars)'),
      projectKey: z.string().optional().describe('Project key to create a project-specific webhook. If omitted, creates a global webhook'),
      secret: z.string().optional().describe('Secret for HMAC signature in X-Sonar-Webhook-HMAC-SHA256 header (16-200 chars)'),
    }),
  },
} as const;

/**
 * Type for SonarQube tool names.
 */
export type SonarQubeToolName = keyof typeof sonarqubeSchemas;

/**
 * Get the Zod schema for a specific tool.
 */
export function getSonarQubeSchema(toolName: SonarQubeToolName) {
  return sonarqubeSchemas[toolName].schema;
}
