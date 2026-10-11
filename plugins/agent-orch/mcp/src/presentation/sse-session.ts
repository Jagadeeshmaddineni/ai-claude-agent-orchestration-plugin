/**
 * SSE Session Management
 * Handles Server-Sent Events connections for MCP protocol.
 */

export type ServiceType =
  | 'jira'
  | 'confluence'
  | 'testrail'
  | 'azuredevops'
  | 'playwright'
  | 'sonarqube'
  | 'ssccloud'
  | 'servicenow';

export interface SSESession {
  id: string;
  controller: ReadableStreamDefaultController<Uint8Array>;
  serviceType: ServiceType;
  pingInterval: ReturnType<typeof setInterval> | null;
}

/**
 * Manages SSE sessions for MCP connections.
 */
export class SSESessionManager {
  private readonly sessions = new Map<string, SSESession>();
  private readonly pingIntervalMs: number;

  constructor(pingIntervalMs = 5000) {
    this.pingIntervalMs = pingIntervalMs;
  }

  /**
   * Generate a unique session ID.
   */
  generateSessionId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  /**
   * Create a new SSE session.
   */
  createSession(
    sessionId: string,
    controller: ReadableStreamDefaultController<Uint8Array>,
    serviceType: ServiceType
  ): SSESession {
    const session: SSESession = {
      id: sessionId,
      controller,
      serviceType,
      pingInterval: null,
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Get an existing session by ID.
   */
  getSession(sessionId: string): SSESession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Remove a session.
   */
  removeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session?.pingInterval) {
      clearInterval(session.pingInterval);
    }
    this.sessions.delete(sessionId);
  }

  /**
   * Start ping interval for a session to keep connection alive.
   */
  startPing(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Send initial ping immediately
    try {
      session.controller.enqueue(new TextEncoder().encode(`: ping\n\n`));
    } catch (e) {
      console.log(`[PING] Initial ping failed for ${sessionId}: ${e}`);
    }

    session.pingInterval = setInterval(() => {
      try {
        session.controller.enqueue(new TextEncoder().encode(`: ping\n\n`));
      } catch (e) {
        console.log(`[PING] Ping failed for ${sessionId}, removing session: ${e}`);
        this.removeSession(sessionId);
      }
    }, this.pingIntervalMs);
  }

  /**
   * Send SSE event to a session.
   */
  sendEvent(sessionId: string, event: string, data: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session?.controller) return false;

    try {
      session.controller.enqueue(
        new TextEncoder().encode(`event: ${event}\ndata: ${data}\n\n`)
      );
      return true;
    } catch {
      this.removeSession(sessionId);
      return false;
    }
  }

  /**
   * Send message event to a session.
   */
  sendMessage(sessionId: string, message: string): boolean {
    return this.sendEvent(sessionId, 'message', message);
  }

  /**
   * Get count of active sessions.
   */
  getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Create SSE response headers.
   */
  static getSSEHeaders(): HeadersInit {
    return {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'X-Accel-Buffering': 'no',
    };
  }
}
