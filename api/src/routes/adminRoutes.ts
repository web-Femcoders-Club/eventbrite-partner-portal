import { Router } from 'express';
import { getTemplatePreview, migrateDb, notifyAttendee, sendTestEmail, syncBrevo, syncBrevoStatus, syncPreview } from '../controllers/adminController';
import { Partner } from '../database';

const router = Router();

router.get('/migrate-db', migrateDb);

// Middleware de seguridad ultra-estricto para Admin
const strictAdminAuth = async (req: any, res: any, next: any) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return res.status(401).json({ error: 'No autorizado' });

  const partner = await Partner.findOne({ where: { apiKey, status: 'active' } }) as any;
  const isFemCoders = partner?.slug === 'femcoders-admin' || partner?.name?.includes('Admin');

  if (!isFemCoders) {
    return res.status(403).json({ error: 'Acceso denegado: Solo administradores' });
  }

  next();
};

router.post('/sync-brevo', strictAdminAuth, syncBrevo);
router.post('/send-test-email', strictAdminAuth, sendTestEmail);
router.post('/notify-attendee', strictAdminAuth, notifyAttendee);
router.get('/sync-preview', strictAdminAuth, syncPreview);
router.get('/sync-brevo-status', strictAdminAuth, syncBrevoStatus);
router.get('/email-template-preview', strictAdminAuth, getTemplatePreview);

export default router;
