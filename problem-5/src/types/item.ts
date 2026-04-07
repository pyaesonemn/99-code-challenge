export interface Item {
  id: number;
  name: string;
  description: string | null;
  price: number;
  created_at: string;
  updated_at: string;
}

export interface PaginationMetadata {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ItemListResponse {
  items: Item[];
  pagination: PaginationMetadata;
}
