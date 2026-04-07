import { RequestHandler } from 'express';
import { z } from 'zod';

type ValidationSource = 'body' | 'params' | 'query';

export function validate(
  schema: z.ZodTypeAny,
  source: ValidationSource,
): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      return res.status(400).json({
        error: result.error.issues[0]?.message ?? 'Invalid request',
      });
    }

    Object.defineProperty(req, source, {
      value: result.data,
      configurable: true,
      enumerable: true,
      writable: true,
    });
    next();
  };
}
