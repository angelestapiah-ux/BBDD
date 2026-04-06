import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

export function activitiesRouter(db: Database.Database): Router {
  const router = Router();
  router.use(authenticate);

  router.get('/', (req: AuthenticatedRequest, res: Response) => {
    const { type, status, contact_id, deal_id, company_id, page = '1', limit = '20' } = req.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT a.*,
        c.first_name || ' ' || c.last_name as contact_name,
        co.name as company_name,
        d.title as deal_title,
        u.name as assigned_to_name
      FROM activities a
      LEFT JOIN contacts c ON a.contact_id = c.id
      LEFT JOIN companies co ON a.company_id = co.id
      LEFT JOIN deals d ON a.deal_id = d.id
      LEFT JOIN users u ON a.assigned_to = u.id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (type) { query += ` AND a.type = ?`; params.push(type); }
    if (status) { query += ` AND a.status = ?`; params.push(status); }
    if (contact_id) { query += ` AND a.contact_id = ?`; params.push(contact_id); }
    if (deal_id) { query += ` AND a.deal_id = ?`; params.push(deal_id); }
    if (company_id) { query += ` AND a.company_id = ?`; params.push(company_id); }

    query += ` ORDER BY a.due_date ASC, a.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    res.json({ data: db.prepare(query).all(...params) });
  });

  router.get('/:id', (req: AuthenticatedRequest, res: Response): void => {
    const activity = db.prepare(`
      SELECT a.*, c.first_name || ' ' || c.last_name as contact_name, co.name as company_name, d.title as deal_title
      FROM activities a
      LEFT JOIN contacts c ON a.contact_id = c.id
      LEFT JOIN companies co ON a.company_id = co.id
      LEFT JOIN deals d ON a.deal_id = d.id
      WHERE a.id = ?
    `).get(req.params.id);
    if (!activity) { res.status(404).json({ error: 'Actividad no encontrada' }); return; }
    res.json(activity);
  });

  router.post('/', (req: AuthenticatedRequest, res: Response) => {
    const { type, title, description, status = 'pending', due_date, contact_id, company_id, deal_id, assigned_to } = req.body;
    if (!type || !title) { res.status(400).json({ error: 'Tipo y título son requeridos' }); return; }

    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO activities (id, type, title, description, status, due_date, contact_id, company_id, deal_id, assigned_to, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, type, title, description || null, status, due_date || null, contact_id || null, company_id || null, deal_id || null, assigned_to || null, req.user!.id, now, now);

    res.status(201).json(db.prepare('SELECT * FROM activities WHERE id = ?').get(id));
  });

  router.put('/:id', (req: AuthenticatedRequest, res: Response): void => {
    if (!db.prepare('SELECT id FROM activities WHERE id = ?').get(req.params.id)) {
      res.status(404).json({ error: 'Actividad no encontrada' }); return;
    }
    const { type, title, description, status, due_date, completed_at, contact_id, company_id, deal_id, assigned_to } = req.body;
    const now = new Date().toISOString();
    const completedAt = status === 'completed' ? (completed_at || now) : null;

    db.prepare(`
      UPDATE activities SET type=COALESCE(?,type), title=COALESCE(?,title), description=?, status=COALESCE(?,status), due_date=?, completed_at=?, contact_id=?, company_id=?, deal_id=?, assigned_to=?, updated_at=? WHERE id=?
    `).run(type, title, description, status, due_date, completedAt, contact_id, company_id, deal_id, assigned_to, now, req.params.id);
    res.json(db.prepare('SELECT * FROM activities WHERE id = ?').get(req.params.id));
  });

  router.delete('/:id', (req: AuthenticatedRequest, res: Response): void => {
    if (!db.prepare('SELECT id FROM activities WHERE id = ?').get(req.params.id)) {
      res.status(404).json({ error: 'Actividad no encontrada' }); return;
    }
    db.prepare('DELETE FROM activities WHERE id = ?').run(req.params.id);
    res.json({ message: 'Actividad eliminada' });
  });

  return router;
}
