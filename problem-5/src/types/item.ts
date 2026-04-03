export interface Item {
  id: number;
  name: string;
  description: string | null;
  price: number;
  created_at: string;
  updated_at: string;
}

export interface CreateItemInput {
  name: string;
  description?: string;
  price: number;
}

export interface UpdateItemInput {
  name?: string;
  description?: string;
  price?: number;
}
