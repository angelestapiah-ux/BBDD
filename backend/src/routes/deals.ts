import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

export function dealsRouter(db: Database.Database): Router {
  const router = Router();
  router.use(authenticate);

  router.get('/', (req: AuthenticatedRequest, res: Response) => {
    const { search, stage, contact_id, company_id, page = '1', limit = '50' } = req.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT d.*,
        c.first_name || ' ' || c.last_name as contact_name,
        co.name as company_name,
        u.name as assigned_to_name
      FROM deals d
      LEFT JOIN contacts c ON d.contact_id = c.id
      LEFT JOIN companies co ON d.company_id = co.id
      LEFT JOIN users u ON d.assigned_to = u.id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (search) {
      query += ` AND d.title LIKE ?`;
      params.push(`%${search}%`);
    }
    if (stage) { query += ` AND d.stage = ?`; params.push(stage); }
    if (contact_id) { query += ` AND d.contact_id = ?`; params.push(contact_id); }
    if (company_id) { query += ` AND d.company_id = ?`; params.push(company_id); }

    query += ` ORDER BY d.updated_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), offset);

    res.json({ data: db.prepare(query).all(...params) });
  });

  router.get('/stats', (req: AuthenticatedRequest, res: Response) => {
    const stats = db.prepare(`
      SELECT
        stage,
        COUNT(*) as count,
        SUM(value) as total_value,
        AVG(probability) as avg_probability
      FROM deals
      GROUP BY stage
    `).all();

    const total = db.prepare(`SELECT COUNT(*) as count, SUM(value) as total FROM deals`).get() as any;
    const won = db.prepare(`SELECT COUNT(*) as count, SUM(value) as total FROM deals WHERE stage = 'closed_won'`).get() as any;

    res.json({ by_stage: stats, total_deals: total.count, total_value: total.total || 0, won_deals: won.count, won_value: won.total || 0 });
  });

  router.get('/:id', (req: AuthenticatedRequest, res: Response): void => {
    const deal = db.prepare(`
      SELECT d.*, c.first_name || ' ' || c.last_name as contact_name, co.name as company_name, u.name as assigned_to_name
      FROM deals d
      LEFT JOIN contacts c ON d.contact_id = c.id
      LEFT JOIN companies co ON d.company_id = co.id
      LEFT JOIN users u ON d.assigned_to = u.id
      WHERE d.id = ?
    `).get(req.params.id);
    if (!deal) { res.status(404).json({ error: 'Negocio no encontrado' }); return; }
    res.json(deal);
  });

  router.post('/', (req: AuthenticatedRequest, res: Response) => {
    const { title, value = 0, currency = 'COP', stage = 'lead', probability = 20, expected_close_date, contact_id, company_id, notes, assigned_to } = req.body;
    if (!title) { res.status(400).json({ error: 'El título del negocio es requerido' }); return; }

    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO deals (id, title, value, currency, stage, probability, expected_close_date, contact_id, company_id, notes, assigned_to, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, value, currency, stage, probability, expected_close_date || null, contact_id || null, company_id || null, notes || null, assigned_to || null, req.user!.id, now, now);

    res.status(201).json(db.prepare('SELECT * FROM deals WHERE id = ?').get(id));
  });

  router.put('/:id', (req: AuthenticatedRequest, res: Response): void => {
    if (!db.prepare('SELECT id FROM deals WHERE id = ?').get(req.params.id)) {
      res.status(404).json({ error: 'Negocio no encontrado' }); return;
    }
    const { title, value, currency, stage, probability, expected_close_date, contact_id, company_id, notes, assigned_to } = req.body;
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE deals SET title=COALESCE(?,title), value=COALESCE(?,value), currency=COALESCE(?,currency), stage=COALESCE(?,stage), probability=COALESCE(?,probability), expected_close_date=?, contact_id=?, company_id=?, notes=?, assigned_to=?, updated_at=? WHERE id=?
    `).run(title, value, currency, stage, probability, expected_close_date, contact_id, company_id, notes, assigned_to, now, req.params.id);
    res.json(db.prepare('SELECT * FROM deals WHERE id = ?').get(req.params.id));
  });

  router.delete('/:id', (req: AuthenticatedRequest, res: Response): void => {
    if (!db.prepare('SELECT id FROM deals WHERE id = ?').get(req.params.id)) {
      res.status(404).json({ error: 'Negocio no encontrado' }); return;
    }
    db.prepare('DELETE FROM deals WHERE id = ?').run(req.params.id);
    res.json({ message: 'Negocio eliminado' });
  });

  return router;
}
