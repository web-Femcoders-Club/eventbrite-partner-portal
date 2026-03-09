import cors from 'cors';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import partnerRoutes from './routes/partnerRoutes';

dotenv.config();

import { sequelize } from './database';

import path from 'path';

const app = express();
const port = process.env.PORT || 3001;

// Middlewares de Producción (Senior Standard)
app.use(helmet({
  contentSecurityPolicy: false, // Desactivado para simplificar la carga del frontend unificado
}));
app.use(compression()); // Acelera la carga de archivos estáticos
app.use(cors());
app.use(express.json());

// Rutas de Partners
app.use('/api/partners', partnerRoutes);

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
