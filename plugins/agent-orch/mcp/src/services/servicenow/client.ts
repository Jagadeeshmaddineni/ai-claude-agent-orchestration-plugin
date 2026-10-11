import { BaseHttpClient, MCPError, notConfiguredError } from '../../shared';
import { handleApiError } from '../../shared/errors/mcp-error';

/**
 * ServiceNow service configuration.
 *
 * Authentication uses HTTP Basic auth: ServiceNow does not expose API tokens
 * the way Jira/Atlassian Cloud does. Provide the user's ServiceNow username
 * and password via JSON config (preferred) or SNOW_USER/SNOW_PASS env vars.
 */
export interface ServiceNowConfig {
  enabled: boolean;
  /** Instance URL (e.g. https://ssctech.service-now.com). No trailing slash required. */
  url: string;
  username: string;
  password: string;
  scope?: 'read' | 'write';
}

/** ServiceNow Table API max page size. */
const SNOW_MAX_LIMIT = 10000;
const SNOW_DEFAULT_LIMIT = 1000;

/**
 * Options shared by every searchTable call.
 */
export interface ServiceNowSearchOptions {
  /** Optional encoded `sysparm_query` string (e.g. `state=3^assignment_groupLIKEDDQ`). */
  query?: string;
  /** Optional list of fields to project (sysparm_fields). */
  fields?: string[];
  /** Page size, default 1000, hard-clamped to ServiceNow max 10000. */
  limit?: number;
  /** Offset, default 0. */
  offset?: number;
  /**
   * If true (default), reference fields are returned as human-readable display
   * values. If false, raw sys_ids/system values are returned. Pass `'all'` to
   * receive both.
   */
  displayValue?: boolean | 'all';
}

export interface ServiceNowTableResponse<T = Record<string, unknown>> {
  result: T[];
}

export interface ServiceNowSingleResponse<T = Record<string, unknown>> {
  result: T;
}

/**
 * HTTP client for the ServiceNow Table API (`/api/now/table/<name>`).
 *
 * v1 is intentionally read-only — only GET requests are exposed. The tool
 * registry filters write tools out by default; even if a write tool were
 * added later, the service-level scope check would still gate it.
 */
export class ServiceNowClient extends BaseHttpClient {
  private readonly snowConfig: ServiceNowConfig;

  constructor(config: ServiceNowConfig) {
    const baseUrl = (config.url || '').replace(/\/+$/, '');

    super({
      baseUrl,
      serviceName: 'ServiceNow',
      getAuthHeaders: () => {
        // Build Basic auth header at request time so credentials never live
        // outside the closure. Use Buffer (Node/Bun) for base64 encoding.
        const token = Buffer.from(`${config.username}:${config.password}`).toString('base64');
        return { Authorization: `Basic ${token}` };
      },
    });

    this.snowConfig = config;
  }

  isConfigured(): boolean {
    if (!this.snowConfig.enabled) return false;
    return !!(this.snowConfig.url && this.snowConfig.username && this.snowConfig.password);
  }

  private ensureConfigured(): void {
    if (!this.isConfigured()) {
      throw notConfiguredError('ServiceNow', ['url', 'username', 'password']);
    }
  }

  /**
   * Convert an MCP-friendly options bag into ServiceNow query-string params.
   * Defaults `sysparm_display_value=true` because human-readable values are
   * what callers want 95% of the time (per ddq-tools experience).
   */
  private buildSearchParams(options: ServiceNowSearchOptions): Record<string, string> {
    const params: Record<string, string> = {};

    if (options.query) params.sysparm_query = options.query;
    if (options.fields?.length) params.sysparm_fields = options.fields.join(',');

    const limit = Math.min(options.limit ?? SNOW_DEFAULT_LIMIT, SNOW_MAX_LIMIT);
    params.sysparm_limit = String(limit);

    if (options.offset !== undefined && options.offset > 0) {
      params.sysparm_offset = String(options.offset);
    }

    // displayValue: undefined -> default true; false -> 'false'; 'all' -> 'all'
    if (options.displayValue === false) {
      params.sysparm_display_value = 'false';
    } else if (options.displayValue === 'all') {
      params.sysparm_display_value = 'all';
    } else {
      params.sysparm_display_value = 'true';
    }

    // Always exclude reference link blobs unless callers explicitly want them.
    params.sysparm_exclude_reference_link = 'true';

    return params;
  }

  /**
   * Generic Table API search. Returns up to `limit` records starting at
   * `offset`. Callers paginate by re-calling with a larger offset. We do
   * NOT auto-paginate inside this client — Table API responses can be huge
   * and the MCP layer should let the LLM control the page size.
   */
  async searchTable<T = Record<string, unknown>>(
    table: string,
    options: ServiceNowSearchOptions = {}
  ): Promise<ServiceNowTableResponse<T>> {
    this.ensureConfigured();
    const params = this.buildSearchParams(options);
    try {
      const response = await this.get<ServiceNowTableResponse<T>>(
        `/api/now/table/${encodeURIComponent(table)}`,
        params
      );
      return response.data;
    } catch (err) {
      this.rethrowWithSnowHint(err, `GET /api/now/table/${table}`);
    }
  }

  /**
   * Get a single record by sys_id from a table.
   */
  async getRecord<T = Record<string, unknown>>(
    table: string,
    sysId: string,
    displayValue: boolean | 'all' = true
  ): Promise<T> {
    this.ensureConfigured();
    const params: Record<string, string> = {
      sysparm_display_value: displayValue === 'all' ? 'all' : displayValue ? 'true' : 'false',
      sysparm_exclude_reference_link: 'true',
    };
    try {
      const response = await this.get<ServiceNowSingleResponse<T>>(
        `/api/now/table/${encodeURIComponent(table)}/${encodeURIComponent(sysId)}`,
        params
      );
      return response.data.result;
    } catch (err) {
      this.rethrowWithSnowHint(err, `GET /api/now/table/${table}/${sysId}`);
    }
  }

  /**
   * Look up a single record by its human-readable `number` field
   * (e.g. SCTASK0012345, INC0098765). Returns the first match or null.
   */
  async getRecordByNumber<T = Record<string, unknown>>(
    table: string,
    number: string,
    displayValue: boolean | 'all' = true
  ): Promise<T | null> {
    const response = await this.searchTable<T>(table, {
      query: `number=${number}`,
      limit: 1,
      displayValue,
    });
    return response.result[0] ?? null;
  }

  /**
   * Replace generic AUTH_FAILED messages with ServiceNow-specific guidance
   * so users immediately know which env vars to check.
   */
  private rethrowWithSnowHint(err: unknown, context: string): never {
    if (err instanceof MCPError && err.code === 'AUTH_FAILED') {
      const friendly =
        err.statusCode === 403
          ? 'ServiceNow forbidden — check user permissions / table access'
          : 'ServiceNow authentication failed — check SNOW_USER / SNOW_PASS';
      throw new MCPError(
        'ServiceNow',
        'AUTH_FAILED',
        `${friendly} (${context})`,
        'Verify the credentials configured in mcp-config.json or SNOW_USER/SNOW_PASS env vars are correct and that the user has read access to the target table.',
        err.statusCode
      );
    }
    throw err;
  }
}
