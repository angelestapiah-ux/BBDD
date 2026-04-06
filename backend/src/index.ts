import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

import { initDatabase } from './database/init';
import { authRouter } from './routes/auth';
import { contactsRouter } from './routes/contacts';
import { companiesRouter } from './routes/companies';
import { dealsRouter } from './routes/deals';
import { activitiesRouter } from './routes/activities';
import { dashboardRouter } from './routes/dashboard';

const app = express();
const PORT = process.env.PORT || 3001;

// Init DB
const db = initDatabase();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRouter(db));
app.use('/api/contacts', contactsRouter(db));
app.use('/api/companies', companiesRouter(db));
app.use('/api/deals', dealsRouter(db));
app.use('/api/activities', activitiesRouter(db));
app.use('/api/dashboard', dashboardRouter(db));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0', app: 'Renova CRM' });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  const frontendPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Renova CRM Backend corriendo en puerto ${PORT}`);
  console.log(`📊 API disponible en http://localhost:${PORT}/api`);
});

export default app;
