// src/types/common.ts
/* This file contains shared/common type definitions used across multiple parts of the application, including API responses, pagination structures, and sorting/filtering options. 
These reusable types help maintain consistency across the codebase and reduce duplication. */
export type ApiResponse<T> = {
  data?: T;
  error?: string;
};

export type PaginatedResponse<T> = {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type SortDirection = 'asc' | 'desc';

export type SortOption = {
  field: string;
  direction: SortDirection;
};

export type FilterOption = {
  field: string;
  value: string | number | boolean;
  operator?: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains';
};
