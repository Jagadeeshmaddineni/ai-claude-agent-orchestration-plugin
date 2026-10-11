import { IToolService, ToolDefinition, ToolScope, toolNotFoundError } from '../../shared';
import { SscCloudClient, SscCloudConfig } from './client';
import { sscCloudSchemas, SscCloudToolName } from './schemas';
import { getSscCloudToolsByScope } from './tools';

/**
 * SSC Cloud tool service implementing IToolService interface.
 */
export class SscCloudService implements IToolService {
  readonly serviceName = 'ssccloud';

  private readonly client: SscCloudClient;
  private readonly scope: ToolScope;

  constructor(config: SscCloudConfig) {
    this.client = new SscCloudClient(config);
    // SSC Cloud is always read-only
    this.scope = 'read';
  }

  isConfigured(): boolean {
    return this.client.isConfigured();
  }

  getTools(): ToolDefinition[] {
    return getSscCloudToolsByScope(this.scope);
  }

  async executeTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    // Validate tool exists
    if (!(toolName in sscCloudSchemas)) {
      throw toolNotFoundError(this.serviceName, toolName);
    }

    // Parse and validate args
    const schema = sscCloudSchemas[toolName as SscCloudToolName].schema;
    const parsed = schema.parse(args);

    // Execute tool
    switch (toolName) {
      // Management
      case 'ssccloud_listProjects':
        return this.client.listProjects();

      case 'ssccloud_getProject':
        return this.client.getProject(parsed.projectId);

      case 'ssccloud_listEnvironments':
        return this.client.listEnvironments(parsed.projectId);

      // IAM
      case 'ssccloud_listRoles':
        return this.client.listRoles(parsed.projectId);

      case 'ssccloud_getRole':
        return this.client.getRole(parsed.roleId);

      case 'ssccloud_listMemberships':
        return this.client.listMemberships(parsed.projectId);

      case 'ssccloud_listMembershipRules':
        return this.client.listMembershipRules(parsed.projectId);

      // Kubernetes
      case 'ssccloud_listKubernetesClusters':
        return this.client.listKubernetesClusters(parsed.projectId);

      case 'ssccloud_getKubernetesCluster':
        return this.client.getKubernetesCluster(parsed.clusterId);

      case 'ssccloud_listKubernetesNamespaces':
        return this.client.listKubernetesNamespaces(parsed.clusterId);

      case 'ssccloud_listKubernetesVersions':
        return this.client.listKubernetesVersions();

      // Security
      case 'ssccloud_listSecurityGroups':
        return this.client.listSecurityGroups(parsed.projectId);

      case 'ssccloud_getSecurityGroup':
        return this.client.getSecurityGroup(parsed.securityGroupId);

      case 'ssccloud_getSecurityGroupRules':
        return this.client.getSecurityGroupRules(parsed.securityGroupId);

      case 'ssccloud_listFirewallRules':
        return this.client.listFirewallRules(parsed.projectId);

      // Compute
      case 'ssccloud_listComputeInstances':
        return this.client.listComputeInstances(parsed.projectId);

      case 'ssccloud_getComputeInstance':
        return this.client.getComputeInstance(parsed.instanceId);

      // Storage
      case 'ssccloud_listStorage':
        return this.client.listStorage(parsed.projectId);

      case 'ssccloud_getStorage':
        return this.client.getStorage(parsed.storageId);

      // Network
      case 'ssccloud_listLoadBalancers':
        return this.client.listLoadBalancers(parsed.projectId);

      case 'ssccloud_getLoadBalancer':
        return this.client.getLoadBalancer(parsed.loadBalancerId);

      case 'ssccloud_listCertificates':
        return this.client.listCertificates(parsed.projectId);

      case 'ssccloud_getCertificate':
        return this.client.getCertificate(parsed.certificateId);

      case 'ssccloud_listDnsRecords':
        return this.client.listDnsRecords(parsed.projectId);

      // CMDB
      case 'ssccloud_listCmdbItems':
        return this.client.listCmdbItems(parsed.projectId);

      case 'ssccloud_getCmdbItem':
        return this.client.getCmdbItem(parsed.itemId);

      // Audit
      case 'ssccloud_listAuditLogs':
        return this.client.listAuditLogs(parsed.projectId, parsed.limit);

      // Alerting
      case 'ssccloud_listAlertConfigs':
        return this.client.listAlertConfigs(parsed.projectId);

      // Artifactory
      case 'ssccloud_listArtifactoryRepos':
        return this.client.listArtifactoryRepos(parsed.projectId);

      // Deployments
      case 'ssccloud_listDeployments':
        return this.client.listDeployments(parsed.projectId);

      case 'ssccloud_getDeployment':
        return this.client.getDeployment(parsed.deploymentId);

      // Resources
      case 'ssccloud_listResources':
        return this.client.listResources(parsed.projectId, parsed.type);

      // Tags
      case 'ssccloud_listTags':
        return this.client.listTags(parsed.projectId);

      default:
        throw toolNotFoundError(this.serviceName, toolName);
    }
  }
}
