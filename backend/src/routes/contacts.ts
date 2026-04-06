import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

export function contactsRouter(db: Database.Database): Router {
  const router = Router();
  router.use(authenticate);

  // GET /api/contacts
  router.get('/', (req: AuthenticatedRequest, res: Response) => {
    const { search, status, company_id, page = '1', limit = '20' } = req.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT c.*, co.name as company_name, u.name as assigned_to_name
      FROM contacts c
      LEFT JOIN companies co ON c.company_id = co.id
      LEFT JOIN users u ON c.assigned_to = u.id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (search) {
      query += ` AND (c.first_name LIKE ? OR c.last_name LIKE ? OR c.email LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (status) { query += ` AND c.status = ?`; params.push(status); }
    if (company_id) { query += ` AND c.company_id = ?`; params.push(company_id); }

    const total = (db.prepare(`SELECT COUNT(*) as count FROM contacts c WHERE 1=1${status ? ' AND c.status = ?' : ''}${search ? ' AND (c.first_name LIKE ? OR c.last_name LIKE ? OR c.email LIKE ?)' : ''}`).get(...params.slice(0, params.length - (company_id ? 1 : 0))) as any).count;

    query += ` ORDER BY c.updated_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const contacts = db.prepare(query).all(...params);
    res.json({ data: contacts, total, page: parseInt(page), limit: parseInt(limit) });
  });

  // GET /api/contacts/:id
  router.get('/:id', (req: AuthenticatedRequest, res: Response): void => {
    const contact = db.prepare(`
      SELECT c.*, co.name as company_name, u.name as assigned_to_name
      FROM contacts c
      LEFT JOIN companies co ON c.company_id = co.id
      LEFT JOIN users u ON c.assigned_to = u.id
      WHERE c.id = ?
    `).get(req.params.id);

    if (!contact) { res.status(404).json({ error: 'Contacto no encontrado' }); return; }
    res.json(contact);
  });

  // POST /api/contacts
  router.post('/', (req: AuthenticatedRequest, res: Response) => {
    const { first_name, last_name, email, phone, mobile, company_id, position, status = 'lead', source, notes, assigned_to } = req.body;
    if (!first_name || !last_name) {
      res.status(400).json({ error: 'Nombre y apellido son requeridos' });
      return;
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO contacts (id, first_name, last_name, email, phone, mobile, company_id, position, status, source, notes, assigned_to, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, first_name, last_name, email || null, phone || null, mobile || null, company_id || null, position || null, status, source || null, notes || null, assigned_to || null, req.user!.id, now, now);

    const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(id);
    res.status(201).json(contact);
  });

  // PUT /api/contacts/:id
  router.put('/:id', (req: AuthenticatedRequest, res: Response): void => {
    const existing = db.prepare('SELECT id FROM contacts WHERE id = ?').get(req.params.id);
    if (!existing) { res.status(404).json({ error: 'Contacto no encontrado' }); return; }

    const { first_name, last_name, email, phone, mobile, company_id, position, status, source, notes, assigned_to } = req.body;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE contacts SET
        first_name = COALESCE(?, first_name),
        last_name = COALESCE(?, last_name),
        email = ?,
        phone = ?,
        mobile = ?,
        company_id = ?,
        position = ?,
        status = COALESCE(?, status),
        source = ?,
        notes = ?,
        assigned_to = ?,
        updated_at = ?
      WHERE id = ?
    `).run(first_name, last_name, email, phone, mobile, company_id, position, status, source, notes, assigned_to, now, req.params.id);

    const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
    res.json(contact);
  });

  // DELETE /api/contacts/:id
  router.delete('/:id', (req: AuthenticatedRequest, res: Response): void => {
    const existing = db.prepare('SELECT id FROM contacts WHERE id = ?').get(req.params.id);
    if (!existing) { res.status(404).json({ error: 'Contacto no encontrado' }); return; }
    db.prepare('DELETE FROM contacts WHERE id = ?').run(req.params.id);
    res.json({ message: 'Contacto eliminado' });
  });

  return router;
}
