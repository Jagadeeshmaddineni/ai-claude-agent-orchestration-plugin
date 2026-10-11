import { BaseHttpClient, notConfiguredError } from '../../shared';

/**
 * SSC Cloud service configuration.
 */
export interface SscCloudConfig {
  enabled: boolean;
  url: string;
  apiKey: string;
}

/**
 * HTTP client for SS&C Cloud API v2.
 * READ-ONLY client - no mutation operations.
 */
export class SscCloudClient extends BaseHttpClient {
  private readonly config: SscCloudConfig;

  constructor(config: SscCloudConfig) {
    const baseUrl = (config.url || 'https://portal.ssnc-corp.cloud').replace(/\/+$/, '') + '/api/v2';

    super({
      baseUrl,
      serviceName: 'SSC Cloud',
      getAuthHeaders: () => ({ 'x-api-key': config.apiKey }),
    });

    this.config = config;
  }

  /**
   * Check if SSC Cloud is properly configured.
   */
  isConfigured(): boolean {
    return this.config.enabled && !!this.config.apiKey;
  }

  /**
   * Ensure SSC Cloud is configured, throw if not.
   */
  private ensureConfigured(): void {
    if (!this.isConfigured()) {
      throw notConfiguredError('SSC Cloud', ['apiKey']);
    }
  }

  // ============================================================================
  // IAM
  // ============================================================================

  async listRoles(projectId: string): Promise<unknown> {
    this.ensureConfigured();
    const response = await this.get('/iam/roles', { projectId });
    return response.data;
  }

  async getRole(roleId: string): Promise<unknown> {
    this.ensureConfigured();
    const response = await this.get(`/iam/roles/${roleId}`);
    return response.data;
  }

  async listMemberships(projectId: string): Promise<unknown> {
    this.ensureConfigured();
    const response = await this.get('/iam/memberships', { projectId });
    return response.data;
  }

  async listMembershipRules(projectId: string): Promise<unknown> {
    this.ensureConfigured();
    const response = await this.get('/iam/membership-rules', { projectId });
    return response.data;
  }

  // ============================================================================
  // Management
  // ============================================================================

  async listProjects(): Promise<unknown> {
    this.ensureConfigured();
    const response = await this.get('/management/projects');
    return response.data;
  }

  async getProject(projectId: string): Promise<unknown> {
    this.ensureConfigured();
    const response = await this.get(`/management/projects/${projectId}`);
    return response.data;
  }

  async listEnvironments(projectId: string): Promise<unknown> {
    this.ensureConfigured();
    const response = await this.get(`/management/projects/${projectId}/environments`);
    return response.data;
  }

  // ============================================================================
  // Kubernetes
  // ============================================================================

  async listKubernetesClusters(projectId?: string): Promise<unknown> {
    this.ensureConfigured();
    const params = projectId ? { projectId } : undefined;
    const response = await this.get('/kubernetes/clusters', params);
    return response.data;
  }

  async getKubernetesCluster(clusterId: string): Promise<unknown> {
    this.ensureConfigured();
    const response = await this.get(`/kubernetes/clusters/${clusterId}`);
    return response.data;
  }

  async listKubernetesNamespaces(clusterId: string): Promise<unknown> {
    this.ensureConfigured();
    const response = await this.get(`/kubernetes/clusters/${clusterId}/namespaces`);
    return response.data;
  }

  async listKubernetesVersions(): Promise<unknown> {
    this.ensureConfigured();
    const response = await this.get('/kubernetes/versions');
    return response.data;
  }

  // ============================================================================
  // Security
  // ============================================================================

  async listSecurityGroups(projectId?: string): Promise<unknown> {
    this.ensureConfigured();
    const params = projectId ? { projectId } : undefined;
    const response = await this.get('/security/security-groups', params);
    return response.data;
  }

  async getSecurityGroup(securityGroupId: string): Promise<unknown> {
    this.ensureConfigured();
    const response = await this.get(`/security/security-groups/${securityGroupId}`);
    return response.data;
  }

  async getSecurityGroupRules(securityGroupId: string): Promise<unknown> {
    this.ensureConfigured();
    const response = await this.get(`/security/security-groups/${securityGroupId}/rules`);
    return response.data;
  }

  async listFirewallRules(projectId?: string): Promise<unknown> {
    this.ensureConfigured();
    const params = projectId ? { projectId } : undefined;
    const response = await this.get('/security/firewall-rules', params);
    return response.data;
  }

  // ============================================================================
  // Compute
  // ============================================================================

  async listComputeInstances(projectId?: string): Promise<unknown> {
    this.ensureConfigured();
    const params = projectId ? { projectId } : undefined;
    const response = await this.get('/compute/instances', params);
    return response.data;
  }

  async getComputeInstance(instanceId: string): Promise<unknown> {
    this.ensureConfigured();
    const response = await this.get(`/compute/instances/${instanceId}`);
    return response.data;
  }

  // ============================================================================
  // Storage
  // ============================================================================

  async listStorage(projectId?: string): Promise<unknown> {
    this.ensureConfigured();
    const params = projectId ? { projectId } : undefined;
    const response = await this.get('/storage', params);
    return response.data;
  }

  async getStorage(storageId: string): Promise<unknown> {
    this.ensureConfigured();
    const response = await this.get(`/storage/${storageId}`);
    return response.data;
  }

  // ============================================================================
  // Network
  // ============================================================================

  async listLoadBalancers(projectId?: string): Promise<unknown> {
    this.ensureConfigured();
    const params = projectId ? { projectId } : undefined;
    const response = await this.get('/network/load-balancers', params);
    return response.data;
  }

  async getLoadBalancer(loadBalancerId: string): Promise<unknown> {
    this.ensureConfigured();
    const response = await this.get(`/network/load-balancers/${loadBalancerId}`);
    return response.data;
  }

  async listCertificates(projectId?: string): Promise<unknown> {
    this.ensureConfigured();
    const params = projectId ? { projectId } : undefined;
    const response = await this.get('/network/certificates', params);
    return response.data;
  }

  async getCertificate(certificateId: string): Promise<unknown> {
    this.ensureConfigured();
    const response = await this.get(`/network/certificates/${certificateId}`);
    return response.data;
  }

  async listDnsRecords(projectId?: string): Promise<unknown> {
    this.ensureConfigured();
    const params = projectId ? { projectId } : undefined;
    const response = await this.get('/network/dns', params);
    return response.data;
  }

  // ============================================================================
  // CMDB
  // ============================================================================

  async listCmdbItems(projectId?: string): Promise<unknown> {
    this.ensureConfigured();
    const params = projectId ? { projectId } : undefined;
    const response = await this.get('/cmdb/items', params);
    return response.data;
  }

  async getCmdbItem(itemId: string): Promise<unknown> {
    this.ensureConfigured();
    const response = await this.get(`/cmdb/items/${itemId}`);
    return response.data;
  }

  // ============================================================================
  // Audit
  // ============================================================================

  async listAuditLogs(projectId?: string, limit?: number): Promise<unknown> {
    this.ensureConfigured();
    const params: Record<string, string> = {};
    if (projectId) params.projectId = projectId;
    if (limit) params.limit = String(limit);
    const response = await this.get('/audit/logs', Object.keys(params).length ? params : undefined);
    return response.data;
  }

  // ============================================================================
  // Alerting
  // ============================================================================

  async listAlertConfigs(projectId?: string): Promise<unknown> {
    this.ensureConfigured();
    const params = projectId ? { projectId } : undefined;
    const response = await this.get('/alerting/configs', params);
    return response.data;
  }

  // ============================================================================
  // Artifactory
  // ============================================================================

  async listArtifactoryRepos(projectId?: string): Promise<unknown> {
    this.ensureConfigured();
    const params = projectId ? { projectId } : undefined;
    const response = await this.get('/artifactory/repos', params);
    return response.data;
  }

  // ============================================================================
  // Deployments
  // ============================================================================

  async listDeployments(projectId?: string): Promise<unknown> {
    this.ensureConfigured();
    const params = projectId ? { projectId } : undefined;
    const response = await this.get('/deployments', params);
    return response.data;
  }

  async getDeployment(deploymentId: string): Promise<unknown> {
    this.ensureConfigured();
    const response = await this.get(`/deployments/${deploymentId}`);
    return response.data;
  }

  // ============================================================================
  // Resources
  // ============================================================================

  async listResources(projectId?: string, type?: string): Promise<unknown> {
    this.ensureConfigured();
    const params: Record<string, string> = {};
    if (projectId) params.projectId = projectId;
    if (type) params.type = type;
    const response = await this.get('/resources', Object.keys(params).length ? params : undefined);
    return response.data;
  }

  // ============================================================================
  // Tags
  // ============================================================================

  async listTags(projectId?: string): Promise<unknown> {
    this.ensureConfigured();
    const params = projectId ? { projectId } : undefined;
    const response = await this.get('/tags', params);
    return response.data;
  }
}
