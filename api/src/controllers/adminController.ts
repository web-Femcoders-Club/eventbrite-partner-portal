import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { Event, EventAttendee } from '../database';

const SibApiV3Sdk = require('@getbrevo/brevo');

const CORPORATE_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.8; color: #1a1a3a; margin: 0; padding: 0; background-color: #ffffff; }
    .wrapper { padding: 40px 20px; text-align: center; background-color: #fcfcfd; }
    .container { max-width: 580px; margin: 0 auto; text-align: left; background: #ffffff; padding: 40px; border-radius: 8px; border: 1px solid #f0f0f5; }
    .header { padding-bottom: 30px; text-align: center; }
    .logo { height: 60px; width: auto; }
    .main-text { font-size: 16px; color: #2a2a4e; margin-bottom: 30px; }
    .text-es { font-weight: 500; margin-bottom: 30px; padding-bottom: 30px; border-bottom: 1px solid #f0f0f5; }
    .text-en { color: #5a5a7d; font-style: italic; font-size: 15px; margin-top: 0; }
    .cta-container { padding: 30px 0; text-align: center; }
    .btn { background-color: #ea4f33 !important; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; display: inline-block; }
    .footer { padding-top: 30px; margin-top: 30px; border-top: 1px solid #f0f0f5; text-align: center; font-size: 12px; color: #a0a0b0; }
    .social-links { margin-top: 15px; }
    .social-links a { margin: 0 10px; color: #ea4f33; text-decoration: none; font-weight: bold; }
    h1 { font-size: 22px; color: #1a1a3a; margin-bottom: 20px; text-align: center; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <img src="{{LOGO_SRC}}" alt="FemCoders Club" class="logo">
      </div>
      
      <div class="main-text">
        <div class="text-es">
          {{NOTICE_ES}}
        </div>

        <div class="text-en">
          {{NOTICE_EN}}
        </div>
      </div>

      <div class="cta-container">
        <a href="https://www.eventbrite.es/myevent" class="btn">Actualizar Registro / Update Registration</a>
      </div>

      <div class="footer">
        <p><strong>&copy; 2026 FemCoders Club</strong></p>
        <p>Enviado con ❤️ desde la comunidad.</p>
        <div class="social-links">
          <a href="https://www.femcodersclub.com">Web</a> | 
          <a href="https://www.linkedin.com/company/100394366/">LinkedIn</a> | 
          <a href="https://www.instagram.com/femcoders_club/">Instagram</a>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
`;

/**
 * Solo nos enfocamos en detectar quiénes faltan por corregir datos o tienen múltiples entradas.
 * Devolvemos una lista simple y funcional.
 */
export const syncPreview = async (req: Request, res: Response) => {
  try {
    const latestEvent = await Event.findOne({ order: [['start_local', 'DESC']] });
    if (!latestEvent) return res.status(404).json({ error: 'Evento no encontrado' });

    const eventId = latestEvent.get('id');
    const attendees = await EventAttendee.findAll({ 
      where: { eventId },
      attributes: ['id', 'firstName', 'lastName', 'email', 'dni', 'orderFirstName', 'orderLastName', 'orderEmail', 'brevoNotified', 'brevoNotifiedAt']
    });

    const buyerMap = new Map<string, any>();
    const isValidDNI = (dni: string) => /^[XYZ0-9][0-9]{7}[TRWAGMYFPDXBNJZSQVHLCKE]$/i.test(dni || '');

    attendees.forEach(a => {
      const raw = a.toJSON() as any;
      const buyerEmail = (raw.orderEmail || raw.email || 'unknown').toLowerCase();
      
      if (!buyerMap.has(buyerEmail)) {
        buyerMap.set(buyerEmail, {
          email: buyerEmail,
          name: `${raw.orderFirstName || raw.firstName} ${raw.orderLastName || raw.lastName}`,
          isNotified: raw.brevoNotified || false,
          notifiedAt: raw.brevoNotifiedAt,
          ticketsCount: 0,
          needsCorrection: false,
          reasons: []
        });
      }
      
      const b = buyerMap.get(buyerEmail);
      b.ticketsCount++;
      // Si alguno de los tickets ya fue notificado, marcamos al comprador como notificado
      if (raw.brevoNotified) b.isNotified = true;
      
      const hasBadDni = !raw.dni || raw.dni.trim() === '' || !isValidDNI(raw.dni) || (raw.firstName || '').toLowerCase().includes('info requested');
      
      if (hasBadDni && !b.reasons.includes('DNI Incompleto')) {
        b.reasons.push('DNI Incompleto');
        b.needsCorrection = true;
      }
    });

    buyerMap.forEach(b => {
      if (b.ticketsCount > 1) {
        b.reasons.push('Múltiples Entradas');
        b.needsCorrection = true;
      }
    });

    const previewList = Array.from(buyerMap.values())
      .filter(b => b.needsCorrection)
      .map(b => {
        let motive = b.reasons.join(', ');
        // Lógica de tipo inteligente
        let type = 'dni';
        if (b.reasons.includes('DNI Incompleto') && b.reasons.includes('Múltiples Entradas')) {
          type = 'both';
        } else if (b.reasons.includes('Múltiples Entradas')) {
          type = 'multiple';
        }
        
        return {
          email: b.email,
          name: b.name,
          isNotified: b.isNotified,
          notifiedAt: b.notifiedAt,
          motive: motive,
          type: type
        };
      });

    return res.json({ success: true, previewList });
  } catch (error: any) {
    res.status(500).json({ 
      error: 'Error al obtener la lista de destinatarios.'
    });
  }
};

/**
 * Fuerza la actualización de la base de datos para añadir columnas faltantes
 */
export const migrateDb = async (req: Request, res: Response) => {
  try {
    const { sequelize } = require('../database');
    
    // Añadimos columnas manualmente si no existen para evitar errores de Sequelize sync
    const [columns]: any = await sequelize.query("SHOW COLUMNS FROM event_attendee");
    const colNames = columns.map((c: any) => c.Field);

    if (!colNames.includes('brevoNotified')) {
      await sequelize.query("ALTER TABLE event_attendee ADD COLUMN brevoNotified BOOLEAN DEFAULT FALSE");
    }
    if (!colNames.includes('brevoNotifiedAt')) {
      await sequelize.query("ALTER TABLE event_attendee ADD COLUMN brevoNotifiedAt DATETIME NULL");
    }

    return res.json({ success: true, message: 'Base de datos actualizada correctamente.' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * Envía la notificación real a un asistente y actualiza la base de datos
 */
export const notifyAttendee = async (req: Request, res: Response) => {
  try {
    const { email, type } = req.body;
    if (!email || !type) return res.status(400).json({ error: 'Falta email o tipo de notificación.' });

    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    apiInstance.authentications['apiKey'].apiKey = process.env.BREVO_API_KEY;

    let noticeEs = '';
    let noticeEn = '';
    let subject = '';

    if (type === 'dni') {
      subject = 'FemCoders: Registro incompleto';
      noticeEs = '¡Hola!<br><br>Desde FemCoders Club te agradecemos muchísimo tu interés en nuestro evento. Hemos revisado los datos y parece que tu registro está incompleto.<br><br>No te preocupes, puedes completarlo fácilmente a través de tu cuenta de Eventbrite. Si lo prefieres o no puedes hacerlo ahora, es <strong>imprescindible que traigas tu DNI/NIE físico</strong> el día del evento para poder acceder a las oficinas de InfoJobs. Te ayudaremos encantadas en la entrada.<br><br>¡Nos vemos pronto!';
      noticeEn = 'Hi!<br><br>From FemCoders Club, we thank you so much for your interest in our event. We have reviewed the details and it seems your registration is incomplete.<br><br>Don’t worry, you can easily complete it through your Eventbrite account. If you prefer, please make sure to <strong>bring your physical ID (DNI)</strong> on the day of the event to access the InfoJobs offices. We will be happy to help you at the entrance.<br><br>See you soon!';
    } else if (type === 'multiple') {
      subject = 'FemCoders: Información sobre tus entradas';
      noticeEs = '¡Hola!<br><br>Muchas gracias por registrarte. Hemos visto que tienes varias entradas a tu nombre, ¡qué alegría! Para agilizar el acceso a las oficinas, te pedimos por favor que identifiques a tus acompañantes en Eventbrite.<br><br>Si no es posible, recordad que es <strong>obligatorio que todas traigáis vuestro DNI/NIE físico</strong> el día del evento para que el registro sea fluido y podáis entrar.<br><br>¡Gracias!';
      noticeEn = 'Hi!<br><br>Thank you so much for registering. We noticed you have several tickets under your name, how exciting! To speed up access to the offices, we kindly ask you to identify your guests on Eventbrite.<br><br>If that’s not possible, remember it is <strong>mandatory for everyone to bring their physical ID (DNI)</strong> on the day of the event to ensure smooth registration and entry.<br><br>Thanks!';
    } else if (type === 'both') {
      subject = 'FemCoders: Información importante sobre tu registro';
      noticeEs = '¡Hola!<br><br>Muchas gracias por tu interés en nuestro evento. Hemos revisado los datos y hemos detectado que <strong>tu registro está incompleto</strong> y que además tienes <strong>varias entradas a tu nombre</strong>.<br><br>Para garantizar un acceso fluido a las oficinas de InfoJobs, te pedimos por favor que completes tus datos y que identifiques a tus acompañantes a través de Eventbrite.<br><br>Si no fuera posible hacerlo antes del evento, recordad que es <strong>imprescindible que todas traigáis vuestro DNI/NIE físico</strong> para poder entrar. ¡Nos vemos muy pronto!';
      noticeEn = 'Hi!<br><br>Thank you so much for your interest in our event. We have noticed that <strong>your registration is incomplete</strong> and that you also have <strong>multiple tickets under your name</strong>.<br><br>To ensure everyone can enter the InfoJobs offices smoothly, we kindly ask you to complete your details and identify your guests on Eventbrite.<br><br>If that’s not possible before the event, please remember it is <strong>mandatory for everyone to bring their physical ID (DNI)</strong> to be allowed entry. See you very soon!';
    }

    const htmlContent = CORPORATE_TEMPLATE
      .replace('{{NOTICE_ES}}', noticeEs)
      .replace('{{NOTICE_EN}}', noticeEn)
      .replace('{{LOGO_SRC}}', 'cid:logo-femcoders.jpg');

    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = htmlContent;
    sendSmtpEmail.sender = { name: "FemCoders Club", email: "info@femcodersclub.com" };
    sendSmtpEmail.to = [{ email }];

    // Adjuntar logo CID
    const logoPath = path.join(__dirname, '../../../web/public/logo/logo-femcoders.jpg');
    if (fs.existsSync(logoPath)) {
      sendSmtpEmail.attachment = [{
        content: fs.readFileSync(logoPath).toString('base64'),
        name: 'logo-femcoders.jpg'
      }];
    }

    await apiInstance.sendTransacEmail(sendSmtpEmail);

    // Actualizar base de datos (todos los registros de ese email para el evento actual)
    const latestEvent = await Event.findOne({ order: [['start_local', 'DESC']] });
    if (latestEvent) {
      await EventAttendee.update(
        { brevoNotified: true, brevoNotifiedAt: new Date() },
        { where: { email, eventId: latestEvent.get('id') } }
      );
    }

    return res.json({ success: true, message: 'Notificación enviada y registrada.' });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Error al enviar notificación' });
  }
};

/**
 * Funciones deshabilitadas para evitar errores
 */
export const syncBrevo = async (req: Request, res: Response) => {
  return res.status(501).json({ error: 'Deshabilitado' });
};

export const sendTestEmail = async (req: Request, res: Response) => {
  try {
    const { testEmail, type } = req.body;
    if (!testEmail) return res.status(400).json({ error: 'Falta el email de destino.' });

    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    apiInstance.authentications['apiKey'].apiKey = process.env.BREVO_API_KEY;
    
    let noticeEs = '';
    let noticeEn = '';

    if (type === 'dni') {
      noticeEs = '¡Hola!<br><br>Desde FemCoders Club te agradecemos muchísimo tu interés en nuestro evento. Hemos revisado los datos y parece que tu registro está incompleto.<br><br>No te preocupes, puedes completarlo fácilmente a través de tu cuenta de Eventbrite. Si lo prefieres o no puedes hacerlo ahora, es <strong>imprescindible que traigas tu DNI/NIE físico</strong> el día del evento para poder acceder a las oficinas de InfoJobs. Te ayudaremos encantadas en la entrada.<br><br>¡Nos vemos pronto!';
      noticeEn = 'Hi!<br><br>From FemCoders Club, we thank you so much for your interest in our event. We have reviewed the details and it seems your registration is incomplete.<br><br>Don’t worry, you can easily complete it through your Eventbrite account. If you prefer, please make sure to <strong>bring your physical ID (DNI/NIE)</strong> on the day of the event to access the InfoJobs offices. We will be happy to help you at the entrance.<br><br>See you soon!';
    } else if (type === 'multiple') {
      noticeEs = '¡Hola!<br><br>Muchas gracias por registrarte. Hemos visto que tienes varias entradas a tu nombre, ¡qué alegría! Para agilizar el acceso a las oficinas, te pedimos por favor que identifiques a tus acompañantes en Eventbrite.<br><br>Si no es posible, recordad que es <strong>obligatorio que todas traigáis vuestro DNI/NIE físico</strong> el día del evento para que el registro sea fluido y podáis entrar.<br><br>¡Gracias!';
      noticeEn = 'Hi!<br><br>Thank you so much for registering. We noticed you have several tickets under your name, how exciting! To speed up access to the offices, we kindly ask you to identify your guests on Eventbrite.<br><br>If that’s not possible, remember it is <strong>mandatory for everyone to bring their physical ID (DNI/NIE)</strong> on the day of the event to ensure smooth registration and entry.<br><br>Thanks!';
    } else if (type === 'both') {
      noticeEs = '¡Hola!<br><br>Muchas gracias por tu interés en nuestro evento. Hemos detectado que <strong>tu registro está incompleto</strong> y que además tienes <strong>varias entradas a tu nombre</strong>.<br><br>Para garantizar un acceso fluido a las oficinas de InfoJobs, te pedimos por favor que completes tus datos y que identifiques a tus acompañantes a través de Eventbrite.<br><br>Si no fuera posible hacerlo antes del evento, recordad que es <strong>imprescindible que todas traigáis vuestro DNI/NIE físico</strong> para poder entrar. ¡Nos vemos muy pronto!';
      noticeEn = 'Hi!<br><br>Thank you so much for your interest in our event. We have noticed that <strong>your registration is incomplete</strong> and that you also have <strong>multiple tickets under your name</strong>.<br><br>To ensure everyone can enter the InfoJobs offices smoothly, we kindly ask you to complete your details and identify your guests on Eventbrite.<br><br>If that’s not possible before the event, please remember it is <strong>mandatory for everyone to bring their physical ID (DNI)</strong> to be allowed entry. See you very soon!';
    }

    const htmlContent = CORPORATE_TEMPLATE
      .replace('{{NOTICE_ES}}', noticeEs)
      .replace('{{NOTICE_EN}}', noticeEn)
      .replace('{{LOGO_SRC}}', 'cid:logo-femcoders.jpg');

    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    let subject = 'FemCoders: Registro incompleto';
    if (type === 'multiple') subject = 'FemCoders: Información sobre tus entradas';
    if (type === 'both') subject = 'FemCoders: Información importante sobre tu registro';
    
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = htmlContent;
    sendSmtpEmail.sender = { name: "FemCoders Club", email: "info@femcodersclub.com" };
    sendSmtpEmail.to = [{ email: testEmail }];

    // Adjuntar logo local como CID
    try {
      const logoPath = path.join(__dirname, '../../../web/public/logo/logo-femcoders.jpg');
      if (fs.existsSync(logoPath)) {
        const logoBase64 = fs.readFileSync(logoPath).toString('base64');
        sendSmtpEmail.attachment = [{
          content: logoBase64,
          name: 'logo-femcoders.jpg'
        }];
      }
    } catch (err) {
      // Error silencioso al adjuntar
    }

    await apiInstance.sendTransacEmail(sendSmtpEmail);
    return res.json({ success: true, message: `Email de prueba (${type}) enviado a ${testEmail}` });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Error al enviar el email' });
  }
};

export const exportBrevoData = async (req: Request, res: Response) => {
  return res.status(501).json({ error: 'Deshabilitado' });
};

export const getTemplatePreview = async (req: Request, res: Response) => {
  const { type } = req.query;
  
  let noticeEs = '¡Hola!<br><br>Desde FemCoders Club te agradecemos muchísimo tu interés en nuestro evento. Hemos revisado los datos y parece que tu registro está incompleto.<br><br>No te preocupes, puedes completarlo fácilmente a través de tu cuenta de Eventbrite. Si lo prefieres o no puedes hacerlo ahora, es <strong>imprescindible que traigas tu DNI/NIE físico</strong> el día del evento para poder acceder a las oficinas de InfoJobs. Te ayudaremos encantadas en la entrada.<br><br>¡Nos vemos pronto!';
  let noticeEn = 'Hi!<br><br>From FemCoders Club, we thank you so much for your interest in our event. We have reviewed the details and it seems your registration is incomplete.<br><br>Don’t worry, you can easily complete it through your Eventbrite account. If you prefer, please make sure to <strong>bring your physical ID (DNI/NIE)</strong> on the day of the event to access the InfoJobs offices. We will be happy to help you at the entrance.<br><br>See you soon!';
  
  if (type === 'multiple') {
    noticeEs = '¡Hola!<br><br>Muchas gracias por registrarte. Hemos visto que tienes varias entradas a tu nombre, ¡qué alegría! Para agilizar el acceso a las oficinas, te pedimos por favor que identifiques a tus acompañantes en Eventbrite.<br><br>Si no es posible, recordad que es <strong>obligatorio que todas traigáis vuestro DNI/NIE físico</strong> el día del evento para que el registro sea fluido y podáis entrar.<br><br>¡Gracias!';
    noticeEn = 'Hi!<br><br>Thank you so much for registering. We noticed you have several tickets under your name, how exciting! To speed up access to the offices, we kindly ask you to identify your guests on Eventbrite.<br><br>If that’s not possible, remember it is <strong>mandatory for everyone to bring their physical ID (DNI/NIE)</strong> on the day of the event to ensure smooth registration and entry.<br><br>Thanks!';
  }

  const html = CORPORATE_TEMPLATE
    .replace('{{NOTICE_ES}}', noticeEs)
    .replace('{{NOTICE_EN}}', noticeEn)
    .replace('{{LOGO_SRC}}', '/logo/logo-femcoders.jpg');

  res.setHeader('Content-Type', 'text/html');
  return res.send(html);
};
