import { Router, Response } from 'express';
import Database from 'better-sqlite3';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

export function dashboardRouter(db: Database.Database): Router {
  const router = Router();
  router.use(authenticate);

  router.get('/stats', (_req: AuthenticatedRequest, res: Response) => {
    const totalContacts = (db.prepare('SELECT COUNT(*) as c FROM contacts').get() as any).c;
    const totalCompanies = (db.prepare('SELECT COUNT(*) as c FROM companies').get() as any).c;
    const totalDeals = (db.prepare('SELECT COUNT(*) as c FROM deals').get() as any).c;
    const pendingActivities = (db.prepare("SELECT COUNT(*) as c FROM activities WHERE status = 'pending'").get() as any).c;
    const wonValue = (db.prepare("SELECT SUM(value) as v FROM deals WHERE stage = 'closed_won'").get() as any).v || 0;
    const pipelineValue = (db.prepare("SELECT SUM(value) as v FROM deals WHERE stage NOT IN ('closed_won','closed_lost')").get() as any).v || 0;
    const newContactsMonth = (db.prepare("SELECT COUNT(*) as c FROM contacts WHERE created_at >= date('now','-30 days')").get() as any).c;
    const wonDeals = (db.prepare("SELECT COUNT(*) as c FROM deals WHERE stage = 'closed_won'").get() as any).c;

    const dealsByStage = db.prepare(`
      SELECT stage, COUNT(*) as count, SUM(value) as total_value
      FROM deals GROUP BY stage
    `).all();

    const recentActivities = db.prepare(`
      SELECT a.*, c.first_name || ' ' || c.last_name as contact_name, d.title as deal_title
      FROM activities a
      LEFT JOIN contacts c ON a.contact_id = c.id
      LEFT JOIN deals d ON a.deal_id = d.id
      ORDER BY a.created_at DESC LIMIT 5
    `).all();

    const upcomingActivities = db.prepare(`
      SELECT a.*, c.first_name || ' ' || c.last_name as contact_name
      FROM activities a
      LEFT JOIN contacts c ON a.contact_id = c.id
      WHERE a.status = 'pending' AND a.due_date IS NOT NULL
      ORDER BY a.due_date ASC LIMIT 5
    `).all();

    const topDeals = db.prepare(`
      SELECT d.*, c.first_name || ' ' || c.last_name as contact_name, co.name as company_name
      FROM deals d
      LEFT JOIN contacts c ON d.contact_id = c.id
      LEFT JOIN companies co ON d.company_id = co.id
      WHERE d.stage NOT IN ('closed_won','closed_lost')
      ORDER BY d.value DESC LIMIT 5
    `).all();

    res.json({
      stats: {
        totalContacts,
        totalCompanies,
        totalDeals,
        pendingActivities,
        wonValue,
        pipelineValue,
        newContactsMonth,
        wonDeals,
      },
      dealsByStage,
      recentActivities,
      upcomingActivities,
      topDeals,
    });
  });

  return router;
}
