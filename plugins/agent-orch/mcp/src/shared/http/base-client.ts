import { IHttpClient } from '../interfaces/http-client';
import { HttpResponse, HttpRequestOptions } from '../types/common';
import { handleApiError } from '../errors/mcp-error';

/**
 * Configuration for BaseHttpClient.
 */
export interface HttpClientConfig {
  baseUrl: string;
  serviceName: string;
  getAuthHeaders: () => Record<string, string>;
}

/**
 * Base HTTP client implementation using fetch.
 * Provides common functionality for REST API services.
 */
export class BaseHttpClient implements IHttpClient {
  protected readonly baseUrl: string;
  protected readonly serviceName: string;
  private readonly getAuthHeaders: () => Record<string, string>;

  constructor(config: HttpClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.serviceName = config.serviceName;
    this.getAuthHeaders = config.getAuthHeaders;
  }

  async get<T = unknown>(
    endpoint: string,
    params?: Record<string, string>,
    options?: HttpRequestOptions
  ): Promise<HttpResponse<T>> {
    const url = this.buildUrl(endpoint, params);
    return this.request<T>(url, 'GET', undefined, options);
  }

  async post<T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: HttpRequestOptions
  ): Promise<HttpResponse<T>> {
    const url = this.buildUrl(endpoint);
    return this.request<T>(url, 'POST', body, options);
  }

  async put<T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: HttpRequestOptions
  ): Promise<HttpResponse<T>> {
    const url = this.buildUrl(endpoint);
    return this.request<T>(url, 'PUT', body, options);
  }

  async delete<T = unknown>(
    endpoint: string,
    options?: HttpRequestOptions
  ): Promise<HttpResponse<T>> {
    const url = this.buildUrl(endpoint);
    return this.request<T>(url, 'DELETE', undefined, options);
  }

  /**
   * GET request that returns plain text instead of JSON.
   * Useful for endpoints that return logs, source code, or ping responses.
   */
  async getText(
    endpoint: string,
    params?: Record<string, string>
  ): Promise<string> {
    const url = this.buildUrl(endpoint, params);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...this.getAuthHeaders(),
      },
    });

    if (!response.ok) {
      await handleApiError(this.serviceName, response, `GET ${endpoint}`);
    }

    return response.text();
  }

  /**
   * POST request with form-encoded body (application/x-www-form-urlencoded).
   * Useful for APIs that expect form data instead of JSON.
   */
  async postForm<T = unknown>(
    endpoint: string,
    params: Record<string, string>
  ): Promise<HttpResponse<T>> {
    const url = this.buildUrl(endpoint);
    const body = new URLSearchParams(params).toString();

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        ...this.getAuthHeaders(),
      },
      body,
    });

    if (!response.ok) {
      await handleApiError(this.serviceName, response, `POST ${endpoint}`);
    }

    const data = await this.parseResponse<T>(response);
    return { data, status: response.status };
  }

  /**
   * Perform a raw request with custom method.
   * Useful for PATCH or other methods not in IHttpClient.
   */
  async request<T = unknown>(
    url: string,
    method: string,
    body?: unknown,
    options?: HttpRequestOptions
  ): Promise<HttpResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...this.getAuthHeaders(),
      ...options?.headers,
    };

    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      await handleApiError(this.serviceName, response, `${method} ${endpoint(url, this.baseUrl)}`);
    }

    const data = await this.parseResponse<T>(response);
    return { data, status: response.status };
  }

  /**
   * Build full URL with optional query parameters.
   */
  private buildUrl(endpoint: string, params?: Record<string, string>): string {
    // Concatenate baseUrl and endpoint (don't use URL constructor with path - it strips base path)
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const fullUrl = `${this.baseUrl}${normalizedEndpoint}`;

    if (params && Object.keys(params).length > 0) {
      const url = new URL(fullUrl);
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value);
        }
      }
      return url.toString();
    }

    return fullUrl;
  }

  /**
   * Parse response body, handling empty responses (including 204 No Content).
   */
  private async parseResponse<T>(response: Response): Promise<T> {
    if (response.status === 204) {
      return undefined as T;
    }
    const text = await response.text();
    if (!text) {
      return undefined as T;
    }
    return JSON.parse(text) as T;
  }
}

/**
 * Extract endpoint from full URL for error context.
 */
function endpoint(url: string, baseUrl: string): string {
  return url.replace(baseUrl, '');
}
