import { Router } from 'express';
import {
  createItem,
  deleteItem,
  getItemById,
  listItems,
  updateItem,
} from '@/controllers/items.controller';
import { validate } from '@/middlewares/validate';
import {
  createItemSchema,
  itemIdParamsSchema,
  listItemsQuerySchema,
  updateItemSchema,
} from '@/schemas/items.schema';

const router = Router();

router.post('/', validate(createItemSchema, 'body'), createItem);
router.get('/', validate(listItemsQuerySchema, 'query'), listItems);
router.get('/:id', validate(itemIdParamsSchema, 'params'), getItemById);
router.put(
  '/:id',
  validate(itemIdParamsSchema, 'params'),
  validate(updateItemSchema, 'body'),
  updateItem,
);
router.delete('/:id', validate(itemIdParamsSchema, 'params'), deleteItem);

export default router;
