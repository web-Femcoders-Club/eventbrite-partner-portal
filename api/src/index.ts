import cors from 'cors';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import partnerRoutes from './routes/partnerRoutes';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas de Partners
app.use('/api/partners', partnerRoutes);

// Security Middleware: Cache-Control for PII (Personal Identifiable Information)
// As per the plan: No cache in browser to avoid sensitive data leaking in history/cache
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`[server]: API is running at http://localhost:${port}`);
});
