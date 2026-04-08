import { z } from 'zod';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const allowedSorts = ['name', 'price', 'created_at'] as const;
const allowedOrders = ['asc', 'desc'] as const;

const createNameSchema = z
  .string({ error: 'Name is required' })
  .trim()
  .min(1, { error: 'Name is required' });

const updateNameSchema = z
  .string({ error: 'Name must be a non-empty string' })
  .trim()
  .min(1, { error: 'Name must be a non-empty string' });

const descriptionSchema = z
  .string({ error: 'Description must be a string' })
  .trim()
  .transform((value) => (value === '' ? null : value))
  .nullable();
const priceSchema = z
  .number({ error: 'Price must be a non-negative number' })
  .refine((value) => !Number.isNaN(value) && value >= 0, {
    error: 'Price must be a non-negative number',
  });

const pageSchema = z.preprocess(
  (value) => (value === undefined ? String(DEFAULT_PAGE) : value),
  z
    .string({ error: 'page must be a positive integer' })
    .refine(
      (value) => Number.isInteger(Number(value)) && Number(value) > 0,
      { error: 'page must be a positive integer' },
    )
    .transform((value) => Number(value)),
);

const limitSchema = z.preprocess(
  (value) => (value === undefined ? String(DEFAULT_LIMIT) : value),
  z
    .string({ error: `limit must be an integer between 1 and ${MAX_LIMIT}` })
    .refine(
      (value) =>
        Number.isInteger(Number(value)) &&
        Number(value) > 0 &&
        Number(value) <= MAX_LIMIT,
      { error: `limit must be an integer between 1 and ${MAX_LIMIT}` },
    )
    .transform((value) => Number(value)),
);

const optionalNumberQuerySchema = (fieldName: 'min_price' | 'max_price') =>
  z.preprocess(
    (value) => (value === undefined ? undefined : value),
    z
      .union([
        z
          .string({ error: `${fieldName} must be a number` })
          .refine((value) => value.trim() !== '' && !Number.isNaN(Number(value)), {
            error: `${fieldName} must be a number`,
          })
          .transform((value) => Number(value)),
        z.undefined(),
      ]),
  );

export const createItemSchema = z.object({
  name: createNameSchema,
  description: descriptionSchema.optional(),
  price: priceSchema,
});

export const updateItemSchema = z
  .object({
    name: updateNameSchema.optional(),
    description: descriptionSchema.optional(),
    price: priceSchema.optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.description !== undefined ||
      data.price !== undefined,
    { error: 'At least one field is required to update' },
  );

export const itemIdParamsSchema = z.object({
  id: z.preprocess(
    (value) => value,
    z
      .string({ error: 'Invalid item ID' })
      .refine(
        (value) => Number.isInteger(Number(value)) && Number(value) > 0,
        { error: 'Invalid item ID' },
      )
      .transform((value) => Number(value)),
  ),
});

export const listItemsQuerySchema = z
  .object({
    name: z
      .union([
        z.string({ error: 'name must be a string' }),
        z.undefined(),
      ])
      .transform((value) => (value === '' ? undefined : value)),
    min_price: optionalNumberQuerySchema('min_price'),
    max_price: optionalNumberQuerySchema('max_price'),
    sort: z.preprocess(
      (value) =>
        typeof value === 'string' &&
        (allowedSorts as readonly string[]).includes(value)
          ? value
          : 'created_at',
      z.enum(allowedSorts),
    ),
    order: z.preprocess(
      (value) =>
        typeof value === 'string' &&
        (allowedOrders as readonly string[]).includes(value.toLowerCase())
          ? value.toLowerCase()
          : 'desc',
      z.enum(allowedOrders),
    ),
    page: pageSchema,
    limit: limitSchema,
  })
  .refine(
    (data) =>
      data.min_price === undefined ||
      data.max_price === undefined ||
      data.min_price <= data.max_price,
    { error: 'min_price cannot be greater than max_price' },
  );

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type ItemIdParams = z.infer<typeof itemIdParamsSchema>;
export type ListItemsQuery = z.infer<typeof listItemsQuerySchema>;
