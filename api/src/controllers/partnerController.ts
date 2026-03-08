import { Request, Response } from 'express';
import { EventAttendee } from '../database';
import { Op } from 'sequelize';

export const getPartnerRegistrations = async (req: Request, res: Response) => {
  const { eventId } = req.params;
  const partnerAccess = (req as any).partnerAccess;

  try {
    const attendees = await EventAttendee.findAll({
      where: { eventId: eventId },
      attributes: ['firstName', 'lastName', 'dni', 'email', 'orderFirstName', 'orderLastName', 'orderEmail']
    });

    const groupedMap = new Map<string, any>();
    const summary = {
      infoRequested: 0,
      dniMissing: 0,
      dniInvalid: 0,
      multipleEntries: 0
    };

    const isValidDNI = (dni: string) => /^[XYZ0-9][0-9]{7}[TRWAGMYFPDXBNJZSQVHLCKE]$/i.test(dni);

    attendees.forEach(attendee => {
      const raw = attendee.toJSON() as any;
      const fName = (raw.firstName || '').toLowerCase();
      const lName = (raw.lastName || '').toLowerCase();
      const email = (raw.email || '').toLowerCase();
      
      const isPlaceholder = fName.includes('info requested') || fName === 'info' || lName === 'requested' || fName === '';
      
      // La clave maestra es el email de la orden (quien pagó)
      const buyerEmail = (raw.orderEmail || (email.includes('@') ? email : 'unknown')).toLowerCase();
      const identifier = `order-${buyerEmail}`;

      if (groupedMap.has(identifier)) {
        const existing = groupedMap.get(identifier);
        existing.ticketCount++;
        
        if (isPlaceholder) {
          existing.pendingCount = (existing.pendingCount || 0) + 1;
        } else {
          // Si este registro tiene un nombre real diferente al ya guardado, lo añadimos a una lista de invitados
          const guestName = `${raw.firstName} ${raw.lastName}`;
          if (!existing.guests) existing.guests = [];
          
          // Solo lo añadimos si no es el mismo que el "Titular" de la fila
          if (guestName !== `${existing.firstName} ${existing.lastName}`) {
            existing.guests.push(guestName);
          }
        }
      } else {
        const data = { ...raw };
        data.ticketCount = 1;
        data.pendingCount = isPlaceholder ? 1 : 0;
        data.isFullyPending = isPlaceholder;
        data.guests = [];

        // El titular de la fila siempre será el Comprador por defecto si es una reserva grupal
        data.firstName = raw.orderFirstName || raw.firstName;
        data.lastName = raw.orderLastName || raw.lastName;

        const dniMissing = !data.dni || data.dni.trim() === '';
        const dniInvalid = !dniMissing && !isValidDNI(data.dni || '');

        data.alerts = {
          isInfoRequested: isPlaceholder,
          dniMissing,
          dniInvalid,
          hasMultipleEntries: false
        };

        if (isPlaceholder) summary.infoRequested++;
        if (dniMissing && !isPlaceholder) summary.dniMissing++; 
        if (dniInvalid) summary.dniInvalid++;

        data.isIncomplete = isPlaceholder || dniMissing;

        
        groupedMap.set(identifier, data);
      }
    });

    // Post-procesado: Ajustar alertas
    groupedMap.forEach(data => {
      if (data.ticketCount > 1) {
        data.alerts.hasMultipleEntries = true;
        summary.multipleEntries++;
      }
    });

    const processedAttendees = Array.from(groupedMap.values());

    res.json({
      event: eventId,
      partner: partnerAccess.partner.name,
      totalRegistrations: attendees.length,
      uniqueAttendees: processedAttendees.length,
      summary, // Nuevo objeto de sumario
      registrations: processedAttendees,
      fullDataEnabled: partnerAccess.canDownloadFullData,
      message: partnerAccess.canDownloadFullData 
        ? 'Acceso completo habilitado.' 
        : 'Acceso parcial por cumplimiento de RGPD.'
    });

  } catch (error) {
    console.error('Error obteniendo registros:', error);
    res.status(500).json({ error: 'Error al consultar los registros del evento.' });
  }
};
