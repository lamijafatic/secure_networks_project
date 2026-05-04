import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { initDatabase } from './config/database';
import authRoutes from './routes/auth.routes';
import twofaRoutes from './routes/twofa.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check
 *     tags:
 *       - System
 *     responses:
 *       200:
 *         description: API is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: ok }
 *                 timestamp: { type: string, example: "2026-05-03T12:00:00.000Z" }
 *                 uptime: { type: number, example: 42.3 }
 */
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/api/docs.json', (_req: Request, res: Response) => {
  res.json(swaggerSpec);
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api', authRoutes);
app.use('/api', twofaRoutes);

const start = async () => {
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Swagger UI:    http://localhost:${PORT}/api/docs`);
    console.log(`Health check:  http://localhost:${PORT}/api/health`);
  });
};

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export default app;
