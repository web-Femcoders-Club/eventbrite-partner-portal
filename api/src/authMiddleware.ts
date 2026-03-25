import { Partner, PartnerAccess, Event } from './database';
import { Request, Response, NextFunction } from 'express';
import { Op } from 'sequelize';

export const checkPartnerAccess = async (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];
  let eventId = req.params.eventId;

  if (!apiKey) return res.status(401).json({ 
    error: 'API Key requerida',
    message: 'No se ha detectado ninguna clave de acceso en los headers (x-api-key). Por favor, contacta con irina.ichim@femcodersclub.com.' 
  });

  try {
    const now = new Date();
    
    // 1. Identificar al Partner por su API Key
    const partner = await Partner.findOne({ where: { apiKey, status: 'active' } });
    if (!partner) {
      return res.status(403).json({ 
        error: 'Partner no autorizado',
        message: 'La clave de acceso no pertenece a un socio activo. Contacta con irina.ichim@femcodersclub.com.' 
      });
    }

    // 2. Si NO viene un eventId en los params, buscamos el evento activo actual para ESTE partner
    if (!eventId) {
      const activeAccess = await PartnerAccess.findOne({
        include: [{ model: Event, as: 'event' }],
        where: {
          partnerId: partner.get('id'),
          startDate: { [Op.lte]: now },
          endDate: { [Op.gte]: now }
        },
        order: [['endDate', 'DESC']]
      });

      if (!activeAccess) {
        return res.status(403).json({ 
          error: 'Sin eventos activos',
          message: 'No tienes ningún acceso programado para la fecha de hoy. Contacta con irina.ichim@femcodersclub.com para activar tu acceso al próximo evento.',
          contact: 'irina.ichim@femcodersclub.com'
        });
      }
      
      // Inyectamos el ID del evento detectado automáticamente
      const accessJson = activeAccess.toJSON() as any;
      const detectedEvent = accessJson.event;
      
      if (!detectedEvent || !detectedEvent.id) {
        return res.status(403).json({ 
          error: 'Error de vinculación',
          message: 'Se encontró un acceso pero el evento no está disponible en la base de datos de Railway.',
          debug: { 
            partnerId: partner.get('id'),
            foundAccessId: activeAccess.get('id'),
            rawEventIdInAccess: activeAccess.get('eventId'),
            availableKeysInAccess: Object.keys(activeAccess.toJSON())
          }
        });
      }

      eventId = detectedEvent.id;
      req.params.eventId = eventId; 
    }

    // 3. Verificamos el acceso específico para ese evento (el proporcionado o el detectado)
    const access = await PartnerAccess.findOne({
      where: {
        partnerId: partner.get('id'),
        eventId: eventId,
        startDate: { [Op.lte]: now },
        endDate: { [Op.gte]: now }
      }
    });

    if (!access) {
      return res.status(403).json({ 
        error: 'Acceso temporal finalizado o no autorizado',
        message: 'Tu periodo de acceso al portal ha concluido. Si necesitas renovar el acceso o tienes alguna duda, por favor ponte en contacto con Irina Ichim en irina.ichim@femcodersclub.com.',
        contact: 'irina.ichim@femcodersclub.com'
      });
    }

    // Guardamos la info para el controlador (info del partner y nivel de acceso)
    (req as any).partnerAccess = {
      ...access.toJSON(),
      partner: partner.toJSON(),
      eventId: eventId
    };
    
    next();
  } catch (error) {
    console.error('Error en el Guardián:', error);
    res.status(500).json({ 
      error: 'Error de verificación',
      message: 'Hubo un problema técnico al verificar tus permisos. Contacta con irina.ichim@femcodersclub.com'
    });
  }
};
