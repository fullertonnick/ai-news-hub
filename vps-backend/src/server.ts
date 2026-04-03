import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authMiddleware } from './middleware/auth';
import { initDatabase } from './db/client';
import linkedinRouter from './routes/linkedin';
import healthRouter from './routes/health';
import { startScheduler } from './services/scheduler/worker';
import { createLogger } from './logger';
import fs from 'fs';

const log = createLogger('server');
const PORT = parseInt(process.env.PORT || '3001', 10);

// Ensure directories exist
['data', 'logs'].forEach(d => { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); });

// Initialize database
initDatabase();

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check is public (for monitoring)
app.use('/health', healthRouter);

// Everything else requires VPS_SECRET auth
app.use('/api', authMiddleware);
app.use('/api/linkedin', linkedinRouter);

app.listen(PORT, '0.0.0.0', () => {
  log.info(`VPS backend running on port ${PORT}`);

  // Start the LinkedIn automation scheduler
  startScheduler();
});
