import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

export function companiesRouter(db: Database.Database): Router {
  const router = Router();
  router.use(authenticate);

  router.get('/', (req: AuthenticatedRequest, res: Response) => {
    const { search, status, page = '1', limit = '20' } = req.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let query = `SELECT c.*, u.name as assigned_to_name, (SELECT COUNT(*) FROM contacts WHERE company_id = c.id) as contacts_count, (SELECT COUNT(*) FROM deals WHERE company_id = c.id) as deals_count FROM companies c LEFT JOIN users u ON c.assigned_to = u.id WHERE 1=1`;
    const params: unknown[] = [];

    if (search) {
      query += ` AND (c.name LIKE ? OR c.industry LIKE ? OR c.city LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (status) { query += ` AND c.status = ?`; params.push(status); }

    query += ` ORDER BY c.updated_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    const companies = db.prepare(query).all(...params);
    res.json({ data: companies, total: companies.length, page: parseInt(page), limit: parseInt(limit) });
  });

  router.get('/:id', (req: AuthenticatedRequest, res: Response): void => {
    const company = db.prepare(`SELECT c.*, u.name as assigned_to_name FROM companies c LEFT JOIN users u ON c.assigned_to = u.id WHERE c.id = ?`).get(req.params.id);
    if (!company) { res.status(404).json({ error: 'Empresa no encontrada' }); return; }
    res.json(company);
  });

  router.post('/', (req: AuthenticatedRequest, res: Response) => {
    const { name, industry, website, email, phone, address, city, country, size, status = 'prospect', notes, assigned_to } = req.body;
    if (!name) { res.status(400).json({ error: 'El nombre de la empresa es requerido' }); return; }

    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO companies (id, name, industry, website, email, phone, address, city, country, size, status, notes, assigned_to, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, industry || null, website || null, email || null, phone || null, address || null, city || null, country || null, size || null, status, notes || null, assigned_to || null, req.user!.id, now, now);

    res.status(201).json(db.prepare('SELECT * FROM companies WHERE id = ?').get(id));
  });

  router.put('/:id', (req: AuthenticatedRequest, res: Response): void => {
    if (!db.prepare('SELECT id FROM companies WHERE id = ?').get(req.params.id)) {
      res.status(404).json({ error: 'Empresa no encontrada' }); return;
    }
    const { name, industry, website, email, phone, address, city, country, size, status, notes, assigned_to } = req.body;
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE companies SET name=COALESCE(?,name), industry=?, website=?, email=?, phone=?, address=?, city=?, country=?, size=?, status=COALESCE(?,status), notes=?, assigned_to=?, updated_at=? WHERE id=?
    `).run(name, industry, website, email, phone, address, city, country, size, status, notes, assigned_to, now, req.params.id);
    res.json(db.prepare('SELECT * FROM companies WHERE id = ?').get(req.params.id));
  });

  router.delete('/:id', (req: AuthenticatedRequest, res: Response): void => {
    if (!db.prepare('SELECT id FROM companies WHERE id = ?').get(req.params.id)) {
      res.status(404).json({ error: 'Empresa no encontrada' }); return;
    }
    db.prepare('DELETE FROM companies WHERE id = ?').run(req.params.id);
    res.json({ message: 'Empresa eliminada' });
  });

  return router;
}
