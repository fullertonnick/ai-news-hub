import { Request, Response, NextFunction } from 'express';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.VPS_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'VPS_SECRET not configured' });
  }

  const auth = req.headers.authorization;
  if (!auth || auth !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}
