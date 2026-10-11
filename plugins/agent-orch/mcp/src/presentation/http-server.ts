import { SSESessionManager, ServiceType } from './sse-session';
import { ToolRegistry } from './tool-registry';
import { MCPHandler } from './mcp-handler';

/**
 * HTTP server configuration.
 */
export interface HttpServerConfig {
  port: number;
}

/**
 * Service endpoint configuration.
 */
interface ServiceEndpoint {
  path: string;
  messagePath: string;
  serviceType: ServiceType;
}

/**
 * HTTP Server for MCP protocol.
 * Handles SSE connections and JSON-RPC messages.
 */
export class HttpServer {
  private readonly config: HttpServerConfig;
  private readonly sessionManager: SSESessionManager;
  private readonly registry: ToolRegistry;
  private readonly mcpHandler: MCPHandler;
  private server: ReturnType<typeof Bun.serve> | null = null;

  /**
   * Service endpoints configuration.
   */
  private readonly endpoints: ServiceEndpoint[] = [
    { path: '/sse/jira', messagePath: '/sse/jira/message', serviceType: 'jira' },
    { path: '/sse/confluence', messagePath: '/sse/confluence/message', serviceType: 'confluence' },
    { path: '/sse/testrail', messagePath: '/sse/testrail/message', serviceType: 'testrail' },
    { path: '/sse/azuredevops', messagePath: '/sse/azuredevops/message', serviceType: 'azuredevops' },
    { path: '/sse/playwright', messagePath: '/sse/playwright/message', serviceType: 'playwright' },
    { path: '/sse/sonarqube', messagePath: '/sse/sonarqube/message', serviceType: 'sonarqube' },
    { path: '/sse/ssccloud', messagePath: '/sse/ssccloud/message', serviceType: 'ssccloud' },
    { path: '/sse/servicenow', messagePath: '/sse/servicenow/message', serviceType: 'servicenow' },
  ];

  constructor(config: HttpServerConfig, registry: ToolRegistry) {
    this.config = config;
    this.registry = registry;
    this.sessionManager = new SSESessionManager();
    this.mcpHandler = new MCPHandler(registry);
  }

  /**
   * Start the HTTP server.
   */
  start(): void {
    this.server = Bun.serve({
      port: this.config.port,
      fetch: this.handleRequest.bind(this),
      // Disable idle timeout for SSE long-lived connections (default is 10s)
      idleTimeout: 0,
    });

    this.logStartup();
  }

  /**
   * Handle incoming HTTP requests.
   */
  private async handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Health check
    if (path === '/health') {
      return this.handleHealthCheck();
    }

    // SSE endpoints
    for (const endpoint of this.endpoints) {
      if (path === endpoint.path && req.method === 'GET') {
        console.log(`[SSE] Connection request: ${endpoint.serviceType}`);
        return this.handleSSEConnection(req, endpoint);
      }
      if (path === endpoint.messagePath && req.method === 'POST') {
        return this.handleMessage(req, url);
      }
    }

    // Debug endpoint
    if (path === '/test/tool' && req.method === 'POST') {
      return this.handleTestTool(req);
    }

    // 404 for unknown routes
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  /**
   * Handle health check request.
   */
  private handleHealthCheck(): Response {
    const services: Record<string, { configured: boolean; organizations?: Array<{ id: string; name: string }> }> = {};

    for (const endpoint of this.endpoints) {
      services[endpoint.serviceType] = {
        configured: this.registry.isServiceConfigured(endpoint.serviceType),
      };
    }

    return Response.json({
      status: 'ok',
      server: 'agent-orch-mcp',
      version: '0.3.1',
      services,
      endpoints: Object.fromEntries(
        this.endpoints.map(e => [e.serviceType, e.path])
      ),
    });
  }

  /**
   * Handle SSE connection request.
   */
  private handleSSEConnection(req: Request, endpoint: ServiceEndpoint): Response {
    const sessionId = this.sessionManager.generateSessionId();
    const baseUrl = `http://localhost:${this.config.port}`;

    const stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        console.log(`[SSE] Session created: ${sessionId} (${endpoint.serviceType})`);
        this.sessionManager.createSession(sessionId, controller, endpoint.serviceType);

        // Send endpoint URL
        const endpointUrl = `${baseUrl}${endpoint.messagePath}?sessionId=${sessionId}`;
        controller.enqueue(new TextEncoder().encode(`event: endpoint\ndata: ${endpointUrl}\n\n`));
        console.log(`[SSE] Sent endpoint URL: ${endpointUrl}`);

        // Start ping interval
        this.sessionManager.startPing(sessionId);

        // Cleanup on disconnect
        req.signal.addEventListener('abort', () => {
          console.log(`[SSE] Session disconnected: ${sessionId} (${endpoint.serviceType})`);
          this.sessionManager.removeSession(sessionId);
        });
      },
      cancel: () => {
        console.log(`[SSE] Stream cancelled: ${sessionId} (${endpoint.serviceType})`);
        this.sessionManager.removeSession(sessionId);
      },
    });

    return new Response(stream, {
      headers: SSESessionManager.getSSEHeaders(),
    });
  }

  /**
   * Handle JSON-RPC message.
   */
  private async handleMessage(req: Request, url: URL): Promise<Response> {
    const sessionId = url.searchParams.get('sessionId');
    const session = sessionId ? this.sessionManager.getSession(sessionId) : null;

    if (!session?.controller) {
      console.log(`[MSG] Invalid session: ${sessionId}`);
      return Response.json({ error: 'Invalid session' }, { status: 400 });
    }

    try {
      const body = await req.json() as {
        method: string;
        params?: unknown;
        id?: string | number | null;
      };
      const { method, params, id } = body;

      console.log(`[MSG] ${session.serviceType}: ${method} (id: ${id})`);

      const response = await this.mcpHandler.handleMessage(
        method,
        params,
        id ?? null,
        session.serviceType
      );

      if (response) {
        this.sessionManager.sendMessage(sessionId, response);
        console.log(`[MSG] Response sent for ${method}`);
      }

      return Response.json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[MSG] Error: ${message}`);
      return Response.json({ error: message }, { status: 500 });
    }
  }

  /**
   * Handle test tool request (for development).
   */
  private async handleTestTool(req: Request): Promise<Response> {
    try {
      const body = await req.json() as {
        name: string;
        arguments: Record<string, unknown>;
        service?: ServiceType;
      };

      const serviceType = body.service || 'jira';
      const result = await this.registry.executeTool(serviceType, body.name, body.arguments || {});

      return Response.json({ success: true, result });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return Response.json({ success: false, error: message }, { status: 500 });
    }
  }

  /**
   * Log startup information.
   */
  private logStartup(): void {
    console.log(`[MCP] Server started on http://localhost:${this.config.port}`);
    console.log(`[MCP] Endpoints:`);
    for (const endpoint of this.endpoints) {
      const configured = this.registry.isServiceConfigured(endpoint.serviceType);
      console.log(`[MCP]   ${endpoint.serviceType}: http://localhost:${this.config.port}${endpoint.path} (configured: ${configured})`);
    }
    console.log(`[MCP] Health: http://localhost:${this.config.port}/health`);
  }
}
