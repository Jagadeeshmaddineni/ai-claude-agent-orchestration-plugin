import { HttpResponse, HttpRequestOptions } from '../types/common';

/**
 * Interface for HTTP clients used by services.
 * Abstracts HTTP operations to enable testing and different implementations.
 */
export interface IHttpClient {
  /**
   * Perform a GET request.
   *
   * @param endpoint - API endpoint (appended to base URL)
   * @param params - Optional query parameters
   * @param options - Optional request options
   */
  get<T = unknown>(
    endpoint: string,
    params?: Record<string, string>,
    options?: HttpRequestOptions
  ): Promise<HttpResponse<T>>;

  /**
   * Perform a POST request.
   *
   * @param endpoint - API endpoint (appended to base URL)
   * @param body - Request body (will be JSON serialized)
   * @param options - Optional request options
   */
  post<T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: HttpRequestOptions
  ): Promise<HttpResponse<T>>;

  /**
   * Perform a PUT request.
   *
   * @param endpoint - API endpoint (appended to base URL)
   * @param body - Request body (will be JSON serialized)
   * @param options - Optional request options
   */
  put<T = unknown>(
    endpoint: string,
    body?: unknown,
    options?: HttpRequestOptions
  ): Promise<HttpResponse<T>>;

  /**
   * Perform a DELETE request.
   *
   * @param endpoint - API endpoint (appended to base URL)
   * @param options - Optional request options
   */
  delete<T = unknown>(
    endpoint: string,
    options?: HttpRequestOptions
  ): Promise<HttpResponse<T>>;
}
