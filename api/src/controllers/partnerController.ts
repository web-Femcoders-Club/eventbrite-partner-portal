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

  // Acepta DNI/NIE español Y pasaportes extranjeros (>= 8 caracteres alfanuméricos mixtos)
  const isValidDNI = (dni: string) => {
    if (!dni || dni.trim() === '') return false;
    const clean = dni.trim();
    // DNI/NIE español
    if (/^[XYZ0-9][0-9]{7}[TRWAGMYFPDXBNJZSQVHLCKE]$/i.test(clean)) return true;
    // Pasaporte extranjero: >= 8 chars, contiene letras Y dígitos
    if (clean.length >= 8 && /[A-Za-z]/.test(clean) && /[0-9]/.test(clean)) return true;
    return false;
  };

  attendees.forEach(attendee => {
    const raw = attendee.toJSON() as any;
    const fName = (raw.firstName || '').toLowerCase();
    const lName = (raw.lastName || '').toLowerCase();
    const email = (raw.email || '').toLowerCase();
    
    const isPlaceholder = fName.includes('info requested') || fName === 'info' || lName === 'requested' || fName === '';
    
    const buyerEmail = (raw.orderEmail || (email.includes('@') ? email : 'unknown')).toLowerCase();
    const identifier = `order-${buyerEmail}`;

    if (groupedMap.has(identifier)) {
      const existing = groupedMap.get(identifier);
      existing.ticketCount++;
      
      if (isPlaceholder) {
        existing.pendingCount = (existing.pendingCount || 0) + 1;
        existing.hasGuestWithNoData = true;
      } else {
        const guestName = `${raw.firstName} ${raw.lastName}`;
        if (!existing.guests) existing.guests = [];
        if (guestName !== `${existing.firstName} ${existing.lastName}`) {
          existing.guests.push(guestName);
        }
        // Si el invitado tiene DNI inválido, lo marcamos
        if (!isValidDNI(raw.dni || '')) {
          existing.hasGuestWithBadDni = true;
        }
      }
    } else {
      const data = { ...raw };
      data.ticketCount = 1;
      data.pendingCount = isPlaceholder ? 1 : 0;
      data.isFullyPending = isPlaceholder;
      data.guests = [];
      data.hasGuestWithNoData = false;
      data.hasGuestWithBadDni = false;

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

      data.isIncomplete = isPlaceholder || dniMissing || dniInvalid;

      groupedMap.set(identifier, data);
    }
  });

  // Post-procesado: calcular summary DESPUÉS de agrupar para que sea preciso
  const summary = {
    sinIdentificacion: 0,
    conAcompanantes: 0
  };

  groupedMap.forEach(data => {
    if (data.ticketCount > 1) {
      data.alerts.hasMultipleEntries = true;
      summary.conAcompanantes++;
    }
    // Sin identificación válida: titular con DNI malo/vacio, o tiene invitados sin datos/DNI
    const titularSinDni = data.alerts.isInfoRequested || data.alerts.dniMissing || data.alerts.dniInvalid;
    const invitadoSinDni = data.hasGuestWithNoData || data.hasGuestWithBadDni;
    if (titularSinDni || invitadoSinDni) {
      summary.sinIdentificacion++;
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
    res.status(500).json({ error: 'Error al consultar los registros del evento.' });
  }
};
