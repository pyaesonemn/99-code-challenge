import { NextFunction, Request, Response } from 'express';
import {
  CreateItemInput,
  ItemIdParams,
  ListItemsQuery,
  UpdateItemInput,
} from '@/schemas/items.schema';
import * as itemsService from '@/services/items.service';

export function createItem(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    const item = itemsService.createItem(req.body as CreateItemInput);
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
}

export function listItems(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    const response = itemsService.listItems(req.query as unknown as ListItemsQuery);
    res.json(response);
  } catch (error) {
    next(error);
  }
}

export function getItemById(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    const params = req.params as unknown as ItemIdParams;
    const item = itemsService.getItemById(params.id);

    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    res.json(item);
  } catch (error) {
    next(error);
  }
}

export function updateItem(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    const params = req.params as unknown as ItemIdParams;
    const item = itemsService.updateItem(
      params.id,
      req.body as UpdateItemInput,
    );

    if (!item) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    res.json(item);
  } catch (error) {
    next(error);
  }
}

export function deleteItem(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    const params = req.params as unknown as ItemIdParams;
    const deleted = itemsService.deleteItem(params.id);

    if (!deleted) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
