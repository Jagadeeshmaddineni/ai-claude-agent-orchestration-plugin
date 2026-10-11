import { IToolService, ToolDefinition, ToolScope, toolNotFoundError } from '../../shared';
import { TestRailClient, TestRailConfig } from './client';
import { testrailSchemas, TestRailToolName } from './schemas';
import { getTestRailToolsByScope } from './tools';

/**
 * TestRail tool service implementing IToolService interface.
 */
export class TestRailService implements IToolService {
  readonly serviceName = 'testrail';

  private readonly client: TestRailClient;
  private readonly scope: ToolScope;

  constructor(config: TestRailConfig) {
    this.client = new TestRailClient(config);
    this.scope = config.scope || 'write';
  }

  isConfigured(): boolean {
    return this.client.isConfigured();
  }

  getTools(): ToolDefinition[] {
    return getTestRailToolsByScope(this.scope);
  }

  async executeTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    // Validate tool exists
    if (!(toolName in testrailSchemas)) {
      throw toolNotFoundError(this.serviceName, toolName);
    }

    // Parse and validate args
    const schema = testrailSchemas[toolName as TestRailToolName].schema;
    const parsed = schema.parse(args);

    // Execute tool
    switch (toolName) {
      case 'testrail_getProjects':
        return this.client.getProjects(parsed.isCompleted);

      case 'testrail_getSuites':
        return this.client.getSuites(parsed.projectId);

      case 'testrail_getSections':
        return this.client.getSections(parsed.projectId, parsed.suiteId);

      case 'testrail_getCase':
        return this.client.getCase(parsed.caseId);

      case 'testrail_getCases':
        return this.client.getCases(parsed.projectId, {
          suiteId: parsed.suiteId,
          sectionId: parsed.sectionId,
          typeId: parsed.typeId,
          priorityId: parsed.priorityId,
          limit: parsed.limit,
          offset: parsed.offset,
        });

      case 'testrail_addCase':
        return this.client.addCase(parsed.sectionId, {
          title: parsed.title,
          typeId: parsed.typeId,
          priorityId: parsed.priorityId,
          estimate: parsed.estimate,
          refs: parsed.refs,
          customPreconds: parsed.customPreconds,
          customSteps: parsed.customSteps,
          customExpected: parsed.customExpected,
          customDisabled: parsed.customDisabled,
          customFields: parsed.customFields,
        });

      case 'testrail_updateCase':
        return this.client.updateCase(parsed.caseId, {
          title: parsed.title,
          typeId: parsed.typeId,
          priorityId: parsed.priorityId,
          estimate: parsed.estimate,
          refs: parsed.refs,
          customPreconds: parsed.customPreconds,
          customSteps: parsed.customSteps,
          customExpected: parsed.customExpected,
          customDisabled: parsed.customDisabled,
          customFields: parsed.customFields,
        });

      case 'testrail_getCaseTypes':
        return this.client.getCaseTypes();

      case 'testrail_getCaseFields':
        return this.client.getCaseFields();

      default:
        throw toolNotFoundError(this.serviceName, toolName);
    }
  }
}
