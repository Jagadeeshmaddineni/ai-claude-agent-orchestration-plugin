import { z } from 'zod';

/**
 * ServiceNow tool schemas (read-only v1).
 *
 * All tools are tagged `scope: 'read'`. Adding a write tool in the future
 * MUST also extend the `ServiceNowToolName` union and add a write branch in
 * `service.ts`. The service-level scope check then gates it automatically.
 */
const searchOptionsShape = {
  query: z
    .string()
    .optional()
    .describe(
      'Encoded ServiceNow sysparm_query (e.g. "state=3^assignment_groupLIKEDDQ"). ' +
        'NOTE: variables.* fields cannot be reliably filtered server-side — fetch broader and filter client-side.'
    ),
  fields: z
    .array(z.string())
    .optional()
    .describe(
      'Fields to project (maps to sysparm_fields). Catalog variables must be requested explicitly, ' +
        'e.g. "variables.client", "variables.business_unit".'
    ),
  limit: z
    .number()
    .int()
    .min(1)
    .max(10000)
    .optional()
    .describe('Page size (default 1000, ServiceNow max 10000).'),
  offset: z.number().int().min(0).optional().describe('Pagination offset (default 0).'),
  displayValue: z
    .union([z.boolean(), z.literal('all')])
    .optional()
    .describe(
      'true (default) = human-readable values; false = raw sys_ids/system values; "all" = both.'
    ),
};

export const servicenowSchemas = {
  // ============================================================================
  // Catalog tasks (sc_task)
  // ============================================================================
  servicenow_searchTickets: {
    scope: 'read' as const,
    description:
      'Search ServiceNow catalog tasks (sc_task). Returns up to `limit` records. Use `query` for ' +
      'sysparm_query filtering and `fields` to project specific fields including catalog variables ' +
      '(variables.client, variables.business_unit, etc.). Catalog variables must be explicitly requested.',
    schema: z.object(searchOptionsShape),
  },
  servicenow_getTicket: {
    scope: 'read' as const,
    description:
      'Get a single ServiceNow catalog task (sc_task) by sys_id OR by number (e.g. SCTASK0012345). ' +
      'Provide exactly one of {sys_id, number}.',
    schema: z
      .object({
        sys_id: z.string().optional().describe('ServiceNow sys_id (32-char hex).'),
        number: z.string().optional().describe('Catalog task number, e.g. SCTASK0012345.'),
        displayValue: z
          .union([z.boolean(), z.literal('all')])
          .optional()
          .describe('true (default) | false | "all".'),
      })
      .refine((v) => !!v.sys_id !== !!v.number, {
        message: 'Provide exactly one of sys_id or number.',
      }),
  },

  // ============================================================================
  // Incidents
  // ============================================================================
  servicenow_searchIncidents: {
    scope: 'read' as const,
    description:
      'Search ServiceNow incidents (incident table). Same parameter shape as servicenow_searchTickets — ' +
      'use `query` for sysparm_query, `fields` for projection.',
    schema: z.object(searchOptionsShape),
  },
  servicenow_getIncident: {
    scope: 'read' as const,
    description:
      'Get a single ServiceNow incident by sys_id OR by number (e.g. INC0098765). ' +
      'Provide exactly one of {sys_id, number}.',
    schema: z
      .object({
        sys_id: z.string().optional().describe('ServiceNow sys_id (32-char hex).'),
        number: z.string().optional().describe('Incident number, e.g. INC0098765.'),
        displayValue: z
          .union([z.boolean(), z.literal('all')])
          .optional()
          .describe('true (default) | false | "all".'),
      })
      .refine((v) => !!v.sys_id !== !!v.number, {
        message: 'Provide exactly one of sys_id or number.',
      }),
  },

  // ============================================================================
  // CMDB
  // ============================================================================
  servicenow_searchCMDB: {
    scope: 'read' as const,
    description:
      'Search the CMDB (cmdb_ci table) for configuration items. Optional `ciClass` narrows to a ' +
      'specific class (e.g. cmdb_ci_server, cmdb_ci_appl). Other params match servicenow_searchTickets.',
    schema: z.object({
      ...searchOptionsShape,
      ciClass: z
        .string()
        .optional()
        .describe(
          'CMDB class name to filter by (maps to sysparm_query=sys_class_name=<class>). ' +
            'Combined with `query` if both are provided.'
        ),
    }),
  },
  servicenow_getCMDBItem: {
    scope: 'read' as const,
    description:
      'Get a single CMDB configuration item by sys_id. By default queries the cmdb_ci table; pass ' +
      '`table` to query a specific CI class table directly (e.g. cmdb_ci_server).',
    schema: z.object({
      sys_id: z.string().describe('ServiceNow sys_id (32-char hex).'),
      table: z
        .string()
        .optional()
        .describe('Optional CMDB table to query (defaults to cmdb_ci).'),
      displayValue: z
        .union([z.boolean(), z.literal('all')])
        .optional()
        .describe('true (default) | false | "all".'),
    }),
  },

  // ============================================================================
  // Business units / companies
  // ============================================================================
  servicenow_listBusinessUnits: {
    scope: 'read' as const,
    description:
      'List business units. Tries the business_unit table first; falls back to core_company if ' +
      'business_unit is unavailable on this instance. Useful for catalog request enrichment.',
    schema: z.object({
      query: z
        .string()
        .optional()
        .describe('Optional sysparm_query to filter results (e.g. "name=Intralinks").'),
      limit: z.number().int().min(1).max(10000).optional().describe('Page size (default 1000).'),
      offset: z.number().int().min(0).optional().describe('Pagination offset (default 0).'),
      displayValue: z
        .union([z.boolean(), z.literal('all')])
        .optional()
        .describe('true (default) | false | "all".'),
    }),
  },

  // ============================================================================
  // Discovery helper
  // ============================================================================
  servicenow_listTables: {
    scope: 'read' as const,
    description:
      'List the ServiceNow tables this MCP service supports along with a short description. Static — ' +
      'does not call ServiceNow. Use this to discover what is queryable before issuing search/get calls.',
    schema: z.object({}),
  },
} as const;

export type ServiceNowToolName = keyof typeof servicenowSchemas;

export function getServiceNowSchema(name: ServiceNowToolName) {
  return servicenowSchemas[name];
}
