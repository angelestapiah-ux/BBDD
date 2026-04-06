import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

export function authRouter(db: Database.Database): Router {
  const router = Router();

  // POST /api/auth/login
  router.post('/login', (req: Request, res: Response): void => {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email y contraseña son requeridos' });
      return;
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    const { password_hash, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });
  });

  // POST /api/auth/register
  router.post('/register', (req: Request, res: Response): void => {
    const { name, email, password, role = 'agent' } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Nombre, email y contraseña son requeridos' });
      return;
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      res.status(409).json({ error: 'El email ya está registrado' });
      return;
    }

    const id = uuidv4();
    const passwordHash = bcrypt.hashSync(password, 10);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, email, passwordHash, role, now, now);

    const user = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(id);
    res.status(201).json({ message: 'Usuario creado exitosamente', user });
  });

  // GET /api/auth/me
  router.get('/me', authenticate, (req: AuthenticatedRequest, res: Response): void => {
    const user = db.prepare('SELECT id, name, email, role, avatar, created_at FROM users WHERE id = ?').get(req.user!.id);
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado' });
      return;
    }
    res.json(user);
  });

  return router;
}
