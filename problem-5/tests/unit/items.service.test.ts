import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as itemsModel from '@/models/items.model';
import * as itemsService from '@/services/items.service';

vi.mock('@/models/items.model', () => ({
  createItem: vi.fn(),
  countItems: vi.fn(),
  listItems: vi.fn(),
  findItemById: vi.fn(),
  updateItemById: vi.fn(),
  deleteItemById: vi.fn(),
}));

describe('items service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('computes pagination metadata for listItems', () => {
    vi.mocked(itemsModel.countItems).mockReturnValue(6);
    vi.mocked(itemsModel.listItems).mockReturnValue([
      {
        id: 2,
        name: 'Laptop',
        description: null,
        price: 1999.99,
        created_at: '2026-04-07T00:00:00.000Z',
        updated_at: '2026-04-07T00:00:00.000Z',
      },
    ]);

    const result = itemsService.listItems({
      name: undefined,
      min_price: undefined,
      max_price: undefined,
      sort: 'created_at',
      order: 'desc',
      page: 2,
      limit: 5,
    });

    expect(itemsModel.listItems).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, limit: 5 }),
      5,
    );
    expect(result.pagination).toEqual({
      page: 2,
      limit: 5,
      totalItems: 6,
      totalPages: 2,
      hasNextPage: false,
      hasPreviousPage: true,
    });
  });

  it('returns zero totalPages when there are no items', () => {
    vi.mocked(itemsModel.countItems).mockReturnValue(0);
    vi.mocked(itemsModel.listItems).mockReturnValue([]);

    const result = itemsService.listItems({
      name: undefined,
      min_price: undefined,
      max_price: undefined,
      sort: 'created_at',
      order: 'desc',
      page: 1,
      limit: 10,
    });

    expect(result.pagination).toEqual({
      page: 1,
      limit: 10,
      totalItems: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });

  it('returns null when getItemById cannot find an item', () => {
    vi.mocked(itemsModel.findItemById).mockReturnValue(undefined);

    expect(itemsService.getItemById(123)).toBeNull();
  });

  it('returns null when updateItem cannot find an existing item', () => {
    vi.mocked(itemsModel.findItemById).mockReturnValue(undefined);

    const result = itemsService.updateItem(123, {
      name: 'Updated',
    });

    expect(result).toBeNull();
    expect(itemsModel.updateItemById).not.toHaveBeenCalled();
  });

  it('passes trimmed values and timestamps to createItem', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-07T10:00:00.000Z'));

    vi.mocked(itemsModel.createItem).mockReturnValue({
      id: 1,
      name: 'Laptop',
      description: 'MacBook Pro',
      price: 1999.99,
      created_at: '2026-04-07T10:00:00.000Z',
      updated_at: '2026-04-07T10:00:00.000Z',
    });

    const result = itemsService.createItem({
      name: '  Laptop  ',
      description: '  MacBook Pro  ',
      price: 1999.99,
    });

    expect(itemsModel.createItem).toHaveBeenCalledWith({
      name: 'Laptop',
      description: 'MacBook Pro',
      price: 1999.99,
      created_at: '2026-04-07T10:00:00.000Z',
      updated_at: '2026-04-07T10:00:00.000Z',
    });
    expect(result.name).toBe('Laptop');
  });

  it('passes trimmed values and updated_at to updateItem', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-07T11:00:00.000Z'));

    vi.mocked(itemsModel.findItemById).mockReturnValue({
      id: 1,
      name: 'Laptop',
      description: 'MacBook Pro',
      price: 1999.99,
      created_at: '2026-04-07T10:00:00.000Z',
      updated_at: '2026-04-07T10:00:00.000Z',
    });
    vi.mocked(itemsModel.updateItemById).mockReturnValue({
      id: 1,
      name: 'Updated Laptop',
      description: 'Updated Description',
      price: 1799.99,
      created_at: '2026-04-07T10:00:00.000Z',
      updated_at: '2026-04-07T11:00:00.000Z',
    });

    const result = itemsService.updateItem(1, {
      name: '  Updated Laptop  ',
      description: '  Updated Description  ',
      price: 1799.99,
    });

    expect(itemsModel.updateItemById).toHaveBeenCalledWith(1, {
      name: 'Updated Laptop',
      description: 'Updated Description',
      price: 1799.99,
      updated_at: '2026-04-07T11:00:00.000Z',
    });
    expect(result?.updated_at).toBe('2026-04-07T11:00:00.000Z');
  });
});
