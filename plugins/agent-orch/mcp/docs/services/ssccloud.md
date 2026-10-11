# SS&C Cloud

[< Back to docs hub](../README.md) | [< Back to MCP README](../../README.md)

Read-only view into the SS&C private cloud — projects, IAM, Kubernetes, security,
compute, storage, network, CMDB, audit, alerting, deployments, and tags.
**33 tools, all read-only.**

## Overview

Every SS&C Cloud tool is tagged `scope: 'read'` and the service exposes **no `scope`
field** — it is read-only by design. There is no way to mutate cloud resources
through this service.

## Configuration

```json
{
  "sscCloud": {
    "enabled": true,
    "url": "https://portal.ssnc-corp.cloud",
    "apiKey": "YOUR_SSC_CLOUD_API_KEY"
  }
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `enabled` | yes | Register this service's tools |
| `url` | no | Portal URL (default `https://portal.ssnc-corp.cloud`) |
| `apiKey` | yes | SS&C Cloud API key |

> Note the config key is **`sscCloud`** (camelCase) in `mcp-config.json`, while the
> SSE endpoint and Claude Code registration key is **`ssccloud`** (lowercase).

## Tools

| Tool | Scope | Description |
|------|-------|-------------|
| `ssccloud_listProjects` | read | List all accessible projects. |
| `ssccloud_getProject` | read | Get details about a specific project. |
| `ssccloud_listEnvironments` | read | List environments (dev, staging, prod) for a project. |
| `ssccloud_listRoles` | read | List IAM roles for a project. |
| `ssccloud_getRole` | read | Get details about a specific IAM role. |
| `ssccloud_listMemberships` | read | List user memberships and role assignments. |
| `ssccloud_listMembershipRules` | read | List automatic role-assignment rules. |
| `ssccloud_listKubernetesClusters` | read | List Kubernetes clusters (optionally by project). |
| `ssccloud_getKubernetesCluster` | read | Get details about a specific cluster. |
| `ssccloud_listKubernetesNamespaces` | read | List namespaces in a cluster. |
| `ssccloud_listKubernetesVersions` | read | List available Kubernetes versions. |
| `ssccloud_listSecurityGroups` | read | List security groups. |
| `ssccloud_getSecurityGroup` | read | Get details about a security group. |
| `ssccloud_getSecurityGroupRules` | read | Get ingress/egress rules for a security group. |
| `ssccloud_listFirewallRules` | read | List firewall rules. |
| `ssccloud_listComputeInstances` | read | List compute instances (VMs). |
| `ssccloud_getComputeInstance` | read | Get details about a compute instance. |
| `ssccloud_listStorage` | read | List storage resources (volumes, buckets). |
| `ssccloud_getStorage` | read | Get details about a storage resource. |
| `ssccloud_listLoadBalancers` | read | List load balancers. |
| `ssccloud_getLoadBalancer` | read | Get details about a load balancer. |
| `ssccloud_listCertificates` | read | List SSL/TLS certificates. |
| `ssccloud_getCertificate` | read | Get details about a certificate. |
| `ssccloud_listDnsRecords` | read | List DNS records. |
| `ssccloud_listCmdbItems` | read | List CMDB items (asset inventory). |
| `ssccloud_getCmdbItem` | read | Get details about a CMDB item. |
| `ssccloud_listAuditLogs` | read | List audit logs. |
| `ssccloud_listAlertConfigs` | read | List alert configurations. |
| `ssccloud_listArtifactoryRepos` | read | List Artifactory repositories. |
| `ssccloud_listDeployments` | read | List deployments. |
| `ssccloud_getDeployment` | read | Get details about a deployment. |
| `ssccloud_listResources` | read | List cloud resources by type. |
| `ssccloud_listTags` | read | List tags (labels) used in the cloud. |

## Scope behaviour

There is no `scope` setting — all 33 tools are read-only and always register when the
service is enabled.
