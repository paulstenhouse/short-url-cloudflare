export interface Link {
  id: number;
  short_code: string;
  destination_url: string;
  created_at: string;
  created_by: string;
  click_count: number;
}

export interface AnalyticsEntry {
  id: number;
  link_id: number;
  ip_address: string;
  user_agent: string;
  referer: string;
  country: string;
  city: string;
  timestamp: string;
  short_code?: string;
  destination_url?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface CreateLinkRequest {
  shortCode: string;
  destinationUrl: string;
}

export interface UpdateLinkRequest {
  shortCode: string;
  destinationUrl: string;
}