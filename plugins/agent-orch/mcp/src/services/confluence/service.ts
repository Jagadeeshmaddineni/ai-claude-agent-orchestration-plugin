import { IToolService, ToolDefinition, ToolScope, toolNotFoundError } from '../../shared';
import { ConfluenceClient, ConfluenceConfig } from './client';
import { confluenceSchemas, ConfluenceToolName } from './schemas';
import { getConfluenceToolsByScope } from './tools';

/**
 * Confluence tool service implementing IToolService interface.
 */
export class ConfluenceService implements IToolService {
  readonly serviceName = 'confluence';

  private readonly client: ConfluenceClient;
  private readonly scope: ToolScope;

  constructor(config: ConfluenceConfig) {
    this.client = new ConfluenceClient(config);
    this.scope = config.scope || 'write';
  }

  isConfigured(): boolean {
    return this.client.isConfigured();
  }

  getTools(): ToolDefinition[] {
    return getConfluenceToolsByScope(this.scope);
  }

  async executeTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    // Validate tool exists
    if (!(toolName in confluenceSchemas)) {
      throw toolNotFoundError(this.serviceName, toolName);
    }

    // Parse and validate args
    const schema = confluenceSchemas[toolName as ConfluenceToolName].schema;
    const parsed = schema.parse(args);

    // Execute tool
    switch (toolName) {
      case 'confluence_getContent':
        return this.client.getContent(parsed.contentId, parsed.expand);

      case 'confluence_searchContent':
        return this.client.searchContent(parsed.cql, parsed.limit, parsed.start, parsed.expand);

      case 'confluence_createContent':
        return this.client.createContent(
          parsed.spaceKey,
          parsed.title,
          parsed.body,
          parsed.parentId,
          parsed.type
        );

      case 'confluence_updateContent':
        return this.client.updateContent(
          parsed.contentId,
          parsed.version,
          parsed.title,
          parsed.body,
          parsed.versionComment
        );

      case 'confluence_getSpaces':
        return this.client.getSpaces(parsed.limit, parsed.start);

      case 'confluence_searchSpace':
        return this.client.searchSpace(parsed.query);

      case 'confluence_getPageChildren':
        return this.client.getPageChildren(parsed.pageId, parsed.expand, parsed.limit, parsed.start);

      case 'confluence_getComments':
        return this.client.getComments(
          parsed.contentId,
          parsed.expand,
          parsed.depth,
          parsed.location,
          parsed.limit,
          parsed.start
        );

      case 'confluence_getLabels':
        return this.client.getLabels(parsed.contentId);

      case 'confluence_addLabel':
        return this.client.addLabel(parsed.contentId, parsed.label);

      case 'confluence_searchUser':
        return this.client.searchUser(parsed.query, parsed.limit, parsed.start);

      default:
        throw toolNotFoundError(this.serviceName, toolName);
    }
  }
}
