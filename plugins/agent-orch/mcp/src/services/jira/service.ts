import { IToolService, ToolDefinition, ToolScope, toolNotFoundError } from '../../shared';
import { JiraClient, JiraConfig } from './client';
import { jiraSchemas, JiraToolName } from './schemas';
import { getJiraToolsByScope } from './tools';

/**
 * Jira tool service implementing IToolService interface.
 */
export class JiraService implements IToolService {
  readonly serviceName = 'jira';

  private readonly client: JiraClient;
  private readonly scope: ToolScope;

  constructor(config: JiraConfig) {
    this.client = new JiraClient(config);
    this.scope = config.scope || 'write';
  }

  isConfigured(): boolean {
    return this.client.isConfigured();
  }

  getTools(): ToolDefinition[] {
    return getJiraToolsByScope(this.scope);
  }

  async executeTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    // Validate tool exists
    if (!(toolName in jiraSchemas)) {
      throw toolNotFoundError(this.serviceName, toolName);
    }

    // Parse and validate args
    const schema = jiraSchemas[toolName as JiraToolName].schema;
    const parsed = schema.parse(args);

    // Execute tool
    switch (toolName) {
      case 'jira_getIssue':
        return this.client.getIssue(parsed.issueKey, parsed.expand);

      case 'jira_searchIssues':
        return this.client.searchIssues(
          parsed.jql,
          parsed.startAt,
          parsed.maxResults,
          parsed.fields,
          parsed.expand
        );

      case 'jira_createIssue':
        return this.client.createIssue(
          parsed.projectKey,
          parsed.summary,
          parsed.issueTypeId,
          parsed.description,
          parsed.parent,
          parsed.epicName,
          parsed.customFields
        );

      case 'jira_updateIssue':
        return this.client.updateIssue(
          parsed.issueKey,
          parsed.summary,
          parsed.description,
          parsed.issueTypeId,
          parsed.customFields
        );

      case 'jira_deleteIssue':
        return this.client.deleteIssue(parsed.issueKey, parsed.deleteSubtasks);

      case 'jira_getIssueComments':
        return this.client.getIssueComments(parsed.issueKey, parsed.expand);

      case 'jira_postIssueComment':
        return this.client.postIssueComment(parsed.issueKey, parsed.comment);

      case 'jira_getAllProjects':
        return this.client.getAllProjects(parsed.includeArchived);

      case 'jira_getProject':
        return this.client.getProject(parsed.projectKey);

      case 'jira_getIssueTypes':
        return this.client.getIssueTypes(parsed.projectKey);

      case 'jira_getComponents':
        return this.client.getComponents(parsed.projectKey);

      case 'jira_getVersions':
        return this.client.getVersions(parsed.projectKey);

      case 'jira_getPriorities':
        return this.client.getPriorities();

      case 'jira_getTransitions':
        return this.client.getTransitions(parsed.issueKey);

      case 'jira_transitionIssue':
        return this.client.transitionIssue(
          parsed.issueKey,
          parsed.transitionId,
          parsed.fields,
          parsed.comment
        );

      case 'jira_searchUsers':
        return this.client.searchUsers(parsed.query, parsed.maxResults);

      case 'jira_getCurrentUser':
        return this.client.getCurrentUser();

      case 'jira_getUserProfile':
        return this.client.getUserProfile(parsed.identifier);

      case 'jira_assignIssue':
        return this.client.assignIssue(parsed.issueKey, parsed.assignee);

      case 'jira_addWatcher':
        return this.client.addWatcher(parsed.issueKey, parsed.username);

      case 'jira_removeWatcher':
        return this.client.removeWatcher(parsed.issueKey, parsed.username);

      case 'jira_getIssueLinkTypes':
        return this.client.getIssueLinkTypes();

      case 'jira_linkIssues':
        return this.client.linkIssues(
          parsed.linkType,
          parsed.inwardIssueKey,
          parsed.outwardIssueKey,
          parsed.comment
        );

      case 'jira_getFields':
        return this.client.getFields();

      case 'jira_getFieldById':
        return this.client.getFieldById(parsed.fieldId);

      case 'jira_getCustomFields':
        return this.client.getCustomFields();

      case 'jira_getRequiredFields':
        return this.client.getRequiredFields(parsed.projectKey, parsed.issueTypeId);

      case 'jira_searchFields':
        return this.client.searchFields(parsed.query);

      case 'jira_getAllBoards':
        return this.client.getAllBoards(parsed);

      case 'jira_getBoardIssues':
        return this.client.getBoardIssues(parsed.boardId, parsed);

      case 'jira_getSprintsFromBoard':
        return this.client.getSprintsFromBoard(parsed.boardId, parsed);

      case 'jira_getSprintIssues':
        return this.client.getSprintIssues(parsed.sprintId, parsed);

      case 'jira_createSprint':
        return this.client.createSprint(
          parsed.boardId,
          parsed.name,
          parsed.startDate,
          parsed.endDate,
          parsed.goal
        );

      case 'jira_updateSprint':
        return this.client.updateSprint(parsed.sprintId, parsed);

      case 'jira_batchCreateIssues':
        return this.client.batchCreateIssues(parsed.issues);

      case 'jira_getAttachments':
        return this.client.getAttachments(parsed.issueKey);

      case 'jira_downloadAttachment':
        return this.client.downloadAttachment(parsed.attachmentId);

      case 'jira_uploadAttachment':
        return this.client.uploadAttachment(parsed.issueKey, parsed.filename, parsed.content);

      case 'jira_deleteAttachment':
        return this.client.deleteAttachment(parsed.attachmentId);

      default:
        throw toolNotFoundError(this.serviceName, toolName);
    }
  }
}
