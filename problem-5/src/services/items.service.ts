import {
  CreateItemInput,
  ListItemsQuery,
  UpdateItemInput,
} from '@/schemas/items.schema';
import * as itemsModel from '@/models/items.model';
import { Item, ItemListResponse } from '@/types/item';

export function createItem(input: CreateItemInput): Item {
  const now = new Date().toISOString();
  const createdItem = itemsModel.createItem({
    name: input.name.trim(),
    description:
      input.description !== undefined ? input.description.trim() : null,
    price: input.price,
    created_at: now,
    updated_at: now,
  });

  if (!createdItem) {
    throw new Error('Failed to create item');
  }

  return createdItem;
}

export function listItems(query: ListItemsQuery): ItemListResponse {
  const offset = (query.page - 1) * query.limit;
  const totalItems = itemsModel.countItems(query);
  const items = itemsModel.listItems(query, offset);
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / query.limit);

  return {
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      totalItems,
      totalPages,
      hasNextPage: totalPages > 0 && query.page < totalPages,
      hasPreviousPage: totalPages > 0 && query.page > 1,
    },
  };
}

export function getItemById(id: number): Item | null {
  return itemsModel.findItemById(id) ?? null;
}

export function updateItem(
  id: number,
  input: UpdateItemInput,
): Item | null {
  const existingItem = itemsModel.findItemById(id);

  if (!existingItem) {
    return null;
  }

  const updatedItem = itemsModel.updateItemById(id, {
    name: input.name !== undefined ? input.name.trim() : undefined,
    description:
      input.description !== undefined ? input.description.trim() : undefined,
    price: input.price,
    updated_at: new Date().toISOString(),
  });

  if (!updatedItem) {
    throw new Error('Failed to update item');
  }

  return updatedItem;
}

export function deleteItem(id: number): boolean {
  return itemsModel.deleteItemById(id);
}
