/**
 * Composition Root
 * Wires all services together using manual constructor injection.
 */

import { getConfig, Config } from './config';
import { initLogger } from './shared/logger';
import { ToolRegistry, HttpServer } from './presentation';
import { JiraService } from './services/jira';
import { ConfluenceService } from './services/confluence';
import { TestRailService } from './services/testrail';
import { AzureDevOpsService } from './services/azuredevops';
import { PlaywrightService } from './services/playwright';
import { SonarQubeService } from './services/sonarqube';
import { SscCloudService } from './services/ssccloud';
import { ServiceNowService } from './services/servicenow';

/**
 * Application container holding all wired dependencies.
 */
export interface AppContainer {
  config: Config;
  registry: ToolRegistry;
  server: HttpServer;
}

/**
 * Create and wire all application dependencies.
 */
export function createContainer(): AppContainer {
  // Load configuration
  const config = getConfig();

  // Initialize logger
  initLogger(config.logging);

  // Create tool registry
  const registry = new ToolRegistry();

  // Create and register services
  // Each service filters tools based on its configured scope

  // Jira Service
  const jiraService = new JiraService(config.jira);
  registry.registerService('jira', jiraService);

  // Confluence Service
  const confluenceService = new ConfluenceService(config.confluence);
  registry.registerService('confluence', confluenceService);

  // TestRail Service
  const testrailService = new TestRailService({
    enabled: config.testrail.enabled,
    url: config.testrail.url,
    email: config.testrail.email,
    apiKey: config.testrail.apiKey,
    scope: config.testrail.scope,
  });
  registry.registerService('testrail', testrailService);

  // Azure DevOps Service
  const azureDevOpsService = new AzureDevOpsService({
    enabled: config.azureDevOps.enabled,
    baseUrl: config.azureDevOps.baseUrl,
    organizations: config.azureDevOps.organizations,
    scope: config.azureDevOps.scope,
  });
  registry.registerService('azuredevops', azureDevOpsService);

  // Playwright Service
  const playwrightService = new PlaywrightService({
    enabled: config.playwright.enabled,
    headless: config.playwright.headless,
    browserType: config.playwright.browserType,
    defaultTimeout: config.playwright.defaultTimeout,
    screenshotDir: config.playwright.screenshotDir,
    scope: config.playwright.scope,
  });
  registry.registerService('playwright', playwrightService);

  // SonarQube Service
  const sonarqubeService = new SonarQubeService({
    enabled: config.sonarqube.enabled,
    url: config.sonarqube.url,
    token: config.sonarqube.token,
    organization: config.sonarqube.organization,
    scope: config.sonarqube.scope,
  });
  registry.registerService('sonarqube', sonarqubeService);

  // SSC Cloud Service
  const sscCloudService = new SscCloudService({
    enabled: config.sscCloud.enabled,
    url: config.sscCloud.url,
    apiKey: config.sscCloud.apiKey,
  });
  registry.registerService('ssccloud', sscCloudService);

  // ServiceNow Service (read-only by default)
  const serviceNowService = new ServiceNowService({
    enabled: config.serviceNow.enabled,
    url: config.serviceNow.url,
    username: config.serviceNow.username,
    password: config.serviceNow.password,
    scope: config.serviceNow.scope,
  });
  registry.registerService('servicenow', serviceNowService);

  // Create HTTP server
  const server = new HttpServer({ port: config.port }, registry);

  return {
    config,
    registry,
    server,
  };
}

/**
 * Bootstrap the application.
 */
export function bootstrap(): AppContainer {
  const container = createContainer();
  container.server.start();
  return container;
}
