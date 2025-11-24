export interface ApiError {
  message: string;
  statusCode?: number;
  details?: Record<string, unknown>;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
