import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export type ToolScope = 'read' | 'write';

export interface JiraConfig {
  enabled: boolean;
  deploymentType: 'cloud' | 'datacenter';
  host: string;
  token: string;
  /** @deprecated Use `host` instead. Kept for backwards compatibility. */
  siteName?: string;
  email?: string;
  /** @deprecated Use `token` instead. Kept for backwards compatibility. */
  apiToken?: string;
  scope?: ToolScope;
}

export interface ConfluenceConfig {
  enabled: boolean;
  deploymentType: 'cloud' | 'datacenter';
  host: string;
  token: string;
  /** @deprecated Use `host` instead. Kept for backwards compatibility. */
  siteName?: string;
  email?: string;
  /** @deprecated Use `token` instead. Kept for backwards compatibility. */
  apiToken?: string;
  scope?: ToolScope;
}

export interface TestRailConfig {
  enabled: boolean;
  url: string;
  email: string;
  apiKey: string;
  scope?: ToolScope;
}

export interface AzureDevOpsConfig {
  enabled: boolean;
  baseUrl: string;
  organizations: Record<string, { name: string; token: string }>;
  scope?: ToolScope;
}

export interface PlaywrightConfig {
  enabled: boolean;
  headless: boolean;
  browserType: 'chromium' | 'firefox' | 'webkit';
  defaultTimeout: number;
  screenshotDir: string;
  scope?: ToolScope;
}

export interface SonarQubeConfig {
  enabled: boolean;
  url: string;
  token: string;
  organization?: string;
  scope?: ToolScope;
}

export interface SscCloudConfig {
  enabled: boolean;
  url: string;
  apiKey: string;
}

export interface ServiceNowConfig {
  enabled: boolean;
  url: string;
  username: string;
  password: string;
  scope?: ToolScope;
}

export interface Config {
  port: number;
  logging: boolean;
  jira: JiraConfig;
  confluence: ConfluenceConfig;
  testrail: TestRailConfig;
  azureDevOps: AzureDevOpsConfig;
  playwright: PlaywrightConfig;
  sonarqube: SonarQubeConfig;
  sscCloud: SscCloudConfig;
  serviceNow: ServiceNowConfig;
}

// JSON config file structure
interface JsonConfig {
  port?: number;
  logging?: boolean;
  jira?: {
    enabled?: boolean;
    deploymentType?: 'cloud' | 'datacenter';
    host?: string;
    token?: string;
    /** @deprecated Use `host` instead. */
    siteName?: string;
    email?: string;
    /** @deprecated Use `token` instead. */
    apiToken?: string;
    scope?: ToolScope;
  };
  confluence?: {
    enabled?: boolean;
    deploymentType?: 'cloud' | 'datacenter';
    host?: string;
    token?: string;
    /** @deprecated Use `host` instead. */
    siteName?: string;
    email?: string;
    /** @deprecated Use `token` instead. */
    apiToken?: string;
    scope?: ToolScope;
  };
  testrail?: {
    enabled?: boolean;
    url?: string;
    email?: string;
    apiKey?: string;
    scope?: ToolScope;
  };
  azureDevOps?: {
    enabled?: boolean;
    baseUrl?: string;
    organizations?: Record<string, { name: string; token: string }>;
    scope?: ToolScope;
  };
  playwright?: {
    enabled?: boolean;
    headless?: boolean;
    browserType?: 'chromium' | 'firefox' | 'webkit';
    defaultTimeout?: number;
    screenshotDir?: string;
    scope?: ToolScope;
  };
  sonarqube?: {
    enabled?: boolean;
    url?: string;
    token?: string;
    organization?: string;
    scope?: ToolScope;
  };
  sscCloud?: {
    enabled?: boolean;
    url?: string;
    apiKey?: string;
  };
  servicenow?: {
    enabled?: boolean;
    url?: string;
    username?: string;
    password?: string;
    scope?: ToolScope;
  };
}

function getClineSettingsDir(): string {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  const platform = process.platform;

  if (platform === 'win32') {
    return join(process.env.APPDATA || join(home, 'AppData', 'Roaming'),
      'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings');
  } else if (platform === 'darwin') {
    return join(home, 'Library', 'Application Support',
      'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings');
  } else {
    return join(home, '.config',
      'Code', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings');
  }
}

function loadJsonConfig(): JsonConfig | null {
  const home = process.env.HOME || process.env.USERPROFILE || '';

  const possiblePaths = [
    // 1. Explicit override via environment variable
    process.env.MCP_CONFIG_PATH,
    // 2. Cline settings directory (for Cline users)
    join(getClineSettingsDir(), 'mcp-config.json'),
    // 3. Claude Code directory (for Claude users)
    join(home, '.claude', 'mcp-config.json'),
  ].filter(Boolean) as string[];

  for (const jsonPath of possiblePaths) {
    if (existsSync(jsonPath)) {
      try {
        const content = readFileSync(jsonPath, 'utf-8');
        const config = JSON.parse(content) as JsonConfig;
        console.log(`[CONFIG] Loaded JSON config from: ${jsonPath}`);
        return config;
      } catch (err) {
        console.error(`[CONFIG] Failed to parse JSON config at ${jsonPath}:`, err);
      }
    }
  }
  return null;
}

function parseAdoOrgs(json: string): Record<string, { name: string; token: string }> {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json);
    const result: Record<string, { name: string; token: string }> = {};
    for (const [orgId, org] of Object.entries(parsed)) {
      const { name, token } = org as { name: string; token: string };
      if (token && token !== 'None') {
        result[orgId] = { name, token };
      }
    }
    return result;
  } catch {
    console.error('[CONFIG] Failed to parse ADO_ORGS JSON');
    return {};
  }
}

function loadEnvFile(): Record<string, string> {
  const envVars: Record<string, string> = {};

  const possiblePaths = [
    join(process.cwd(), '.env'),
    join(process.cwd(), '.claude', 'mcp-credentials.env'),
    join(process.env.HOME || process.env.USERPROFILE || '', '.claude', 'mcp-credentials.env'),
  ];

  for (const envPath of possiblePaths) {
    if (existsSync(envPath)) {
      const content = readFileSync(envPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIndex = trimmed.indexOf('=');
          if (eqIndex > 0) {
            const key = trimmed.slice(0, eqIndex).trim();
            const value = trimmed.slice(eqIndex + 1).trim();
            envVars[key] = value;
          }
        }
      }
      console.log(`[CONFIG] Loaded .env credentials from: ${envPath}`);
      break;
    }
  }

  return envVars;
}

export function getConfig(): Config {
  // Try JSON config first (preferred)
  const jsonConfig = loadJsonConfig();

  if (jsonConfig) {
    return {
      port: jsonConfig.port ?? parseInt(process.env.MCP_PORT || '13999', 10),
      logging: jsonConfig.logging ?? true,
      jira: {
        enabled: jsonConfig.jira?.enabled ?? false,
        deploymentType: (jsonConfig.jira?.deploymentType as 'cloud' | 'datacenter') || 'cloud',
        host: jsonConfig.jira?.host || jsonConfig.jira?.siteName || '',
        token: jsonConfig.jira?.token || jsonConfig.jira?.apiToken || '',
        siteName: jsonConfig.jira?.siteName,
        email: jsonConfig.jira?.email,
        apiToken: jsonConfig.jira?.apiToken,
        scope: jsonConfig.jira?.scope ?? 'write',
      },
      confluence: {
        enabled: jsonConfig.confluence?.enabled ?? false,
        deploymentType: (jsonConfig.confluence?.deploymentType as 'cloud' | 'datacenter') || 'datacenter',
        host: jsonConfig.confluence?.host || jsonConfig.confluence?.siteName || '',
        token: jsonConfig.confluence?.token || jsonConfig.confluence?.apiToken || '',
        siteName: jsonConfig.confluence?.siteName,
        email: jsonConfig.confluence?.email,
        apiToken: jsonConfig.confluence?.apiToken,
        scope: jsonConfig.confluence?.scope ?? 'write',
      },
      testrail: {
        enabled: jsonConfig.testrail?.enabled ?? false,
        url: jsonConfig.testrail?.url || '',
        email: jsonConfig.testrail?.email || '',
        apiKey: jsonConfig.testrail?.apiKey || '',
        scope: jsonConfig.testrail?.scope ?? 'write',
      },
      azureDevOps: {
        enabled: jsonConfig.azureDevOps?.enabled ?? false,
        baseUrl: jsonConfig.azureDevOps?.baseUrl || 'https://dev.azure.com',
        organizations: jsonConfig.azureDevOps?.organizations || {},
        scope: jsonConfig.azureDevOps?.scope ?? 'write',
      },
      playwright: {
        enabled: jsonConfig.playwright?.enabled ?? false,
        headless: jsonConfig.playwright?.headless ?? true,
        browserType: jsonConfig.playwright?.browserType ?? 'chromium',
        defaultTimeout: jsonConfig.playwright?.defaultTimeout ?? 30000,
        screenshotDir: jsonConfig.playwright?.screenshotDir || './screenshots',
        scope: jsonConfig.playwright?.scope ?? 'write',
      },
      sonarqube: {
        enabled: jsonConfig.sonarqube?.enabled ?? false,
        url: jsonConfig.sonarqube?.url || 'https://sonarcloud.io',
        token: jsonConfig.sonarqube?.token || '',
        organization: jsonConfig.sonarqube?.organization,
        scope: jsonConfig.sonarqube?.scope ?? 'read',
      },
      sscCloud: {
        enabled: jsonConfig.sscCloud?.enabled ?? false,
        url: jsonConfig.sscCloud?.url || 'https://portal.ssnc-corp.cloud',
        apiKey: jsonConfig.sscCloud?.apiKey || '',
      },
      serviceNow: {
        enabled: jsonConfig.servicenow?.enabled ?? false,
        url: jsonConfig.servicenow?.url || '',
        username: jsonConfig.servicenow?.username || '',
        password: jsonConfig.servicenow?.password || '',
        scope: jsonConfig.servicenow?.scope ?? 'read',
      },
    };
  }

  // Fallback to .env file (legacy support)
  const envFile = loadEnvFile();
  const get = (key: string): string => process.env[key] || envFile[key] || '';

  // For .env, enabled = has valid token
  const hasValidToken = (token: string) => token && token !== 'None' && token !== '';

  return {
    port: parseInt(get('MCP_PORT') || '13999', 10),
    logging: get('MCP_LOGGING') !== 'false',
    jira: {
      enabled: hasValidToken(get('JIRA_TOKEN')) || hasValidToken(get('JIRA_API_TOKEN')),
      deploymentType: (get('JIRA_DEPLOYMENT_TYPE') as 'cloud' | 'datacenter') || 'cloud',
      host: get('JIRA_HOST') || get('JIRA_SITE_NAME'),
      token: get('JIRA_TOKEN') || get('JIRA_API_TOKEN'),
      siteName: get('JIRA_SITE_NAME'),
      email: get('JIRA_EMAIL'),
      apiToken: get('JIRA_API_TOKEN'),
      scope: (get('JIRA_SCOPE') as ToolScope) || 'write',
    },
    confluence: {
      enabled: hasValidToken(get('CONFLUENCE_TOKEN')) || hasValidToken(get('CONFLUENCE_API_TOKEN')),
      deploymentType: (get('CONFLUENCE_DEPLOYMENT_TYPE') as 'cloud' | 'datacenter') || 'datacenter',
      host: get('CONFLUENCE_HOST') || get('CONFLUENCE_SITE_NAME'),
      token: get('CONFLUENCE_TOKEN') || get('CONFLUENCE_API_TOKEN'),
      siteName: get('CONFLUENCE_SITE_NAME'),
      email: get('CONFLUENCE_EMAIL'),
      apiToken: get('CONFLUENCE_API_TOKEN'),
      scope: (get('CONFLUENCE_SCOPE') as ToolScope) || 'write',
    },
    testrail: {
      enabled: hasValidToken(get('TESTRAIL_API_KEY')),
      url: get('TESTRAIL_URL'),
      email: get('TESTRAIL_EMAIL'),
      apiKey: get('TESTRAIL_API_KEY'),
      scope: (get('TESTRAIL_SCOPE') as ToolScope) || 'write',
    },
    azureDevOps: {
      enabled: Object.keys(parseAdoOrgs(get('ADO_ORGS'))).length > 0,
      baseUrl: get('ADO_BASE_URL') || 'https://dev.azure.com',
      organizations: parseAdoOrgs(get('ADO_ORGS')),
      scope: (get('ADO_SCOPE') as ToolScope) || 'write',
    },
    playwright: {
      enabled: get('PLAYWRIGHT_ENABLED') === 'true',
      headless: get('PLAYWRIGHT_HEADLESS') !== 'false',
      browserType: (get('PLAYWRIGHT_BROWSER') as 'chromium' | 'firefox' | 'webkit') || 'chromium',
      defaultTimeout: parseInt(get('PLAYWRIGHT_TIMEOUT') || '30000', 10),
      screenshotDir: get('PLAYWRIGHT_SCREENSHOT_DIR') || './screenshots',
      scope: (get('PLAYWRIGHT_SCOPE') as ToolScope) || 'write',
    },
    sonarqube: {
      enabled: hasValidToken(get('SONARQUBE_TOKEN')),
      url: get('SONARQUBE_URL') || 'https://sonarcloud.io',
      token: get('SONARQUBE_TOKEN'),
      organization: get('SONARQUBE_ORG') || undefined,
      scope: (get('SONARQUBE_SCOPE') as ToolScope) || 'read',
    },
    sscCloud: {
      enabled: hasValidToken(get('SSC_CLOUD_API_KEY')),
      url: get('SSC_CLOUD_URL') || 'https://portal.ssnc-corp.cloud',
      apiKey: get('SSC_CLOUD_API_KEY'),
    },
    serviceNow: {
      enabled: hasValidToken(get('SNOW_USER')) && hasValidToken(get('SNOW_PASS')),
      url: get('SNOW_URL') || '',
      username: get('SNOW_USER'),
      password: get('SNOW_PASS'),
      scope: (get('SNOW_SCOPE') as ToolScope) || 'read',
    },
  };
}
