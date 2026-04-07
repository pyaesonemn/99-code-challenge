import db from '@/database';
import { ListItemsQuery, UpdateItemInput } from '@/schemas/items.schema';
import { Item } from '@/types/item';

type ItemFilters = Pick<ListItemsQuery, 'name' | 'min_price' | 'max_price'>;
type UpdateItemChanges = UpdateItemInput & { updated_at: string };

const readItemByIdStatement = db.prepare('SELECT * FROM items WHERE id = ?');
const insertItemStatement = db.prepare(`
  INSERT INTO items (name, description, price, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?)
`);
const deleteItemStatement = db.prepare('DELETE FROM items WHERE id = ?');

const sortFieldMap = {
  name: 'name',
  price: 'price',
  created_at: 'created_at',
} as const;

const sortOrderMap = {
  asc: 'ASC',
  desc: 'DESC',
} as const;

function buildFilterClause(filters: ItemFilters): {
  whereClause: string;
  params: Array<string | number>;
} {
  let whereClause = ' WHERE 1=1';
  const params: Array<string | number> = [];

  if (filters.name !== undefined) {
    whereClause += ' AND LOWER(name) LIKE LOWER(?)';
    params.push(`%${filters.name}%`);
  }

  if (filters.min_price !== undefined) {
    whereClause += ' AND price >= ?';
    params.push(filters.min_price);
  }

  if (filters.max_price !== undefined) {
    whereClause += ' AND price <= ?';
    params.push(filters.max_price);
  }

  return { whereClause, params };
}

export function findItemById(id: number): Item | undefined {
  return readItemByIdStatement.get(id) as Item | undefined;
}

export function createItem(data: {
  name: string;
  description: string | null;
  price: number;
  created_at: string;
  updated_at: string;
}): Item | undefined {
  const result = insertItemStatement.run(
    data.name,
    data.description,
    data.price,
    data.created_at,
    data.updated_at,
  );

  return findItemById(Number(result.lastInsertRowid));
}

export function countItems(filters: ItemFilters): number {
  const { whereClause, params } = buildFilterClause(filters);
  const countStatement = db.prepare(
    `SELECT COUNT(*) as totalItems FROM items${whereClause}`,
  );
  const result = countStatement.get(...params) as { totalItems: number };

  return result.totalItems;
}

export function listItems(
  query: ListItemsQuery,
  offset: number,
): Item[] {
  const { whereClause, params } = buildFilterClause(query);
  const queryStatement = db.prepare(`
    SELECT * FROM items
    ${whereClause}
    ORDER BY ${sortFieldMap[query.sort]} ${sortOrderMap[query.order]}
    LIMIT ? OFFSET ?
  `);

  return queryStatement.all(...params, query.limit, offset) as Item[];
}

export function updateItemById(
  id: number,
  changes: UpdateItemChanges,
): Item | undefined {
  const fields: string[] = [];
  const params: Array<string | number> = [];

  if (changes.name !== undefined) {
    fields.push('name = ?');
    params.push(changes.name);
  }

  if (changes.description !== undefined) {
    fields.push('description = ?');
    params.push(changes.description);
  }

  if (changes.price !== undefined) {
    fields.push('price = ?');
    params.push(changes.price);
  }

  fields.push('updated_at = ?');
  params.push(changes.updated_at);

  const updateStatement = db.prepare(`
    UPDATE items
    SET ${fields.join(', ')}
    WHERE id = ?
  `);

  updateStatement.run(...params, id);

  return findItemById(id);
}

export function deleteItemById(id: number): boolean {
  const result = deleteItemStatement.run(id);

  return result.changes > 0;
}
