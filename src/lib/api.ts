import type { Link, AnalyticsEntry, CreateLinkRequest, UpdateLinkRequest } from '@/types';

const API_BASE = '/api/admin';

export class ApiService {
  private adminKey: string;
  
  constructor(adminKey: string) {
    this.adminKey = adminKey;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = new URL(endpoint, window.location.origin);
    url.searchParams.set('key', this.adminKey);

    try {
      const response = await fetch(url.toString(), {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      // Check if response is HTML (404 or similar)
      const contentType = response.headers.get('Content-Type') || '';
      if (contentType.includes('text/html')) {
        throw new Error('API endpoint not found - make sure the Cloudflare Worker is deployed');
      }

      if (!response.ok) {
        // Try to parse JSON error, but handle cases where it's not JSON
        let errorMessage = `Request failed with status ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If JSON parsing fails, use the status text or a generic message
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      // Ensure the response is JSON
      try {
        return await response.json();
      } catch {
        throw new Error('Invalid JSON response from server');
      }
    } catch (error) {
      // Handle network errors and other exceptions
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error - please check your connection');
    }
  }

  async getLinks(params: {
    page?: number;
    limit?: number;
    search?: string;
  } = {}): Promise<{ links: Link[]; pagination: any }> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.search) searchParams.set('search', params.search);

    const query = searchParams.toString();
    const endpoint = `${API_BASE}/links${query ? `?${query}` : ''}`;
    return this.request(endpoint);
  }

  async createLink(data: CreateLinkRequest): Promise<any> {
    return this.request(`${API_BASE}/links`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateLink(id: number, data: UpdateLinkRequest): Promise<any> {
    return this.request(`${API_BASE}/links/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteLink(id: number): Promise<any> {
    return this.request(`${API_BASE}/links/${id}`, {
      method: 'DELETE',
    });
  }

  async getAnalytics(params: {
    page?: number;
    limit?: number;
    linkId?: number;
    country?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}): Promise<{ analytics: AnalyticsEntry[]; pagination: any }> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.set('page', params.page.toString());
    if (params.limit) searchParams.set('limit', params.limit.toString());
    if (params.linkId) searchParams.set('linkId', params.linkId.toString());
    if (params.country) searchParams.set('country', params.country);
    if (params.dateFrom) searchParams.set('dateFrom', params.dateFrom);
    if (params.dateTo) searchParams.set('dateTo', params.dateTo);

    const query = searchParams.toString();
    const endpoint = `${API_BASE}/analytics${query ? `?${query}` : ''}`;
    return this.request(endpoint);
  }
}