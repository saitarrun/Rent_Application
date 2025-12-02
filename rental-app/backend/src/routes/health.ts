import { Router } from 'express';
import prisma from '../lib/prisma';
import { logger } from '../lib/logger';

const router = Router();

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    database: 'ok' | 'error';
    api: 'ok' | 'error';
  };
  version: string;
}

router.get('/', async (_req, res) => {
  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: 'error',
      api: 'ok'
    },
    version: process.env.VERSION || '1.0.0'
  };

  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;
    health.checks.database = 'ok';
  } catch (error) {
    logger.error('Database health check failed', error as Error);
    health.checks.database = 'error';
    health.status = 'degraded';
  }

  if (health.checks.database === 'error') {
    health.status = 'unhealthy';
  }

  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 503 : 503;
  res.status(statusCode).json(health);
});

export default router;
