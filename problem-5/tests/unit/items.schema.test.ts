import { describe, expect, it } from 'vitest';
import {
  createItemSchema,
  itemIdParamsSchema,
  listItemsQuerySchema,
  updateItemSchema,
} from '@/schemas/items.schema';

describe('items schemas', () => {
  it('accepts a valid create payload', () => {
    const result = createItemSchema.safeParse({
      name: '  Laptop  ',
      description: 'MacBook Pro',
      price: 1999.99,
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      name: 'Laptop',
      description: 'MacBook Pro',
      price: 1999.99,
    });
  });

  it('accepts null description on create', () => {
    const result = createItemSchema.safeParse({
      name: 'Laptop',
      description: null,
      price: 1999.99,
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      name: 'Laptop',
      description: null,
      price: 1999.99,
    });
  });

  it('normalizes blank description to null on create', () => {
    const result = createItemSchema.safeParse({
      name: 'Laptop',
      description: '   ',
      price: 1999.99,
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      name: 'Laptop',
      description: null,
      price: 1999.99,
    });
  });

  it('rejects a blank create name', () => {
    const result = createItemSchema.safeParse({
      name: '   ',
      price: 100,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Name is required');
  });

  it('rejects a negative create price', () => {
    const result = createItemSchema.safeParse({
      name: 'Laptop',
      price: -1,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      'Price must be a non-negative number',
    );
  });

  it('rejects an empty update payload', () => {
    const result = updateItemSchema.safeParse({});

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      'At least one field is required to update',
    );
  });

  it('accepts null description on update', () => {
    const result = updateItemSchema.safeParse({
      description: null,
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      description: null,
    });
  });

  it('normalizes blank description to null on update', () => {
    const result = updateItemSchema.safeParse({
      description: '   ',
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      description: null,
    });
  });

  it('rejects an invalid id param', () => {
    const result = itemIdParamsSchema.safeParse({ id: '0' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Invalid item ID');
  });

  it('applies list query defaults and transforms numbers', () => {
    const result = listItemsQuerySchema.safeParse({
      min_price: '100',
      max_price: '500',
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      name: undefined,
      min_price: 100,
      max_price: 500,
      sort: 'created_at',
      order: 'desc',
      page: 1,
      limit: 10,
    });
  });

  it('rejects page=0', () => {
    const result = listItemsQuerySchema.safeParse({ page: '0' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      'page must be a positive integer',
    );
  });

  it('rejects limit=0', () => {
    const result = listItemsQuerySchema.safeParse({ limit: '0' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      'limit must be an integer between 1 and 100',
    );
  });

  it('rejects min_price greater than max_price', () => {
    const result = listItemsQuerySchema.safeParse({
      min_price: '500',
      max_price: '100',
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      'min_price cannot be greater than max_price',
    );
  });
});
