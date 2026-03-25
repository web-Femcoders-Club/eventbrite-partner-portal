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

  // Acepta DNI/NIE español Y pasaportes extranjeros (estricto)
  const isValidDNI = (dni: string, firstName: string = '', lastName: string = '') => {
    if (!dni || dni.trim() === '') return false;
    // Eliminamos espacios internos por si lo escriben como "Y 1234567 B"
    const clean = dni.replace(/\s+/g, '').toUpperCase();
    
    // DNI/NIE español estricto
    if (/^[XYZ0-9][0-9]{7}[TRWAGMYFPDXBNJZSQVHLCKE]$/.test(clean)) return true;
    
    // Si contiene el nombre o el apellido, es un intento de saltarse la validación (ej. "MCorales1")
    const fName = firstName.replace(/\s+/g, '').toUpperCase();
    const lName = lastName.replace(/\s+/g, '').toUpperCase();
    if (fName.length >= 3 && clean.includes(fName)) return false;
    if (lName.length >= 3 && clean.includes(lName)) return false;

    // Pasaporte / ID extranjero: 6 a 15 caracteres estrictamente alfanuméricos
    if (/^[A-Z0-9]{6,15}$/.test(clean) && /[A-Z]/.test(clean) && /[0-9]/.test(clean)) {
      // Un pasaporte/ID real:
      // 1. Tiene al menos 4 números
      // 2. Normalmente no tiene más de 2 letras consecutivas (ej. AB123456). Si meten "Aak116419" o "AAA12345", lo rechazamos.
      const numCount = (clean.match(/[0-9]/g) || []).length;
      if (numCount >= 4 && !/[A-Z]{3,}/.test(clean)) {
        return true;
      }
    }
    
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
        if (!isValidDNI(raw.dni || '', raw.firstName, raw.lastName)) {
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
      const dniInvalid = !dniMissing && !isValidDNI(data.dni || '', raw.firstName, raw.lastName);

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
