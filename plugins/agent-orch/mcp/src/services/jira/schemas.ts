import { z } from 'zod';
import { ToolScope } from '../../shared';

/**
 * Schema definition with scope for tool filtering.
 */
export interface SchemaDefinition<T extends z.ZodType> {
  schema: T;
  scope: ToolScope;
  description: string;
}

/**
 * Jira tool schemas with scope tagging.
 * Scope: 'read' for queries, 'write' for mutations.
 */
export const jiraSchemas = {
  // ============================================================================
  // Core CRUD
  // ============================================================================
  jira_getIssue: {
    scope: 'read' as const,
    description: 'Get full details of a single Jira issue (ticket, bug, task, story) by its key (e.g., PROJ-123). Returns all fields including description, comments, attachments, and custom fields. For multiple issues, use jira_searchIssues instead.',
    schema: z.object({
      issueKey: z.string().describe('The Jira issue key (e.g., PROJ-123)'),
      expand: z.string().optional().describe('Fields to expand (e.g., "changelog,renderedFields")'),
    }),
  },
  jira_searchIssues: {
    scope: 'read' as const,
    description: 'Search for Jira issues (tickets, bugs, tasks, stories, epics) using JQL queries. Find work items by status, assignee, project, sprint, labels, or any combination. Use the "fields" parameter to return only specific fields and reduce response size. For a single known issue, use jira_getIssue instead.',
    schema: z.object({
      jql: z.string().describe('JQL query string (e.g., "project = PROJ AND status = Open")'),
      startAt: z.number().optional().describe('Starting index for pagination'),
      maxResults: z.number().optional().describe('Maximum results to return (default: 50)'),
      fields: z.array(z.string()).optional().describe('Fields to return'),
      expand: z.array(z.string()).optional().describe('Additional metadata to include'),
    }),
  },
  jira_createIssue: {
    scope: 'write' as const,
    description: 'Create a new Jira issue (bug, task, story, epic). Requires project ID, summary, and issue type. Use jira_getIssueTypes to discover available issue types, and jira_getRequiredFields to check mandatory fields before creating.',
    schema: z.object({
      projectKey: z.string().describe('Project key (e.g., "PROJ")'),
      summary: z.string().describe('Issue summary/title'),
      description: z.string().optional().describe('Issue description'),
      issueTypeId: z.string().describe('Issue type ID'),
      parent: z.string().optional().describe('Parent issue key for hierarchy (e.g., "PROJ-123"). Used for Story→Epic or Epic→Epic relationships in Jira Cloud.'),
      epicName: z.string().optional().describe('Epic Name field value (short label for Epic issues). Only applies to Epic issue type. Field ID varies by instance (commonly customfield_10011).'),
      customFields: z.record(z.unknown()).optional().describe('Custom fields as key-value pairs'),
    }),
  },
  jira_updateIssue: {
    scope: 'write' as const,
    description: 'Update fields on an existing Jira issue. Modify summary, description, priority, labels, custom fields, and more. For status changes, use jira_transitionIssue instead. For assignment changes, use jira_assignIssue.',
    schema: z.object({
      issueKey: z.string().describe('The issue key to update'),
      summary: z.string().optional().describe('New summary'),
      description: z.string().optional().describe('New description'),
      issueTypeId: z.string().optional().describe('New issue type ID'),
      customFields: z.record(z.unknown()).optional().describe('Custom fields to update'),
    }),
  },
  jira_deleteIssue: {
    scope: 'write' as const,
    description: 'Permanently delete a Jira issue. WARNING: This action cannot be undone. Optionally delete subtasks as well. Use with caution.',
    schema: z.object({
      issueKey: z.string().describe('The issue key to delete'),
      deleteSubtasks: z.boolean().optional().describe('Delete subtasks too (default: false)'),
    }),
  },

  // ============================================================================
  // Comments
  // ============================================================================
  jira_getIssueComments: {
    scope: 'read' as const,
    description: 'Get all comments and discussion on a Jira issue. Returns comment text, authors, and timestamps. Use this to review conversation history on a ticket.',
    schema: z.object({
      issueKey: z.string().describe('The issue key'),
      expand: z.string().optional().describe('Fields to expand in the response'),
    }),
  },
  jira_postIssueComment: {
    scope: 'write' as const,
    description: 'Add a comment to a Jira issue. Use this to post updates, ask questions, or provide feedback on a ticket. Supports Jira wiki markup for formatting.',
    schema: z.object({
      issueKey: z.string().describe('The issue key'),
      comment: z.string().describe('Comment text'),
    }),
  },

  // ============================================================================
  // Projects
  // ============================================================================
  jira_getAllProjects: {
    scope: 'read' as const,
    description: 'List all Jira projects accessible to the current user. Use this first to discover available projects before searching for issues or creating tickets. Returns project keys, names, and lead information.',
    schema: z.object({
      includeArchived: z.boolean().optional().describe('Include archived projects'),
    }),
  },
  jira_getProject: {
    scope: 'read' as const,
    description: 'Get detailed information about a specific Jira project including description, lead, issue types, and components. Use jira_getAllProjects to list available projects first.',
    schema: z.object({
      projectKey: z.string().describe('The project key'),
    }),
  },
  jira_getIssueTypes: {
    scope: 'read' as const,
    description: 'Get available issue types (Bug, Task, Story, Epic, etc.) for a Jira project. Use this before jira_createIssue to find valid issue type IDs.',
    schema: z.object({
      projectKey: z.string().describe('The project key'),
    }),
  },
  jira_getComponents: {
    scope: 'read' as const,
    description: 'Get components (subsystems or modules) defined for a Jira project. Components help organize issues by area like "Backend", "Frontend", "API".',
    schema: z.object({
      projectKey: z.string().describe('The project key'),
    }),
  },
  jira_getVersions: {
    scope: 'read' as const,
    description: 'Get versions (releases, milestones) for a Jira project. Returns release names, dates, and status. Use for release planning or finding Fix Version values.',
    schema: z.object({
      projectKey: z.string().describe('The project key'),
    }),
  },
  jira_getPriorities: {
    scope: 'read' as const,
    description: 'Get all available Jira priority levels (e.g., Blocker, Critical, Major, Minor, Trivial). Use this to find valid priority IDs when creating or updating issues.',
    schema: z.object({}),
  },

  // ============================================================================
  // Transitions
  // ============================================================================
  jira_getTransitions: {
    scope: 'read' as const,
    description: 'Get available workflow transitions (status changes) for a Jira issue. Returns valid next statuses like "To Do" → "In Progress" → "Done". Use this before jira_transitionIssue to find the correct transition ID.',
    schema: z.object({
      issueKey: z.string().describe('The issue key'),
    }),
  },
  jira_transitionIssue: {
    scope: 'write' as const,
    description: 'Change the status of a Jira issue (e.g., move from "To Do" to "In Progress" to "Done"). Use jira_getTransitions first to find valid transition IDs for the issue.',
    schema: z.object({
      issueKey: z.string().describe('The issue key'),
      transitionId: z.string().describe('The transition ID'),
      fields: z.record(z.unknown()).optional().describe('Fields to set during transition'),
      comment: z.string().optional().describe('Comment to add during transition'),
    }),
  },

  // ============================================================================
  // Users
  // ============================================================================
  jira_searchUsers: {
    scope: 'read' as const,
    description: 'Search for Jira users by name, email, or username. Use this to find team members for assignment, watchers, or mentions. Returns display names and account IDs.',
    schema: z.object({
      query: z.string().describe('Search query (username, display name, or email)'),
      maxResults: z.number().optional().describe('Maximum results (default: 50)'),
    }),
  },
  jira_getCurrentUser: {
    scope: 'read' as const,
    description: 'Get the currently authenticated Jira user (yourself). Returns your username, display name, email, and permissions. Useful for finding your own account ID.',
    schema: z.object({}),
  },
  jira_getUserProfile: {
    scope: 'read' as const,
    description: 'Get Jira user profile details. Returns display name, email, avatar URL, and account status. Pass accountId for Cloud or username for DataCenter. Use jira_getCurrentUser to find your own accountId, or jira_searchUsers to search by name/email.',
    schema: z.object({
      identifier: z.string().describe('Account ID (Cloud) or username (DataCenter)'),
    }),
  },

  // ============================================================================
  // Assignment
  // ============================================================================
  jira_assignIssue: {
    scope: 'write' as const,
    description: 'Assign a Jira issue to a team member or unassign it. Pass null as assignee to remove assignment. Use jira_searchUsers to find valid usernames.',
    schema: z.object({
      issueKey: z.string().describe('The issue key'),
      assignee: z.string().nullable().describe('Username to assign, or null to unassign'),
    }),
  },

  // ============================================================================
  // Watchers
  // ============================================================================
  jira_addWatcher: {
    scope: 'write' as const,
    description: 'Add a user as a watcher to a Jira issue. Watchers receive notifications on issue updates. Use jira_searchUsers to find valid usernames.',
    schema: z.object({
      issueKey: z.string().describe('The issue key'),
      username: z.string().describe('Username to add as watcher'),
    }),
  },
  jira_removeWatcher: {
    scope: 'write' as const,
    description: 'Remove a user from the watchers list of a Jira issue. The user will no longer receive notifications for this issue.',
    schema: z.object({
      issueKey: z.string().describe('The issue key'),
      username: z.string().describe('Username to remove'),
    }),
  },

  // ============================================================================
  // Issue Links
  // ============================================================================
  jira_getIssueLinkTypes: {
    scope: 'read' as const,
    description: 'Get available issue link types (Blocks, Relates to, Duplicates, Clones, etc.). Use this before jira_linkIssues to find valid link type names.',
    schema: z.object({}),
  },
  jira_linkIssues: {
    scope: 'write' as const,
    description: 'Create a relationship link between two Jira issues. Supports link types like "Blocks", "Is blocked by", "Relates to", "Duplicates", "Clones". Use jira_getIssueLinkTypes to see available link types.',
    schema: z.object({
      linkType: z.string().describe('Link type name (e.g., "Blocks", "Relates")'),
      inwardIssueKey: z.string().describe('The inward issue key'),
      outwardIssueKey: z.string().describe('The outward issue key'),
      comment: z.string().optional().describe('Optional comment'),
    }),
  },

  // ============================================================================
  // Fields
  // ============================================================================
  jira_getFields: {
    scope: 'read' as const,
    description: 'Get all Jira fields including system fields (summary, status, assignee) and custom fields. Use this to discover field IDs for searching or updating issues.',
    schema: z.object({}),
  },
  jira_getFieldById: {
    scope: 'read' as const,
    description: 'Get details of a specific Jira field by ID (e.g., "summary", "customfield_10001"). Returns field name, type, and allowed values if applicable.',
    schema: z.object({
      fieldId: z.string().describe('Field ID (e.g., "summary", "customfield_10001")'),
    }),
  },
  jira_getCustomFields: {
    scope: 'read' as const,
    description: 'Get only custom Jira fields (excludes system fields). Custom fields have IDs like "customfield_10001". Use this when you need to work with organization-specific fields.',
    schema: z.object({}),
  },
  jira_getRequiredFields: {
    scope: 'read' as const,
    description: 'Get mandatory fields required when creating a Jira issue for a specific project and issue type. Always check this before jira_createIssue to avoid validation errors.',
    schema: z.object({
      projectKey: z.string().describe('Project key'),
      issueTypeId: z.string().describe('Issue type ID'),
    }),
  },
  jira_searchFields: {
    scope: 'read' as const,
    description: 'Search for Jira fields by name (case-insensitive). Use this to find a field ID when you know the field name but not its ID.',
    schema: z.object({
      query: z.string().describe('Search query'),
    }),
  },

  // ============================================================================
  // Agile Boards
  // ============================================================================
  jira_getAllBoards: {
    scope: 'read' as const,
    description: 'List all Jira Agile boards (Scrum, Kanban, or Simple). Use this to find board IDs before querying sprints or board issues. Can filter by project or board type.',
    schema: z.object({
      type: z.string().optional().describe('Board type (scrum, kanban)'),
      name: z.string().optional().describe('Filter by name'),
      projectKeyOrId: z.string().optional().describe('Filter by project'),
      startAt: z.number().optional(),
      maxResults: z.number().optional(),
    }),
  },
  jira_getBoardIssues: {
    scope: 'read' as const,
    description: 'Get all issues visible on a Jira Agile board. Returns issues in board order. Use jira_getAllBoards to find board IDs first.',
    schema: z.object({
      boardId: z.string().describe('The board ID'),
      jql: z.string().optional().describe('Additional JQL filter'),
      fields: z.array(z.string()).optional().describe('Fields to return'),
      startAt: z.number().optional(),
      maxResults: z.number().optional(),
    }),
  },

  // ============================================================================
  // Sprints
  // ============================================================================
  jira_getSprintsFromBoard: {
    scope: 'read' as const,
    description: 'List sprints on a Jira Scrum board. Filter by state (active, future, closed). Use jira_getAllBoards to find the board ID first.',
    schema: z.object({
      boardId: z.string().describe('The board ID'),
      state: z.enum(['active', 'future', 'closed']).optional().describe('Sprint state filter'),
      startAt: z.number().optional(),
      maxResults: z.number().optional(),
    }),
  },
  jira_getSprintIssues: {
    scope: 'read' as const,
    description: 'Get all issues in a specific Jira sprint. Returns backlog items, stories, and tasks assigned to the sprint. Use jira_getSprintsFromBoard to find sprint IDs.',
    schema: z.object({
      sprintId: z.string().describe('The sprint ID'),
      jql: z.string().optional().describe('Additional JQL filter'),
      fields: z.array(z.string()).optional().describe('Fields to return'),
      startAt: z.number().optional(),
      maxResults: z.number().optional(),
    }),
  },
  jira_createSprint: {
    scope: 'write' as const,
    description: 'Create a new sprint on a Jira Scrum board. Set name, start/end dates, and sprint goal. Use jira_getAllBoards to find the board ID first.',
    schema: z.object({
      boardId: z.string().describe('The board ID'),
      name: z.string().describe('Sprint name'),
      startDate: z.string().optional().describe('Start date (ISO format)'),
      endDate: z.string().optional().describe('End date (ISO format)'),
      goal: z.string().optional().describe('Sprint goal'),
    }),
  },
  jira_updateSprint: {
    scope: 'write' as const,
    description: 'Update a Jira sprint. Modify name, dates, goal, or state. Change state to "active" to start sprint, "closed" to complete it.',
    schema: z.object({
      sprintId: z.string().describe('The sprint ID'),
      name: z.string().optional().describe('New sprint name'),
      state: z.enum(['active', 'closed', 'future']).optional().describe('Sprint state'),
      startDate: z.string().optional().describe('Start date (ISO format)'),
      endDate: z.string().optional().describe('End date (ISO format)'),
      goal: z.string().optional().describe('Sprint goal'),
    }),
  },

  // ============================================================================
  // Batch
  // ============================================================================
  jira_batchCreateIssues: {
    scope: 'write' as const,
    description: 'Create multiple Jira issues in a single API call. More efficient than individual jira_createIssue calls when creating many tickets at once.',
    schema: z.object({
      issues: z.array(z.object({
        projectKey: z.string(),
        summary: z.string(),
        description: z.string().optional(),
        issueTypeId: z.string(),
        parent: z.string().optional().describe('Parent issue key for hierarchy'),
        epicName: z.string().optional().describe('Epic Name field value'),
        customFields: z.record(z.unknown()).optional(),
      })).describe('Array of issues to create'),
    }),
  },

  // ============================================================================
  // Attachments
  // ============================================================================
  jira_getAttachments: {
    scope: 'read' as const,
    description: 'Get attachments metadata on a Jira issue. Returns attachment IDs, filenames, and sizes. Use jira_downloadAttachment to download a specific file.',
    schema: z.object({
      issueKey: z.string().describe('The issue key'),
    }),
  },
  jira_downloadAttachment: {
    scope: 'read' as const,
    description: 'Download a single attachment from Jira by attachment ID. Returns the file content as base64. Use jira_getIssue or jira_getAttachments to find attachment IDs on an issue.',
    schema: z.object({
      attachmentId: z.string().describe('The attachment ID'),
    }),
  },
  jira_uploadAttachment: {
    scope: 'write' as const,
    description: 'Upload a file attachment to a Jira issue. Provide base64-encoded content. Supports images, documents, logs, and other files.',
    schema: z.object({
      issueKey: z.string().describe('The issue key'),
      filename: z.string().describe('Filename'),
      content: z.string().describe('Base64-encoded file content'),
    }),
  },
  jira_deleteAttachment: {
    scope: 'write' as const,
    description: 'Delete an attachment from a Jira issue by attachment ID. WARNING: This action cannot be undone.',
    schema: z.object({
      attachmentId: z.string().describe('The attachment ID'),
    }),
  },
} as const;

/**
 * Type for Jira tool names.
 */
export type JiraToolName = keyof typeof jiraSchemas;

/**
 * Get the Zod schema for a specific tool.
 */
export function getJiraSchema(toolName: JiraToolName) {
  return jiraSchemas[toolName].schema;
}
