import { jwt } from 'hono/jwt';
import { env } from '../env.js';

export interface JwtPayload {
  sub: number;
  email: string;
  role: string;
  exp: number;
}

export const authMiddleware = jwt({ secret: env.JWT_SECRET, alg: 'HS256' });
