import { BaseHttpClient, notConfiguredError } from '../../shared';

/**
 * TestRail service configuration.
 */
export interface TestRailConfig {
  enabled: boolean;
  url: string;
  email: string;
  apiKey: string;
  scope?: 'read' | 'write';
}

/**
 * HTTP client for TestRail REST API.
 */
export class TestRailClient extends BaseHttpClient {
  private readonly config: TestRailConfig;

  constructor(config: TestRailConfig) {
    const url = config.url?.replace(/\/+$/, '') || '';

    super({
      baseUrl: `${url}/index.php?/api/v2`,
      serviceName: 'TestRail',
      getAuthHeaders: () => {
        const credentials = `${config.email}:${config.apiKey}`;
        return {
          'Authorization': `Basic ${btoa(credentials)}`,
        };
      },
    });

    this.config = config;
  }

  /**
   * Check if TestRail is properly configured.
   */
  isConfigured(): boolean {
    return this.config.enabled && !!(this.config.url && this.config.email && this.config.apiKey);
  }

  /**
   * Ensure TestRail is configured, throw if not.
   */
  private ensureConfigured(): void {
    if (!this.isConfigured()) {
      throw notConfiguredError('TestRail', ['url', 'email', 'apiKey']);
    }
  }

  // ============================================================================
  // Navigation
  // ============================================================================

  async getProjects(isCompleted?: boolean): Promise<unknown> {
    this.ensureConfigured();
    let endpoint = '/get_projects';
    if (isCompleted !== undefined) {
      endpoint += `&is_completed=${isCompleted ? 1 : 0}`;
    }
    const response = await this.get<unknown>(endpoint);
    const result = response.data;
    return Array.isArray(result) ? result : (result as { projects?: unknown[] })?.projects || result;
  }

  async getSuites(projectId: number): Promise<unknown> {
    this.ensureConfigured();
    const response = await this.get<unknown>(`/get_suites/${projectId}`);
    const result = response.data;
    return Array.isArray(result) ? result : (result as { suites?: unknown[] })?.suites || result;
  }

  async getSections(projectId: number, suiteId?: number): Promise<unknown> {
    this.ensureConfigured();
    let endpoint = `/get_sections/${projectId}`;
    if (suiteId !== undefined) {
      endpoint += `&suite_id=${suiteId}`;
    }
    const response = await this.get<unknown>(endpoint);
    const result = response.data;
    return Array.isArray(result) ? result : (result as { sections?: unknown[] })?.sections || result;
  }

  // ============================================================================
  // Test Cases - Read
  // ============================================================================

  async getCase(caseId: number): Promise<unknown> {
    this.ensureConfigured();
    const response = await this.get<unknown>(`/get_case/${caseId}`);
    return response.data;
  }

  async getCases(
    projectId: number,
    params?: {
      suiteId?: number;
      sectionId?: number;
      typeId?: number;
      priorityId?: number;
      limit?: number;
      offset?: number;
    }
  ): Promise<unknown> {
    this.ensureConfigured();
    const queryParams: string[] = [];
    if (params?.suiteId !== undefined) queryParams.push(`suite_id=${params.suiteId}`);
    if (params?.sectionId !== undefined) queryParams.push(`section_id=${params.sectionId}`);
    if (params?.typeId !== undefined) queryParams.push(`type_id=${params.typeId}`);
    if (params?.priorityId !== undefined) queryParams.push(`priority_id=${params.priorityId}`);
    if (params?.limit !== undefined) queryParams.push(`limit=${params.limit}`);
    if (params?.offset !== undefined) queryParams.push(`offset=${params.offset}`);

    let endpoint = `/get_cases/${projectId}`;
    if (queryParams.length > 0) {
      endpoint += '&' + queryParams.join('&');
    }

    const response = await this.get<unknown>(endpoint);
    const result = response.data;
    return Array.isArray(result) ? result : (result as { cases?: unknown[] })?.cases || result;
  }

  // ============================================================================
  // Test Cases - Write
  // ============================================================================

  async addCase(
    sectionId: number,
    params: {
      title: string;
      typeId?: number;
      priorityId?: number;
      estimate?: string;
      refs?: string;
      customPreconds?: string;
      customSteps?: string;
      customExpected?: string;
      customDisabled?: number;
      customFields?: Record<string, unknown>;
    }
  ): Promise<unknown> {
    this.ensureConfigured();
    const payload: Record<string, unknown> = { title: params.title };

    if (params.typeId !== undefined) payload.type_id = params.typeId;
    if (params.priorityId !== undefined) payload.priority_id = params.priorityId;
    if (params.estimate) payload.estimate = params.estimate;
    if (params.refs) payload.refs = params.refs;
    if (params.customPreconds) payload.custom_preconds = params.customPreconds;
    if (params.customSteps) payload.custom_steps = params.customSteps;
    if (params.customExpected) payload.custom_expected = params.customExpected;
    if (params.customDisabled !== undefined) payload.custom_disabled = params.customDisabled;

    if (params.customFields) {
      for (const [key, value] of Object.entries(params.customFields)) {
        const fieldName = key.startsWith('custom_') ? key : `custom_${key}`;
        payload[fieldName] = value;
      }
    }

    const response = await this.post<unknown>(`/add_case/${sectionId}`, payload);
    return response.data;
  }

  async updateCase(
    caseId: number,
    params: {
      title?: string;
      typeId?: number;
      priorityId?: number;
      estimate?: string;
      refs?: string;
      customPreconds?: string;
      customSteps?: string;
      customExpected?: string;
      customDisabled?: number;
      customFields?: Record<string, unknown>;
    }
  ): Promise<unknown> {
    this.ensureConfigured();
    const payload: Record<string, unknown> = {};

    if (params.title !== undefined) payload.title = params.title;
    if (params.typeId !== undefined) payload.type_id = params.typeId;
    if (params.priorityId !== undefined) payload.priority_id = params.priorityId;
    if (params.estimate !== undefined) payload.estimate = params.estimate;
    if (params.refs !== undefined) payload.refs = params.refs;
    if (params.customPreconds !== undefined) payload.custom_preconds = params.customPreconds;
    if (params.customSteps !== undefined) payload.custom_steps = params.customSteps;
    if (params.customExpected !== undefined) payload.custom_expected = params.customExpected;
    if (params.customDisabled !== undefined) payload.custom_disabled = params.customDisabled;

    if (params.customFields) {
      for (const [key, value] of Object.entries(params.customFields)) {
        const fieldName = key.startsWith('custom_') ? key : `custom_${key}`;
        payload[fieldName] = value;
      }
    }

    const response = await this.post<unknown>(`/update_case/${caseId}`, payload);
    return response.data;
  }

  // ============================================================================
  // Metadata
  // ============================================================================

  async getCaseTypes(): Promise<unknown> {
    this.ensureConfigured();
    const response = await this.get<unknown>('/get_case_types');
    return response.data;
  }

  async getCaseFields(): Promise<unknown> {
    this.ensureConfigured();
    const response = await this.get<unknown>('/get_case_fields');
    return response.data;
  }
}
