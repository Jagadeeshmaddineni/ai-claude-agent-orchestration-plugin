import { IToolService, ToolDefinition } from '../shared';
import { ServiceType } from './sse-session';

/**
 * Registry for MCP tool services.
 * Manages service registration and tool lookup.
 */
export class ToolRegistry {
  private readonly services = new Map<ServiceType, IToolService>();

  /**
   * Register a service for a given service type.
   */
  registerService(serviceType: ServiceType, service: IToolService): void {
    this.services.set(serviceType, service);
  }

  /**
   * Get a registered service by type.
   */
  getService(serviceType: ServiceType): IToolService | undefined {
    return this.services.get(serviceType);
  }

  /**
   * Check if a service is configured (has valid credentials).
   */
  isServiceConfigured(serviceType: ServiceType): boolean {
    const service = this.services.get(serviceType);
    return service?.isConfigured() ?? false;
  }

  /**
   * Get all tools for a service type.
   * Tools are already filtered by scope in the service.
   */
  getTools(serviceType: ServiceType): ToolDefinition[] {
    const service = this.services.get(serviceType);
    return service?.getTools() ?? [];
  }

  /**
   * Execute a tool for a given service type.
   */
  async executeTool(
    serviceType: ServiceType,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<unknown> {
    const service = this.services.get(serviceType);
    if (!service) {
      throw new Error(`Service not registered: ${serviceType}`);
    }
    return service.executeTool(toolName, args);
  }

  /**
   * Get status of all registered services.
   */
  getServicesStatus(): Record<ServiceType, { configured: boolean }> {
    const status: Record<string, { configured: boolean }> = {};
    for (const [type, service] of this.services) {
      status[type] = { configured: service.isConfigured() };
    }
    return status as Record<ServiceType, { configured: boolean }>;
  }

  /**
   * Get list of registered service types.
   */
  getRegisteredServiceTypes(): ServiceType[] {
    return Array.from(this.services.keys());
  }
}
