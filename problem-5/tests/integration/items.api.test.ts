import type Database from 'better-sqlite3';
import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp } from '@tests/helpers/test-app';

describe('Items API', () => {
  let app: Express;
  let db: Database.Database;
  let cleanup: (() => Promise<void>) | undefined;

  beforeAll(async () => {
    const testContext = await createTestApp();
    app = testContext.app;
    db = testContext.db;
    cleanup = testContext.cleanup;
  });

  beforeEach(() => {
    db.exec(`
      DELETE FROM items;
      DELETE FROM sqlite_sequence WHERE name = 'items';
    `);
  });

  afterAll(async () => {
    if (cleanup) {
      await cleanup();
    }
  });

  async function createItem(name: string, price: number) {
    return request(app)
      .post('/api/items')
      .send({
        name,
        description: `${name} description`,
        price,
      });
  }

  it('creates an item and returns 201', async () => {
    const response = await createItem('Laptop', 1999.99);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      id: expect.any(Number),
      name: 'Laptop',
      description: 'Laptop description',
      price: 1999.99,
      created_at: expect.any(String),
      updated_at: expect.any(String),
    });
  });

  it('accepts null description when creating an item', async () => {
    const response = await request(app)
      .post('/api/items')
      .send({
        name: 'Laptop',
        description: null,
        price: 1999.99,
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      id: expect.any(Number),
      name: 'Laptop',
      description: null,
      price: 1999.99,
    });
  });

  it('stores null when creating an item without description', async () => {
    const response = await request(app)
      .post('/api/items')
      .send({
        name: 'Laptop',
        price: 1999.99,
      });

    expect(response.status).toBe(201);
    expect(response.body.description).toBeNull();
  });

  it('stores null when creating an item with a blank description', async () => {
    const response = await request(app)
      .post('/api/items')
      .send({
        name: 'Laptop',
        description: '   ',
        price: 1999.99,
      });

    expect(response.status).toBe(201);
    expect(response.body.description).toBeNull();
  });

  it('lists items with default pagination metadata', async () => {
    await createItem('Laptop', 1999.99);
    await createItem('Mouse', 49.99);

    const response = await request(app).get('/api/items');

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(2);
    expect(response.body.pagination).toEqual({
      page: 1,
      limit: 10,
      totalItems: 2,
      totalPages: 1,
      hasNextPage: false,
      hasPreviousPage: false,
    });
  });

  it('supports filters, sorting, and pagination together', async () => {
    await createItem('Laptop Basic', 500);
    await createItem('Laptop Pro', 1500);
    await createItem('Laptop Max', 2500);

    const response = await request(app).get(
      '/api/items?name=laptop&min_price=1000&max_price=3000&sort=price&order=asc&page=1&limit=1',
    );

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0]).toMatchObject({
      name: 'Laptop Pro',
      price: 1500,
    });
    expect(response.body.pagination).toEqual({
      page: 1,
      limit: 1,
      totalItems: 2,
      totalPages: 2,
      hasNextPage: true,
      hasPreviousPage: false,
    });
  });

  it('returns 400 for invalid query params', async () => {
    const response = await request(app).get('/api/items?page=0');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: 'page must be a positive integer',
    });
  });

  it('returns 404 when an item does not exist', async () => {
    const response = await request(app).get('/api/items/999');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: 'Item not found',
    });
  });

  it('updates an item and refreshes updated_at', async () => {
    const created = await createItem('Laptop', 1999.99);

    await new Promise((resolve) => setTimeout(resolve, 10));

    const response = await request(app)
      .put(`/api/items/${created.body.id}`)
      .send({ price: 1799.99 });

    expect(response.status).toBe(200);
    expect(response.body.price).toBe(1799.99);
    expect(response.body.updated_at).not.toBe(created.body.updated_at);
  });

  it('accepts null description when updating an item', async () => {
    const created = await createItem('Laptop', 1999.99);

    const response = await request(app)
      .put(`/api/items/${created.body.id}`)
      .send({ description: null });

    expect(response.status).toBe(200);
    expect(response.body.description).toBeNull();
  });

  it('clears description when updating an item with a blank description', async () => {
    const created = await createItem('Laptop', 1999.99);

    const response = await request(app)
      .put(`/api/items/${created.body.id}`)
      .send({ description: '   ' });

    expect(response.status).toBe(200);
    expect(response.body.description).toBeNull();
  });

  it('deletes an item and returns 204', async () => {
    const created = await createItem('Laptop', 1999.99);

    const response = await request(app).delete(`/api/items/${created.body.id}`);

    expect(response.status).toBe(204);

    const deletedItemResponse = await request(app).get(
      `/api/items/${created.body.id}`,
    );
    expect(deletedItemResponse.status).toBe(404);
  });

  it('returns JSON 404 for unknown routes', async () => {
    const response = await request(app).get('/api/unknown-route');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: 'Route not found',
    });
  });
});
