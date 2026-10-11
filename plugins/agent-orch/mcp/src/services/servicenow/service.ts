import { IToolService, ToolDefinition, ToolScope, toolNotFoundError } from '../../shared';
import { ServiceNowClient, ServiceNowConfig, ServiceNowSearchOptions } from './client';
import { servicenowSchemas, ServiceNowToolName } from './schemas';
import { getServiceNowToolsByScope } from './tools';

/** Static metadata returned by servicenow_listTables. */
const SUPPORTED_TABLES: Array<{ table: string; description: string }> = [
  {
    table: 'sc_task',
    description:
      'Catalog tasks (Service Catalog). Used for DDQ requests, "Global Sales and Client Due ' +
      'Diligence" requests, etc. Catalog variables exposed via variables.* fields (must be requested ' +
      'explicitly via sysparm_fields).',
  },
  {
    table: 'incident',
    description: 'ITSM incidents. Standard ServiceNow incident management table.',
  },
  {
    table: 'cmdb_ci',
    description:
      'CMDB Configuration Items (base class). Filter by sys_class_name to narrow to a specific CI ' +
      'class such as cmdb_ci_server or cmdb_ci_appl.',
  },
  {
    table: 'business_unit',
    description:
      'Business units. May be unavailable on some instances — listBusinessUnits falls back to ' +
      'core_company in that case.',
  },
  {
    table: 'core_company',
    description:
      'Companies (vendors, customers, internal entities). Often used as a fallback when business_unit ' +
      'is not enabled.',
  },
];

/**
 * ServiceNow tool service implementing IToolService.
 *
 * Read-only by default. Write tools (none in v1) would be gated by the
 * scope check below: any tool whose schema declares `scope: 'write'` is
 * rejected when the configured scope is `'read'`.
 */
export class ServiceNowService implements IToolService {
  readonly serviceName = 'servicenow';

  private readonly client: ServiceNowClient;
  private readonly scope: ToolScope;

  constructor(config: ServiceNowConfig) {
    this.client = new ServiceNowClient(config);
    this.scope = config.scope || 'read';
  }

  isConfigured(): boolean {
    return this.client.isConfigured();
  }

  getTools(): ToolDefinition[] {
    return getServiceNowToolsByScope(this.scope);
  }

  async executeTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    if (!(toolName in servicenowSchemas)) {
      throw toolNotFoundError(this.serviceName, toolName);
    }

    const toolDef = servicenowSchemas[toolName as ServiceNowToolName];

    // Defensive scope check. v1 only ships read tools, but if a write tool is
    // ever added the schema will declare scope: 'write' and this gate keeps
    // it inaccessible to read-only deployments. Cast widens the literal so
    // the compare compiles today.
    if ((toolDef.scope as string) === 'write' && this.scope === 'read') {
      throw new Error(
        `[${this.serviceName}] Tool "${toolName}" requires write scope, but service is configured with read-only scope`
      );
    }

    const parsed = toolDef.schema.parse(args);

    switch (toolName as ServiceNowToolName) {
      case 'servicenow_searchTickets':
        return this.client.searchTable('sc_task', parsed as ServiceNowSearchOptions);

      case 'servicenow_getTicket':
        return this.getRecordByIdOrNumber(
          'sc_task',
          parsed as { sys_id?: string; number?: string; displayValue?: boolean | 'all' }
        );

      case 'servicenow_searchIncidents':
        return this.client.searchTable('incident', parsed as ServiceNowSearchOptions);

      case 'servicenow_getIncident':
        return this.getRecordByIdOrNumber(
          'incident',
          parsed as { sys_id?: string; number?: string; displayValue?: boolean | 'all' }
        );

      case 'servicenow_searchCMDB':
        return this.searchCMDB(parsed as ServiceNowSearchOptions & { ciClass?: string });

      case 'servicenow_getCMDBItem':
        return this.client.getRecord(
          (parsed as { table?: string }).table || 'cmdb_ci',
          (parsed as { sys_id: string }).sys_id,
          (parsed as { displayValue?: boolean | 'all' }).displayValue
        );

      case 'servicenow_listBusinessUnits':
        return this.listBusinessUnits(parsed as ServiceNowSearchOptions);

      case 'servicenow_listTables':
        return { tables: SUPPORTED_TABLES };

      default: {
        // Exhaustiveness check — TypeScript will flag unhandled union members.
        const _exhaustive: never = toolName as never;
        throw toolNotFoundError(this.serviceName, _exhaustive);
      }
    }
  }

  private async getRecordByIdOrNumber(
    table: string,
    args: { sys_id?: string; number?: string; displayValue?: boolean | 'all' }
  ): Promise<unknown> {
    if (args.sys_id) {
      return this.client.getRecord(table, args.sys_id, args.displayValue);
    }
    if (args.number) {
      const record = await this.client.getRecordByNumber(table, args.number, args.displayValue);
      if (!record) {
        return { result: null, message: `No ${table} record found with number=${args.number}` };
      }
      return { result: record };
    }
    // Schema-level refine() should prevent us getting here.
    throw new Error(`[${this.serviceName}] Provide exactly one of sys_id or number.`);
  }

  private async searchCMDB(
    args: ServiceNowSearchOptions & { ciClass?: string }
  ): Promise<unknown> {
    const { ciClass, query, ...rest } = args;
    const composedQuery = [ciClass ? `sys_class_name=${ciClass}` : null, query]
      .filter(Boolean)
      .join('^');
    return this.client.searchTable('cmdb_ci', {
      ...rest,
      query: composedQuery || undefined,
    });
  }

  private async listBusinessUnits(opts: ServiceNowSearchOptions): Promise<unknown> {
    try {
      const result = await this.client.searchTable('business_unit', opts);
      return { source: 'business_unit', ...result };
    } catch (err) {
      // If the instance does not expose business_unit (404 / NOT_FOUND), fall
      // back to core_company. Re-throw any other error.
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        (err as { code?: string }).code === 'NOT_FOUND'
      ) {
        const result = await this.client.searchTable('core_company', opts);
        return { source: 'core_company', fallback: true, ...result };
      }
      throw err;
    }
  }
}
