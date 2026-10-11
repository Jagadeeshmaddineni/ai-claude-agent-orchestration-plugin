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
 * SSC Cloud tool schemas with scope tagging.
 * All tools are READ-ONLY (scope: 'read').
 */
export const sscCloudSchemas = {
  // ============================================================================
  // Management - Projects & Environments
  // ============================================================================
  ssccloud_listProjects: {
    scope: 'read' as const,
    description: 'List all SS&C Cloud projects accessible to the current user. Returns project IDs, names, and metadata. Use this first to discover available projects.',
    schema: z.object({}),
  },
  ssccloud_getProject: {
    scope: 'read' as const,
    description: 'Get detailed information about a specific SS&C Cloud project including description, owner, and configuration. Use ssccloud_listProjects to find project IDs first.',
    schema: z.object({
      projectId: z.string().describe('The project ID'),
    }),
  },
  ssccloud_listEnvironments: {
    scope: 'read' as const,
    description: 'List all environments (dev, staging, prod) for an SS&C Cloud project. Returns environment names, statuses, and configurations.',
    schema: z.object({
      projectId: z.string().describe('The project ID'),
    }),
  },

  // ============================================================================
  // IAM - Roles & Memberships
  // ============================================================================
  ssccloud_listRoles: {
    scope: 'read' as const,
    description: 'List all IAM roles for an SS&C Cloud project. Returns role names, permissions, and descriptions. Use for access control auditing.',
    schema: z.object({
      projectId: z.string().describe('The project ID'),
    }),
  },
  ssccloud_getRole: {
    scope: 'read' as const,
    description: 'Get detailed information about a specific IAM role including permissions, bindings, and policy details.',
    schema: z.object({
      roleId: z.string().describe('The role ID'),
    }),
  },
  ssccloud_listMemberships: {
    scope: 'read' as const,
    description: 'List all user memberships and role assignments for an SS&C Cloud project. Shows who has what access.',
    schema: z.object({
      projectId: z.string().describe('The project ID'),
    }),
  },
  ssccloud_listMembershipRules: {
    scope: 'read' as const,
    description: 'List membership rules (automatic role assignment policies) for an SS&C Cloud project.',
    schema: z.object({
      projectId: z.string().describe('The project ID'),
    }),
  },

  // ============================================================================
  // Kubernetes
  // ============================================================================
  ssccloud_listKubernetesClusters: {
    scope: 'read' as const,
    description: 'List Kubernetes clusters in SS&C Cloud. Optionally filter by project. Returns cluster names, versions, node counts, and statuses.',
    schema: z.object({
      projectId: z.string().optional().describe('Filter by project ID (optional)'),
    }),
  },
  ssccloud_getKubernetesCluster: {
    scope: 'read' as const,
    description: 'Get detailed information about a specific Kubernetes cluster including node pools, network configuration, and add-ons.',
    schema: z.object({
      clusterId: z.string().describe('The cluster ID'),
    }),
  },
  ssccloud_listKubernetesNamespaces: {
    scope: 'read' as const,
    description: 'List all namespaces in a specific Kubernetes cluster. Returns namespace names, resource quotas, and labels.',
    schema: z.object({
      clusterId: z.string().describe('The cluster ID'),
    }),
  },
  ssccloud_listKubernetesVersions: {
    scope: 'read' as const,
    description: 'List available Kubernetes versions in SS&C Cloud. Use for upgrade planning.',
    schema: z.object({}),
  },

  // ============================================================================
  // Security
  // ============================================================================
  ssccloud_listSecurityGroups: {
    scope: 'read' as const,
    description: 'List security groups in SS&C Cloud. Optionally filter by project. Returns group names, descriptions, and rule counts.',
    schema: z.object({
      projectId: z.string().optional().describe('Filter by project ID (optional)'),
    }),
  },
  ssccloud_getSecurityGroup: {
    scope: 'read' as const,
    description: 'Get detailed information about a specific security group including description and metadata. Use ssccloud_getSecurityGroupRules to see the actual rules.',
    schema: z.object({
      securityGroupId: z.string().describe('The security group ID'),
    }),
  },
  ssccloud_getSecurityGroupRules: {
    scope: 'read' as const,
    description: 'Get all ingress and egress rules for a security group. Shows allowed protocols, ports, and source/destination IP ranges.',
    schema: z.object({
      securityGroupId: z.string().describe('The security group ID'),
    }),
  },
  ssccloud_listFirewallRules: {
    scope: 'read' as const,
    description: 'List firewall rules in SS&C Cloud. Optionally filter by project. Returns rule definitions, priorities, and targets.',
    schema: z.object({
      projectId: z.string().optional().describe('Filter by project ID (optional)'),
    }),
  },

  // ============================================================================
  // Compute
  // ============================================================================
  ssccloud_listComputeInstances: {
    scope: 'read' as const,
    description: 'List compute instances (VMs) in SS&C Cloud. Optionally filter by project. Returns instance names, types, statuses, and IP addresses.',
    schema: z.object({
      projectId: z.string().optional().describe('Filter by project ID (optional)'),
    }),
  },
  ssccloud_getComputeInstance: {
    scope: 'read' as const,
    description: 'Get detailed information about a specific compute instance including CPU, memory, disks, network interfaces, and metadata.',
    schema: z.object({
      instanceId: z.string().describe('The instance ID'),
    }),
  },

  // ============================================================================
  // Storage
  // ============================================================================
  ssccloud_listStorage: {
    scope: 'read' as const,
    description: 'List storage resources (volumes, buckets) in SS&C Cloud. Optionally filter by project. Returns storage names, sizes, and types.',
    schema: z.object({
      projectId: z.string().optional().describe('Filter by project ID (optional)'),
    }),
  },
  ssccloud_getStorage: {
    scope: 'read' as const,
    description: 'Get detailed information about a specific storage resource including capacity, usage, encryption status, and attachments.',
    schema: z.object({
      storageId: z.string().describe('The storage resource ID'),
    }),
  },

  // ============================================================================
  // Network
  // ============================================================================
  ssccloud_listLoadBalancers: {
    scope: 'read' as const,
    description: 'List load balancers in SS&C Cloud. Optionally filter by project. Returns load balancer names, types, IPs, and backend pool info.',
    schema: z.object({
      projectId: z.string().optional().describe('Filter by project ID (optional)'),
    }),
  },
  ssccloud_getLoadBalancer: {
    scope: 'read' as const,
    description: 'Get detailed information about a specific load balancer including health checks, SSL config, and backend targets.',
    schema: z.object({
      loadBalancerId: z.string().describe('The load balancer ID'),
    }),
  },
  ssccloud_listCertificates: {
    scope: 'read' as const,
    description: 'List SSL/TLS certificates in SS&C Cloud. Optionally filter by project. Returns certificate names, expiration dates, and domains.',
    schema: z.object({
      projectId: z.string().optional().describe('Filter by project ID (optional)'),
    }),
  },
  ssccloud_getCertificate: {
    scope: 'read' as const,
    description: 'Get detailed information about a specific certificate including issuer, validity period, SANs, and usage locations.',
    schema: z.object({
      certificateId: z.string().describe('The certificate ID'),
    }),
  },
  ssccloud_listDnsRecords: {
    scope: 'read' as const,
    description: 'List DNS records in SS&C Cloud. Optionally filter by project. Returns record names, types, values, and TTLs.',
    schema: z.object({
      projectId: z.string().optional().describe('Filter by project ID (optional)'),
    }),
  },

  // ============================================================================
  // CMDB
  // ============================================================================
  ssccloud_listCmdbItems: {
    scope: 'read' as const,
    description: 'List Configuration Management Database (CMDB) items. Optionally filter by project. Returns asset inventory with types and relationships.',
    schema: z.object({
      projectId: z.string().optional().describe('Filter by project ID (optional)'),
    }),
  },
  ssccloud_getCmdbItem: {
    scope: 'read' as const,
    description: 'Get detailed information about a specific CMDB item including configuration, dependencies, and change history.',
    schema: z.object({
      itemId: z.string().describe('The CMDB item ID'),
    }),
  },

  // ============================================================================
  // Audit
  // ============================================================================
  ssccloud_listAuditLogs: {
    scope: 'read' as const,
    description: 'List audit logs for SS&C Cloud operations. Optionally filter by project and limit results. Returns timestamps, users, actions, and resources.',
    schema: z.object({
      projectId: z.string().optional().describe('Filter by project ID (optional)'),
      limit: z.number().optional().describe('Maximum number of logs to return (default: 100)'),
    }),
  },

  // ============================================================================
  // Alerting
  // ============================================================================
  ssccloud_listAlertConfigs: {
    scope: 'read' as const,
    description: 'List alert configurations in SS&C Cloud. Optionally filter by project. Returns alert rules, thresholds, and notification channels.',
    schema: z.object({
      projectId: z.string().optional().describe('Filter by project ID (optional)'),
    }),
  },

  // ============================================================================
  // Artifactory
  // ============================================================================
  ssccloud_listArtifactoryRepos: {
    scope: 'read' as const,
    description: 'List Artifactory repositories in SS&C Cloud. Optionally filter by project. Returns repo names, types, and package counts.',
    schema: z.object({
      projectId: z.string().optional().describe('Filter by project ID (optional)'),
    }),
  },

  // ============================================================================
  // Deployments
  // ============================================================================
  ssccloud_listDeployments: {
    scope: 'read' as const,
    description: 'List deployments in SS&C Cloud. Optionally filter by project. Returns deployment names, statuses, versions, and timestamps.',
    schema: z.object({
      projectId: z.string().optional().describe('Filter by project ID (optional)'),
    }),
  },
  ssccloud_getDeployment: {
    scope: 'read' as const,
    description: 'Get detailed information about a specific deployment including configuration, rollout status, and history.',
    schema: z.object({
      deploymentId: z.string().describe('The deployment ID'),
    }),
  },

  // ============================================================================
  // Resources
  // ============================================================================
  ssccloud_listResources: {
    scope: 'read' as const,
    description: 'List cloud resources by type. Optionally filter by project and resource type. Returns a unified view of all resources.',
    schema: z.object({
      projectId: z.string().optional().describe('Filter by project ID (optional)'),
      type: z.string().optional().describe('Filter by resource type (e.g., "vm", "lb", "storage")'),
    }),
  },

  // ============================================================================
  // Tags
  // ============================================================================
  ssccloud_listTags: {
    scope: 'read' as const,
    description: 'List tags (labels) used in SS&C Cloud. Optionally filter by project. Returns tag keys, values, and resource associations.',
    schema: z.object({
      projectId: z.string().optional().describe('Filter by project ID (optional)'),
    }),
  },
} as const;

/**
 * Type for SSC Cloud tool names.
 */
export type SscCloudToolName = keyof typeof sscCloudSchemas;

/**
 * Get the Zod schema for a specific tool.
 */
export function getSscCloudSchema(toolName: SscCloudToolName) {
  return sscCloudSchemas[toolName].schema;
}
