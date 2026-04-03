import { Router } from 'express';
import db from '../database';
import { Item } from '../types/item';

const router = Router();
const allowedSorts = ['name', 'price', 'created_at'] as const;
const allowedOrders = ['asc', 'desc'] as const;

const readItemById = db.prepare('SELECT * FROM items WHERE id = ?');

function parseId(idParam: string): number | null {
  const id = Number(idParam);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

router.post('/', (req, res) => {
  const { name, description, price } = req.body as {
    name?: unknown;
    description?: unknown;
    price?: unknown;
  };

  if (typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: 'Name is required' });
  }

  if (typeof price !== 'number' || Number.isNaN(price) || price < 0) {
    return res
      .status(400)
      .json({ error: 'Price must be a non-negative number' });
  }

  if (description !== undefined && typeof description !== 'string') {
    return res.status(400).json({ error: 'Description must be a string' });
  }

  const now = new Date().toISOString();
  const insertItem = db.prepare(`
    INSERT INTO items (name, description, price, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const result = insertItem.run(name.trim(), typeof description === 'string' ? description.trim() : null, price, now, now);
  const createdItem = readItemById.get(result.lastInsertRowid) as Item | undefined;

  return res.status(201).json(createdItem);
});

router.get('/', (req, res) => {
  const { name, min_price, max_price, sort, order } = req.query;
  let query = 'SELECT * FROM items WHERE 1=1';
  const params: Array<string | number> = [];

  if (name !== undefined && name !== '') {
    if (typeof name !== 'string') {
      return res.status(400).json({ error: 'Name filter must be a string' });
    }

    query += ' AND LOWER(name) LIKE LOWER(?)';
    params.push(`%${name}%`);
  }

  if (min_price !== undefined) {
    if (typeof min_price !== 'string' || Number.isNaN(Number(min_price))) {
      return res.status(400).json({ error: 'min_price must be a number' });
    }

    params.push(Number(min_price));
    query += ' AND price >= ?';
  }

  if (max_price !== undefined) {
    if (typeof max_price !== 'string' || Number.isNaN(Number(max_price))) {
      return res.status(400).json({ error: 'max_price must be a number' });
    }

    params.push(Number(max_price));
    query += ' AND price <= ?';
  }

  if (
    min_price !== undefined &&
    max_price !== undefined &&
    Number(min_price) > Number(max_price)
  ) {
    return res
      .status(400)
      .json({ error: 'min_price cannot be greater than max_price' });
  }

  const sortField =
    typeof sort === 'string' && allowedSorts.includes(sort as (typeof allowedSorts)[number])
      ? sort
      : 'created_at';
  const sortOrder =
    typeof order === 'string' &&
    allowedOrders.includes(order.toLowerCase() as (typeof allowedOrders)[number])
      ? order.toUpperCase()
      : 'DESC';

  query += ` ORDER BY ${sortField} ${sortOrder}`;

  const listItems = db.prepare(query);
  const items = listItems.all(...params) as Item[];

  return res.json(items);
});

router.get('/:id', (req, res) => {
  const id = parseId(req.params.id);

  if (id === null) {
    return res.status(400).json({ error: 'Invalid item ID' });
  }

  const item = readItemById.get(id) as Item | undefined;

  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }

  return res.json(item);
});

router.put('/:id', (req, res) => {
  const id = parseId(req.params.id);

  if (id === null) {
    return res.status(400).json({ error: 'Invalid item ID' });
  }

  const existingItem = readItemById.get(id) as Item | undefined;

  if (!existingItem) {
    return res.status(404).json({ error: 'Item not found' });
  }

  const { name, description, price } = req.body as {
    name?: unknown;
    description?: unknown;
    price?: unknown;
  };
  const fields: string[] = [];
  const params: Array<string | number | null> = [];

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Name must be a non-empty string' });
    }

    fields.push('name = ?');
    params.push(name.trim());
  }

  if (description !== undefined) {
    if (typeof description !== 'string') {
      return res.status(400).json({ error: 'Description must be a string' });
    }

    fields.push('description = ?');
    params.push(description.trim());
  }

  if (price !== undefined) {
    if (typeof price !== 'number' || Number.isNaN(price) || price < 0) {
      return res
        .status(400)
        .json({ error: 'Price must be a non-negative number' });
    }

    fields.push('price = ?');
    params.push(price);
  }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'At least one field is required to update' });
  }

  const now = new Date().toISOString();
  fields.push('updated_at = ?');
  params.push(now);

  const updateItem = db.prepare(`
    UPDATE items
    SET ${fields.join(', ')}
    WHERE id = ?
  `);

  updateItem.run(...params, id);

  const updatedItem = readItemById.get(id) as Item | undefined;

  return res.json(updatedItem);
});

router.delete('/:id', (req, res) => {
  const id = parseId(req.params.id);

  if (id === null) {
    return res.status(400).json({ error: 'Invalid item ID' });
  }

  const deleteItem = db.prepare('DELETE FROM items WHERE id = ?');
  const result = deleteItem.run(id);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Item not found' });
  }

  return res.status(204).send();
});

export default router;
