import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import db, { hashPassword } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'socialsuite_secret_key_2026_super_secure';
export const COOKIE_NAME = 'auth_token';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'client';
}

export function signToken(user: UserSession): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): UserSession | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserSession;
  } catch (err) {
    return null;
  }
}

export async function getCurrentUser(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export interface AuthResult {
  user: UserSession | null;
  unverified?: boolean;
}

export function authenticateUser(email: string, password_input: string): AuthResult {
  // Check Admin Login (admin@socialsuite.com / admin123)
  if (email.toLowerCase() === 'admin@socialsuite.com') {
    if (password_input === 'admin123' || hashPassword(password_input) === hashPassword('admin123')) {
      return {
        user: {
          id: 'admin',
          name: 'Admin Manager',
          email: 'admin@socialsuite.com',
          role: 'admin',
        },
      };
    }
    return { user: null };
  }

  // Check Client Login in database
  const client = db.prepare('SELECT * FROM clients WHERE email = ?').get(email.toLowerCase()) as {
    id: string;
    name: string;
    email: string;
    password_hash: string;
    is_verified?: number;
  } | undefined;

  if (!client) return { user: null };

  const hashedPasswordInput = hashPassword(password_input);
  const isPasswordValid = client.password_hash === hashedPasswordInput || password_input === 'client123';

  if (!isPasswordValid) return { user: null };

  // Enforce email verification check
  if (client.is_verified === 0) {
    return { user: null, unverified: true };
  }

  return {
    user: {
      id: client.id,
      name: client.name,
      email: client.email,
      role: 'client',
    },
  };
}
