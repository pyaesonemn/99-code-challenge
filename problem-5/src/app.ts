import express, { NextFunction, Request, Response } from 'express';
import { notFoundHandler } from '@/middlewares/not-found';
import itemsRouter from '@/routes/items';

const app = express();

app.use(express.json());
app.use('/api/items', itemsRouter);

app.use(notFoundHandler);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
