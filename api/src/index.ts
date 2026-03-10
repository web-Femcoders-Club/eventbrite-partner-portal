// Force redeploy - Update: Responsive & Social Security Fixes
import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import path from 'path';
import adminRoutes from './routes/adminRoutes';
import partnerRoutes from './routes/partnerRoutes';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middlewares de Producción (Senior Standard)
app.use(helmet({
  contentSecurityPolicy: false, // Desactivado para simplificar la carga del frontend unificado
}));
app.use(compression() as any); 
app.use(cors() as any);
app.use(express.json());

// Rutas de Partners
app.use('/api/partners', partnerRoutes);

// Rutas de Administración (Exclusivas FemCoders)
app.use('/api/admin', adminRoutes);

// Servir Frontend en producción (Un solo servicio en Railway)
const webDistPath = path.join(__dirname, '../../web/dist');
app.use(express.static(webDistPath));

// Rutas del Frontend (SPA fallback)
app.get('*', (req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(webDistPath, 'index.html'));
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`[server]: API is running at http://localhost:${port}`);
});
