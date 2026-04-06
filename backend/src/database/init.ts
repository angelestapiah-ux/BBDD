import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const DB_PATH = process.env.DB_PATH || './data/renova_crm.db';
const dbDir = path.dirname(DB_PATH);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(DB_PATH);

export function initDatabase(): Database.Database {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Users
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'agent' CHECK(role IN ('admin','agent','viewer')),
      avatar TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Companies
  db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      industry TEXT,
      website TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      city TEXT,
      country TEXT,
      size TEXT CHECK(size IN ('small','medium','large','enterprise')),
      status TEXT NOT NULL DEFAULT 'prospect' CHECK(status IN ('active','inactive','prospect','customer')),
      notes TEXT,
      assigned_to TEXT REFERENCES users(id),
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Contacts
  db.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      mobile TEXT,
      company_id TEXT REFERENCES companies(id),
      position TEXT,
      status TEXT NOT NULL DEFAULT 'lead' CHECK(status IN ('active','inactive','lead','prospect','customer')),
      source TEXT,
      notes TEXT,
      assigned_to TEXT REFERENCES users(id),
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Deals
  db.exec(`
    CREATE TABLE IF NOT EXISTS deals (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      value REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'USD',
      stage TEXT NOT NULL DEFAULT 'lead' CHECK(stage IN ('lead','qualified','proposal','negotiation','closed_won','closed_lost')),
      probability INTEGER NOT NULL DEFAULT 0,
      expected_close_date TEXT,
      contact_id TEXT REFERENCES contacts(id),
      company_id TEXT REFERENCES companies(id),
      assigned_to TEXT REFERENCES users(id),
      notes TEXT,
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Activities
  db.exec(`
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('call','email','meeting','task','note')),
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','completed','cancelled')),
      due_date TEXT,
      completed_at TEXT,
      contact_id TEXT REFERENCES contacts(id),
      company_id TEXT REFERENCES companies(id),
      deal_id TEXT REFERENCES deals(id),
      assigned_to TEXT REFERENCES users(id),
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Seed admin user if not exists
  const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@renova.com');
  if (!adminExists) {
    const passwordHash = bcrypt.hashSync('Renova2024!', 10);
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), 'Administrador Renova', 'admin@renova.com', passwordHash, 'admin', now, now);

    // Seed demo data
    seedDemoData(db);
  }

  console.log('✅ Base de datos inicializada correctamente');
  return db;
}

function seedDemoData(db: Database.Database) {
  const adminId = (db.prepare('SELECT id FROM users WHERE email = ?').get('admin@renova.com') as { id: string }).id;
  const now = new Date().toISOString();

  // Demo companies
  const companies = [
    { id: uuidv4(), name: 'Constructora Horizonte', industry: 'Construcción', city: 'Bogotá', status: 'customer', size: 'large' },
    { id: uuidv4(), name: 'Inversiones Alfa', industry: 'Finanzas', city: 'Medellín', status: 'prospect', size: 'medium' },
    { id: uuidv4(), name: 'Tech Solutions SAS', industry: 'Tecnología', city: 'Cali', status: 'active', size: 'small' },
    { id: uuidv4(), name: 'Grupo Empresarial Norte', industry: 'Retail', city: 'Barranquilla', status: 'customer', size: 'enterprise' },
  ];

  for (const c of companies) {
    db.prepare(`INSERT INTO companies (id, name, industry, city, status, size, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(c.id, c.name, c.industry, c.city, c.status, c.size, adminId, now, now);
  }

  // Demo contacts
  const contacts = [
    { id: uuidv4(), first: 'Carlos', last: 'Rodríguez', email: 'carlos@horizonte.com', company_id: companies[0].id, status: 'customer', position: 'Gerente' },
    { id: uuidv4(), first: 'María', last: 'López', email: 'maria@alfa.com', company_id: companies[1].id, status: 'prospect', position: 'Directora Financiera' },
    { id: uuidv4(), first: 'Juan', last: 'Martínez', email: 'juan@tech.com', company_id: companies[2].id, status: 'lead', position: 'CTO' },
    { id: uuidv4(), first: 'Ana', last: 'García', email: 'ana@gruponorte.com', company_id: companies[3].id, status: 'active', position: 'CEO' },
    { id: uuidv4(), first: 'Pedro', last: 'Sánchez', email: 'pedro@email.com', company_id: undefined, status: 'lead', position: 'Independiente' },
  ];

  for (const c of contacts) {
    db.prepare(`INSERT INTO contacts (id, first_name, last_name, email, company_id, status, position, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(c.id, c.first, c.last, c.email, c.company_id || null, c.status, c.position, adminId, now, now);
  }

  // Demo deals
  const deals = [
    { id: uuidv4(), title: 'Renovación Sede Principal', value: 85000000, stage: 'negotiation', probability: 70, contact_id: contacts[0].id, company_id: companies[0].id },
    { id: uuidv4(), title: 'Sistema CRM Módulo Financiero', value: 45000000, stage: 'proposal', probability: 50, contact_id: contacts[1].id, company_id: companies[1].id },
    { id: uuidv4(), title: 'Consultoría Tech 2024', value: 20000000, stage: 'qualified', probability: 40, contact_id: contacts[2].id, company_id: companies[2].id },
    { id: uuidv4(), title: 'Expansión Retail Norte', value: 150000000, stage: 'closed_won', probability: 100, contact_id: contacts[3].id, company_id: companies[3].id },
    { id: uuidv4(), title: 'Proyecto Independiente Beta', value: 8000000, stage: 'lead', probability: 20, contact_id: contacts[4].id, company_id: undefined },
  ];

  for (const d of deals) {
    db.prepare(`INSERT INTO deals (id, title, value, currency, stage, probability, contact_id, company_id, created_by, created_at, updated_at)
      VALUES (?, ?, ?, 'COP', ?, ?, ?, ?, ?, ?, ?)`
    ).run(d.id, d.title, d.value, d.stage, d.probability, d.contact_id, d.company_id || null, adminId, now, now);
  }

  // Demo activities
  const activities = [
    { id: uuidv4(), type: 'call', title: 'Llamada de seguimiento', status: 'pending', contact_id: contacts[0].id, deal_id: deals[0].id },
    { id: uuidv4(), type: 'meeting', title: 'Reunión presentación propuesta', status: 'completed', contact_id: contacts[1].id, deal_id: deals[1].id },
    { id: uuidv4(), type: 'email', title: 'Enviar cotización', status: 'pending', contact_id: contacts[2].id, deal_id: deals[2].id },
    { id: uuidv4(), type: 'task', title: 'Preparar contrato', status: 'completed', contact_id: contacts[3].id, deal_id: deals[3].id },
    { id: uuidv4(), type: 'note', title: 'Interesado en expansión Q2', status: 'completed', contact_id: contacts[4].id },
  ];

  for (const a of activities) {
    db.prepare(`INSERT INTO activities (id, type, title, status, contact_id, deal_id, created_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(a.id, a.type, a.title, a.status, a.contact_id || null, (a as any).deal_id || null, adminId, now, now);
  }

  console.log('✅ Datos de demo insertados');
}

export default db;
