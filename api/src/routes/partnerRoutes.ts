import { Router } from 'express';
import { getPartnerRegistrations } from '../controllers/partnerController';
import { checkPartnerAccess } from '../authMiddleware';

const router = Router();

// Ruta para que los partners (InfoJobs, etc) vean los registros en tiempo real
// Requiere: header 'x-api-key' y el eventId en la URL
router.get('/registrations/:eventId', checkPartnerAccess, getPartnerRegistrations);

// NUEVA: Ruta "Inteligente" - Detecta automáticamente el evento activo para hoy
router.get('/active-event', checkPartnerAccess, getPartnerRegistrations);

export default router;
